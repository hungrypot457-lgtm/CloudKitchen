from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from db import db
from models import SettingsReq
from auth import require_admin, require_permission, get_current_user
from utils import serialize, get_settings, now_iso, audit

router = APIRouter(prefix="/api", tags=["misc"])


# ---------- SETTINGS ----------
@router.get("/settings")
async def read_settings(user=Depends(get_current_user)):
    s = await get_settings()
    # public-safe subset for non-admin
    data = {
        "business_name": s["business_name"],
        "kitchen_latitude": s["kitchen_latitude"],
        "kitchen_longitude": s["kitchen_longitude"],
        "delivery_radius_km": s["delivery_radius_km"],
        "tax_percent": s.get("tax_percent", 0),
    }
    return data


@router.put("/admin/settings")
async def update_settings(body: SettingsReq, user=Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "delivery_radius_km" in updates and updates["delivery_radius_km"] <= 0:
        raise HTTPException(status_code=400, detail="Delivery radius must be greater than 0.")
    if updates:
        await db.settings.update_one({"_id": "global"}, {"$set": updates}, upsert=True)
        await audit(user, "settings_change", "settings", "global", updates)
    return await read_settings(user)


# ---------- NOTIFICATIONS ----------
@router.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if user["role"] in ("admin", "manager"):
        query = {"$or": [{"user_id": user["id"]}, {"role_target": "staff"}]}
    notes = await db.notifications.find(query).sort("created_at", -1).limit(50).to_list(50)
    unread = await db.notifications.count_documents({**query, "read": False})
    return {"notifications": [serialize(n) for n in notes], "unread": unread}


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    try:
        oid = ObjectId(nid)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    owner = ({"$or": [{"user_id": user["id"]}, {"role_target": "staff"}]}
             if user["role"] in ("admin", "manager") else {"user_id": user["id"]})
    await db.notifications.update_one({"_id": oid, **owner}, {"$set": {"read": True}})
    return {"message": "ok"}


@router.post("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if user["role"] in ("admin", "manager"):
        query = {"$or": [{"user_id": user["id"]}, {"role_target": "staff"}]}
    await db.notifications.update_many(query, {"$set": {"read": True}})
    return {"message": "ok"}


# ---------- DASHBOARD ----------
@router.get("/admin/dashboard")
async def dashboard(user=Depends(require_permission("view_dashboard"))):
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date().isoformat()

    async def count(q):
        return await db.orders.count_documents(q)

    statuses = ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "ASSIGNED",
                "ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]
    by_status = {}
    for s in statuses:
        by_status[s] = await count({"internal_status": s})

    today_orders = await db.orders.find({"created_at": {"$gte": today}}).to_list(1000)
    revenue = sum(o["total"] for o in await db.orders.find({"internal_status": "DELIVERED"}).to_list(5000))

    result = {
        "today_orders": len(today_orders),
        "pending": by_status["PENDING"] + by_status["CONFIRMED"],
        "preparing": by_status["PREPARING"] + by_status["READY_FOR_PICKUP"],
        "out_for_delivery": by_status["OUT_FOR_DELIVERY"],
        "delivered": by_status["DELIVERED"],
        "cancelled": by_status["CANCELLED"],
        "active_deliveries": by_status["OUT_FOR_DELIVERY"] + by_status["ASSIGNED"] + by_status["ACCEPTED"],
        "total_revenue": round(revenue, 2),
        "by_status": by_status,
    }
    if user["role"] == "admin":
        result["total_customers"] = await db.users.count_documents({"role": "customer"})
        result["total_partners"] = await db.users.count_documents({"role": "delivery_partner"})
        result["available_items"] = await db.menu_items.count_documents({"available": True})
        result["unavailable_items"] = await db.menu_items.count_documents({"available": False})
    return result


# ---------- REPORTS ----------
@router.get("/admin/reports")
async def reports(user=Depends(require_permission("view_reports"))):
    orders = await db.orders.find({}).to_list(5000)
    # orders by day (last 7)
    from collections import Counter, defaultdict
    by_day = defaultdict(lambda: {"orders": 0, "revenue": 0.0})
    by_status = Counter()
    item_counter = Counter()
    for o in orders:
        day = o["created_at"][:10]
        by_day[day]["orders"] += 1
        if o["internal_status"] == "DELIVERED":
            by_day[day]["revenue"] += o["total"]
        by_status[o["internal_status"]] += 1
        for it in o["items"]:
            item_counter[it["name"]] += it["quantity"]
    days = sorted(by_day.keys())[-7:]
    orders_by_day = [{"day": d, "orders": by_day[d]["orders"], "revenue": round(by_day[d]["revenue"], 2)} for d in days]
    popular = [{"name": n, "qty": q} for n, q in item_counter.most_common(8)]
    delivered = [o for o in orders if o["internal_status"] == "DELIVERED"]
    result = {
        "orders_by_day": orders_by_day,
        "orders_by_status": [{"status": s, "count": c} for s, c in by_status.items()],
        "popular_items": popular,
        "total_orders": len(orders),
        "total_delivered": len(delivered),
    }
    # financial info admin-only
    if user["role"] == "admin":
        result["total_sales"] = round(sum(o["total"] for o in delivered), 2)
        result["avg_order_value"] = round(
            sum(o["total"] for o in delivered) / len(delivered), 2) if delivered else 0
    return result


# ---------- AUDIT LOGS (admin only) ----------
@router.get("/admin/audit-logs")
async def audit_logs(skip: int = 0, limit: int = 50, user=Depends(require_admin)):
    total = await db.audit_logs.count_documents({})
    logs = await db.audit_logs.find({}).sort("timestamp", -1).skip(skip).limit(min(limit, 100)).to_list(100)
    return {"total": total, "logs": [serialize(l) for l in logs]}
