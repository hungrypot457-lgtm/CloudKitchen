from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from db import db
from models import AssignReq, LocationUpdateReq
from auth import require_permission, require_delivery, get_current_user
from utils import serialize, now_iso, get_settings, customer_status, audit, notify

router = APIRouter(prefix="/api", tags=["delivery"])


def _oid(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


# ---------- ADMIN: ASSIGN DELIVERY ----------
@router.post("/admin/deliveries/assign")
async def assign_delivery(body: AssignReq, user=Depends(require_permission("manage_deliveries"))):
    order = await db.orders.find_one({"_id": _oid(body.order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    partner = await db.users.find_one({"_id": _oid(body.delivery_partner_id), "role": "delivery_partner"})
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")
    if order["internal_status"] not in ("READY_FOR_PICKUP", "PREPARING", "CONFIRMED", "ASSIGNED"):
        raise HTTPException(status_code=400, detail="Order is not ready for assignment.")
    await db.delivery_assignments.delete_many({"order_id": body.order_id})
    assignment = {
        "order_id": body.order_id,
        "order_number": order["order_number"],
        "delivery_partner_id": body.delivery_partner_id,
        "status": "assigned",
        "assigned_at": now_iso(),
        "accepted_at": None, "pickup_at": None, "start_at": None, "delivered_at": None,
    }
    res = await db.delivery_assignments.insert_one(assignment)
    await db.orders.update_one({"_id": _oid(body.order_id)},
                               {"$set": {"delivery_partner_id": body.delivery_partner_id,
                                         "internal_status": "ASSIGNED", "updated_at": now_iso()}})
    await db.order_status_history.insert_one({
        "order_id": body.order_id, "previous_status": order["internal_status"], "new_status": "ASSIGNED",
        "actor_id": user["id"], "actor_name": user["name"], "timestamp": now_iso(),
    })
    await audit(user, "delivery_assigned", "order", body.order_id, {"partner": partner["name"]})
    await notify(user_id=body.delivery_partner_id, title="New Delivery Assigned",
                 body=f"Order {order['order_number']} assigned to you.", ntype="delivery")
    assignment["id"] = str(res.inserted_id)
    return serialize(assignment)


# ---------- DELIVERY PARTNER APP ----------
@router.get("/delivery/assignments")
async def my_assignments(user=Depends(require_delivery)):
    assigns = await db.delivery_assignments.find(
        {"delivery_partner_id": user["id"]}).sort("assigned_at", -1).to_list(200)
    out = []
    for a in assigns:
        order = await db.orders.find_one({"_id": ObjectId(a["order_id"])})
        item = serialize(a)
        if order:
            item["order"] = {
                "order_number": order["order_number"],
                "customer_name": order["customer_name"],
                "customer_phone": order.get("customer_phone", ""),
                "total": order["total"],
                "items": order["items"],
                "delivery_latitude": order["delivery_latitude"],
                "delivery_longitude": order["delivery_longitude"],
                "delivery_note": order.get("delivery_note", ""),
                "internal_status": order["internal_status"],
                "payment_method": order["payment_method"],
            }
        out.append(item)
    return out


async def _get_active_assignment(order_id, user):
    a = await db.delivery_assignments.find_one({"order_id": order_id, "delivery_partner_id": user["id"]})
    if not a:
        raise HTTPException(status_code=403, detail="This delivery is not assigned to you.")
    return a


@router.post("/delivery/{order_id}/accept")
async def accept_delivery(order_id: str, user=Depends(require_delivery)):
    a = await _get_active_assignment(order_id, user)
    await db.delivery_assignments.update_one({"_id": a["_id"]},
                                             {"$set": {"status": "accepted", "accepted_at": now_iso()}})
    await _advance_order(order_id, "ACCEPTED", user)
    await notify(role_target="staff", title="Delivery Accepted",
                 body=f"Order {a.get('order_number')} accepted by {user['name']}", ntype="delivery")
    return {"message": "Accepted"}


@router.post("/delivery/{order_id}/reject")
async def reject_delivery(order_id: str, user=Depends(require_delivery)):
    a = await _get_active_assignment(order_id, user)
    await db.delivery_assignments.update_one({"_id": a["_id"]}, {"$set": {"status": "rejected"}})
    await db.orders.update_one({"_id": ObjectId(order_id)},
                               {"$set": {"delivery_partner_id": None, "internal_status": "READY_FOR_PICKUP",
                                         "updated_at": now_iso()}})
    await notify(role_target="staff", title="Delivery Rejected",
                 body=f"Order {a.get('order_number')} rejected by {user['name']}", ntype="delivery")
    return {"message": "Rejected"}


@router.post("/delivery/{order_id}/pickup")
async def pickup(order_id: str, user=Depends(require_delivery)):
    a = await _get_active_assignment(order_id, user)
    await db.delivery_assignments.update_one({"_id": a["_id"]},
                                             {"$set": {"status": "picked_up", "pickup_at": now_iso()}})
    return {"message": "Picked up"}


@router.post("/delivery/{order_id}/start")
async def start_delivery(order_id: str, body: LocationUpdateReq, user=Depends(require_delivery)):
    a = await _get_active_assignment(order_id, user)
    await db.delivery_assignments.update_one({"_id": a["_id"]},
                                             {"$set": {"status": "out_for_delivery", "start_at": now_iso()}})
    await db.delivery_locations.update_one(
        {"order_id": order_id},
        {"$set": {"order_id": order_id, "delivery_partner_id": user["id"],
                  "latitude": body.latitude, "longitude": body.longitude, "updated_at": now_iso()}},
        upsert=True)
    await _advance_order(order_id, "OUT_FOR_DELIVERY", user)
    return {"message": "Delivery started"}


@router.post("/delivery/{order_id}/location")
async def update_location(order_id: str, body: LocationUpdateReq, user=Depends(require_delivery)):
    await _get_active_assignment(order_id, user)
    await db.delivery_locations.update_one(
        {"order_id": order_id},
        {"$set": {"latitude": body.latitude, "longitude": body.longitude, "updated_at": now_iso()}},
        upsert=True)
    return {"message": "Location updated"}


@router.post("/delivery/{order_id}/delivered")
async def mark_delivered(order_id: str, user=Depends(require_delivery)):
    a = await _get_active_assignment(order_id, user)
    await db.delivery_assignments.update_one({"_id": a["_id"]},
                                             {"$set": {"status": "delivered", "delivered_at": now_iso()}})
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": {"payment_status": "paid"}})
    await _advance_order(order_id, "DELIVERED", user)
    # stop tracking
    await db.delivery_locations.delete_one({"order_id": order_id})
    return {"message": "Delivered"}


async def _advance_order(order_id, new_status, user):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    prev = order["internal_status"]
    await db.orders.update_one({"_id": ObjectId(order_id)},
                               {"$set": {"internal_status": new_status, "updated_at": now_iso()}})
    await db.order_status_history.insert_one({
        "order_id": order_id, "previous_status": prev, "new_status": new_status,
        "actor_id": user["id"], "actor_name": user["name"], "timestamp": now_iso(),
    })
    await notify(user_id=order["customer_id"], title="Order Update",
                 body=f"Order {order['order_number']}: {customer_status(new_status)}", ntype="order")


# ---------- ADMIN: LIVE TRACKING ----------
@router.get("/admin/live-deliveries")
async def live_deliveries(user=Depends(require_permission("view_deliveries"))):
    orders = await db.orders.find({"internal_status": "OUT_FOR_DELIVERY"}).to_list(100)
    out = []
    for o in orders:
        loc = await db.delivery_locations.find_one({"order_id": str(o["_id"])})
        partner = None
        if o.get("delivery_partner_id"):
            p = await db.users.find_one({"_id": ObjectId(o["delivery_partner_id"])})
            partner = p["name"] if p else None
        out.append({
            "order_id": str(o["_id"]),
            "order_number": o["order_number"],
            "customer_name": o["customer_name"],
            "delivery_latitude": o["delivery_latitude"],
            "delivery_longitude": o["delivery_longitude"],
            "partner_name": partner,
            "partner_location": {"latitude": loc["latitude"], "longitude": loc["longitude"]} if loc else None,
        })
    return out


@router.get("/admin/deliveries")
async def all_deliveries(user=Depends(require_permission("view_deliveries"))):
    assigns = await db.delivery_assignments.find({}).sort("assigned_at", -1).to_list(300)
    out = []
    for a in assigns:
        partner = await db.users.find_one({"_id": ObjectId(a["delivery_partner_id"])}) if a.get("delivery_partner_id") else None
        item = serialize(a)
        item["partner_name"] = partner["name"] if partner else None
        out.append(item)
    return out
