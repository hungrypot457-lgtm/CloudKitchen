from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
from db import db
from models import RegisterReq, LoginReq, ProfileReq
from auth import hash_password, verify_password, create_access_token, get_current_user
from utils import serialize, now_iso, audit
from bson import ObjectId

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


async def _check_lock(identifier):
    rec = await db.login_attempts.find_one({"_id": identifier})
    if rec and rec.get("count", 0) >= MAX_ATTEMPTS:
        locked_until = rec.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again later.")


async def _record_fail(identifier):
    rec = await db.login_attempts.find_one({"_id": identifier})
    count = (rec.get("count", 0) if rec else 0) + 1
    update = {"count": count}
    if count >= MAX_ATTEMPTS:
        update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=LOCK_MINUTES)).isoformat()
    await db.login_attempts.update_one({"_id": identifier}, {"$set": update}, upsert=True)


async def _clear_fail(identifier):
    await db.login_attempts.delete_one({"_id": identifier})


@router.post("/register")
async def register(body: RegisterReq):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    doc = {
        "name": body.name,
        "email": email,
        "phone": body.phone,
        "password_hash": hash_password(body.password),
        "role": "customer",
        "status": "active",
        "profile_photo": "",
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, "customer")
    doc["id"] = uid
    return {"token": token, "user": serialize(doc)}


@router.post("/login")
async def login(body: LoginReq, request: Request):
    email = body.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    await _check_lock(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        await _record_fail(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Your account is inactive. Contact the administrator.")
    await _clear_fail(identifier)
    uid = str(user["_id"])
    token = create_access_token(uid, user["role"])
    return {"token": token, "user": serialize(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": user}


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"message": "Logged out"}


@router.put("/profile")
async def update_profile(body: ProfileReq, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": updates})
    fresh = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {"user": serialize(fresh)}
