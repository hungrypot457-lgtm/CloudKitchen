from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from db import db
from models import ManagerReq, ManagerUpdateReq, DeliveryPartnerReq, DeliveryPartnerUpdateReq
from auth import (require_admin, require_permission, hash_password, MANAGER_PERMISSIONS)
from utils import serialize, now_iso, audit, safe_regex

router = APIRouter(prefix="/api/admin", tags=["users"])


def _oid(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


@router.get("/permissions/available")
async def available_permissions(user=Depends(require_admin)):
    return MANAGER_PERMISSIONS


# ---------- CUSTOMERS ----------
@router.get("/customers")
async def list_customers(q: str | None = None, user=Depends(require_permission("view_customers"))):
    query = {"role": "customer"}
    if q:
        rx = safe_regex(q)
        query["$or"] = [{"name": rx}, {"email": rx}, {"phone": rx}]
    customers = await db.users.find(query).sort("created_at", -1).to_list(500)
    out = []
    for c in customers:
        order_count = await db.orders.count_documents({"customer_id": str(c["_id"])})
        item = serialize(c)
        item["order_count"] = order_count
        out.append(item)
    return out


# ---------- MANAGERS (admin only) ----------
@router.get("/managers")
async def list_managers(user=Depends(require_admin)):
    managers = await db.users.find({"role": "manager"}).sort("created_at", -1).to_list(200)
    return [serialize(m) for m in managers]


@router.post("/managers")
async def create_manager(body: ManagerReq, user=Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    perms = [p for p in body.permissions if p in MANAGER_PERMISSIONS]
    doc = {
        "name": body.name, "email": email, "phone": body.phone,
        "password_hash": hash_password(body.password), "role": "manager",
        "profile_photo": body.profile_photo, "permissions": perms,
        "status": body.status, "notes": body.notes, "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    await audit(user, "create", "manager", str(res.inserted_id), {"email": email})
    return serialize(doc)


@router.put("/managers/{mid}")
async def update_manager(mid: str, body: ManagerUpdateReq, user=Depends(require_admin)):
    updates = {}
    data = body.model_dump()
    if data.get("password"):
        updates["password_hash"] = hash_password(data["password"])
    for f in ["name", "phone", "profile_photo", "status", "notes"]:
        if data.get(f) is not None:
            updates[f] = data[f]
    if data.get("permissions") is not None:
        updates["permissions"] = [p for p in data["permissions"] if p in MANAGER_PERMISSIONS]
    if updates:
        await db.users.update_one({"_id": _oid(mid), "role": "manager"}, {"$set": updates})
    await audit(user, "update", "manager", mid, {"permissions": updates.get("permissions")})
    return serialize(await db.users.find_one({"_id": _oid(mid)}))


@router.delete("/managers/{mid}")
async def delete_manager(mid: str, user=Depends(require_admin)):
    await db.users.delete_one({"_id": _oid(mid), "role": "manager"})
    await audit(user, "delete", "manager", mid)
    return {"message": "Deleted"}


# ---------- DELIVERY PARTNERS (admin only) ----------
@router.get("/delivery-partners")
async def list_partners(user=Depends(require_permission("view_deliveries"))):
    partners = await db.users.find({"role": "delivery_partner"}).sort("created_at", -1).to_list(200)
    out = []
    for p in partners:
        active = await db.delivery_assignments.count_documents(
            {"delivery_partner_id": str(p["_id"]),
             "status": {"$in": ["assigned", "accepted", "picked_up", "out_for_delivery"]}})
        item = serialize(p)
        item["active_deliveries"] = active
        out.append(item)
    return out


@router.post("/delivery-partners")
async def create_partner(body: DeliveryPartnerReq, user=Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    doc = {
        "name": body.name, "email": email, "phone": body.phone,
        "password_hash": hash_password(body.password), "role": "delivery_partner",
        "profile_photo": body.profile_photo, "vehicle_type": body.vehicle_type,
        "vehicle_number": body.vehicle_number, "emergency_contact": body.emergency_contact,
        "joining_date": body.joining_date, "notes": body.notes, "status": body.status,
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    await audit(user, "create", "delivery_partner", str(res.inserted_id), {"email": email})
    return serialize(doc)


@router.put("/delivery-partners/{pid}")
async def update_partner(pid: str, body: DeliveryPartnerUpdateReq, user=Depends(require_admin)):
    updates = {}
    data = body.model_dump()
    if data.get("password"):
        updates["password_hash"] = hash_password(data["password"])
    for f in ["name", "phone", "profile_photo", "vehicle_type", "vehicle_number",
              "emergency_contact", "joining_date", "notes", "status"]:
        if data.get(f) is not None:
            updates[f] = data[f]
    if updates:
        await db.users.update_one({"_id": _oid(pid), "role": "delivery_partner"}, {"$set": updates})
    await audit(user, "update", "delivery_partner", pid)
    return serialize(await db.users.find_one({"_id": _oid(pid)}))


@router.delete("/delivery-partners/{pid}")
async def delete_partner(pid: str, user=Depends(require_admin)):
    await db.users.delete_one({"_id": _oid(pid), "role": "delivery_partner"})
    await audit(user, "delete", "delivery_partner", pid)
    return {"message": "Deleted"}
