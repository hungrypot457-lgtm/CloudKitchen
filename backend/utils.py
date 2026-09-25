import math
import os
from datetime import datetime, timezone
from db import db

# ---- Serialization ----

def serialize(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---- Geo ----

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---- Order status mapping ----

INTERNAL_STATUSES = [
    "PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "ASSIGNED",
    "ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REJECTED",
]

_PREPARING_SET = {"PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "ASSIGNED", "ACCEPTED"}


def customer_status(internal):
    if internal in _PREPARING_SET:
        return "ORDER BEING PREPARED"
    if internal == "OUT_FOR_DELIVERY":
        return "ORDER ON THE WAY"
    if internal == "DELIVERED":
        return "ORDER ARRIVED"
    if internal in ("CANCELLED", "REJECTED"):
        return "ORDER CANCELLED"
    return "ORDER BEING PREPARED"


# ---- Settings ----

async def get_settings():
    s = await db.settings.find_one({"_id": "global"})
    if not s:
        s = {
            "_id": "global",
            "business_name": "CloudBite Kitchen",
            "kitchen_latitude": float(os.environ.get("KITCHEN_LATITUDE", "19.0760")),
            "kitchen_longitude": float(os.environ.get("KITCHEN_LONGITUDE", "72.8777")),
            "delivery_radius_km": float(os.environ.get("DELIVERY_RADIUS_KM", "5")),
            "tax_percent": 0.0,
        }
        await db.settings.insert_one(s)
    return s


# ---- Counters (order numbers) ----

async def next_sequence(name):
    res = await db.counters.find_one_and_update(
        {"_id": name}, {"$inc": {"seq": 1}}, upsert=True, return_document=True
    )
    return res["seq"]


# ---- Audit + Notifications ----

async def audit(actor, action, entity, entity_id=None, metadata=None):
    await db.audit_logs.insert_one({
        "actor_id": actor.get("id") if actor else None,
        "actor_name": actor.get("name") if actor else "system",
        "actor_role": actor.get("role") if actor else "system",
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "metadata": metadata or {},
        "timestamp": now_iso(),
    })


async def notify(user_id=None, role_target=None, title="", body="", ntype="info"):
    await db.notifications.insert_one({
        "user_id": user_id,
        "role_target": role_target,
        "title": title,
        "body": body,
        "type": ntype,
        "read": False,
        "created_at": now_iso(),
    })
