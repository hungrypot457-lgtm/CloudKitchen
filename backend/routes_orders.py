from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from db import db
from models import PlaceOrderReq, StatusUpdateReq, LocationCheckReq
from auth import require_customer, require_permission, get_current_user
from utils import (serialize, now_iso, haversine_km, get_settings, next_sequence,
                   customer_status, audit, notify, INTERNAL_STATUSES, safe_regex)

router = APIRouter(prefix="/api", tags=["orders"])


def _oid(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


ALLOWED_TRANSITIONS = {
    "PENDING": ["CONFIRMED", "CANCELLED", "REJECTED"],
    "CONFIRMED": ["PREPARING", "CANCELLED"],
    "PREPARING": ["READY_FOR_PICKUP", "CANCELLED"],
    "READY_FOR_PICKUP": ["ASSIGNED", "CANCELLED"],
    "ASSIGNED": ["ACCEPTED", "READY_FOR_PICKUP", "CANCELLED"],
    "ACCEPTED": ["OUT_FOR_DELIVERY", "CANCELLED"],
    "OUT_FOR_DELIVERY": ["DELIVERED", "CANCELLED"],
    "DELIVERED": [],
    "CANCELLED": [],
    "REJECTED": [],
}


def _order_public(order):
    o = serialize(order)
    o["customer_stage"] = customer_status(order["internal_status"])
    return o


# ---------- LOCATION CHECK ----------
@router.post("/location/check")
async def check_location(body: LocationCheckReq, user=Depends(require_customer)):
    s = await get_settings()
    dist = haversine_km(s["kitchen_latitude"], s["kitchen_longitude"], body.latitude, body.longitude)
    within = dist <= s["delivery_radius_km"]
    return {
        "within_radius": within,
        "distance_km": round(dist, 2),
        "radius_km": s["delivery_radius_km"],
        "message": "Great! We deliver to your location." if within
        else f"Sorry, we currently deliver within {int(s['delivery_radius_km'])} km of our kitchen.",
    }


# ---------- PLACE ORDER (customer) ----------
@router.post("/orders")
async def place_order(body: PlaceOrderReq, user=Depends(require_customer)):
    s = await get_settings()
    dist = haversine_km(s["kitchen_latitude"], s["kitchen_longitude"],
                        body.delivery_latitude, body.delivery_longitude)
    if dist > s["delivery_radius_km"]:
        raise HTTPException(status_code=400,
                            detail=f"Sorry, we currently deliver within {int(s['delivery_radius_km'])} km of our kitchen.")

    cart = await db.carts.find_one({"customer_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Your cart is empty.")

    # Server-side revalidation of availability + prices
    order_items = []
    subtotal = 0.0
    tax_total = 0.0
    for line in cart["items"]:
        item = await db.menu_items.find_one({"_id": ObjectId(line["menu_item_id"])})
        if not item:
            raise HTTPException(status_code=400, detail="An item in your cart no longer exists.")
        if not item.get("available", True):
            raise HTTPException(status_code=400, detail=f"'{item['name']}' is currently unavailable.")
        unit = float(item["price"]) - float(item.get("discount", 0)) + line.get("customization_adjust", 0)
        line_total = unit * line["quantity"]
        line_tax = line_total * (float(item.get("tax_percent", 0)) / 100.0)
        subtotal += line_total
        tax_total += line_tax
        order_items.append({
            "menu_item_id": line["menu_item_id"],
            "name": item["name"],
            "unit_price": unit,
            "quantity": line["quantity"],
            "customizations": line.get("customizations", []),
            "line_total": line_total,
            "is_veg": item.get("is_veg", True),
        })

    seq = await next_sequence("order")
    order_number = f"CB{1000 + seq}"
    order = {
        "order_number": order_number,
        "customer_id": user["id"],
        "customer_name": user["name"],
        "customer_phone": user.get("phone", ""),
        "items": order_items,
        "subtotal": round(subtotal, 2),
        "tax": round(tax_total, 2),
        "delivery_fee": 0.0,
        "platform_fee": 0.0,
        "convenience_fee": 0.0,
        "total": round(subtotal + tax_total, 2),
        "payment_method": "COD",
        "payment_status": "pending",
        "delivery_latitude": body.delivery_latitude,
        "delivery_longitude": body.delivery_longitude,
        "delivery_note": body.delivery_note or "",
        "internal_status": "PENDING",
        "delivery_partner_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    res = await db.orders.insert_one(order)
    oid = str(res.inserted_id)
    await db.order_status_history.insert_one({
        "order_id": oid, "previous_status": None, "new_status": "PENDING",
        "actor_id": user["id"], "actor_name": user["name"], "timestamp": now_iso(),
    })
    await db.carts.update_one({"_id": cart["_id"]}, {"$set": {"items": []}})
    await notify(role_target="staff", title="New Order", body=f"Order {order_number} placed", ntype="order")
    await notify(user_id=user["id"], title="Order Placed",
                 body=f"Your order {order_number} is being prepared.", ntype="order")
    order["id"] = oid
    return _order_public(order)


# ---------- CUSTOMER ORDER READS ----------
@router.get("/orders/mine")
async def my_orders(user=Depends(require_customer)):
    orders = await db.orders.find({"customer_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [_order_public(o) for o in orders]


@router.get("/orders/{order_id}")
async def get_order(order_id: str, user=Depends(get_current_user)):
    order = await db.orders.find_one({"_id": _oid(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user["role"] == "customer" and order["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if user["role"] == "delivery_partner" and order.get("delivery_partner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    result = _order_public(order)
    history = await db.order_status_history.find({"order_id": order_id}).sort("timestamp", 1).to_list(100)
    result["history"] = [serialize(h) for h in history]
    # attach live location if out for delivery
    if order["internal_status"] == "OUT_FOR_DELIVERY":
        loc = await db.delivery_locations.find_one({"order_id": order_id})
        if loc:
            result["partner_location"] = {"latitude": loc["latitude"], "longitude": loc["longitude"],
                                          "updated_at": loc["updated_at"]}
        if order.get("delivery_partner_id"):
            dp = await db.users.find_one({"_id": ObjectId(order["delivery_partner_id"])})
            if dp:
                result["delivery_partner_name"] = dp["name"]
                result["delivery_partner_phone"] = dp.get("phone", "")
    return result


# ---------- STAFF ORDER MANAGEMENT ----------
@router.get("/admin/orders")
async def list_orders(status: str | None = None, q: str | None = None,
                      skip: int = 0, limit: int = 50,
                      user=Depends(require_permission("view_orders"))):
    if skip < 0 or limit < 0:
        raise HTTPException(status_code=400, detail="Pagination values must be non-negative")
    query = {}
    if status:
        query["internal_status"] = status
    if q:
        rx = safe_regex(q)
        query["$or"] = [
            {"order_number": rx},
            {"customer_name": rx},
        ]
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query).sort("created_at", -1).skip(skip).limit(min(limit, 100)).to_list(100)
    return {"total": total, "orders": [_order_public(o) for o in orders]}


@router.patch("/admin/orders/{order_id}/status")
async def update_status(order_id: str, body: StatusUpdateReq,
                        user=Depends(require_permission("update_orders"))):
    if body.status not in INTERNAL_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    order = await db.orders.find_one({"_id": _oid(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    prev = order["internal_status"]
    if body.status not in ALLOWED_TRANSITIONS.get(prev, []):
        raise HTTPException(status_code=400, detail=f"Cannot change status from {prev} to {body.status}.")
    await db.orders.update_one({"_id": _oid(order_id)},
                               {"$set": {"internal_status": body.status, "updated_at": now_iso()}})
    await db.order_status_history.insert_one({
        "order_id": order_id, "previous_status": prev, "new_status": body.status,
        "actor_id": user["id"], "actor_name": user["name"], "timestamp": now_iso(),
    })
    await audit(user, "order_status_change", "order", order_id, {"from": prev, "to": body.status})
    await notify(user_id=order["customer_id"], title="Order Update",
                 body=f"Order {order['order_number']}: {customer_status(body.status)}", ntype="order")
    return _order_public(await db.orders.find_one({"_id": _oid(order_id)}))
