from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
import os
import secrets
import hashlib
import logging
import httpx
from db import db
from models import (RegisterReq, LoginReq, ProfileReq, ChangePasswordReq,
                    ForgotPasswordReq, ResetPasswordReq)
from auth import hash_password, verify_password, create_access_token, get_current_user
from utils import serialize, now_iso, audit
from bson import ObjectId

logger = logging.getLogger("cloudbite.auth")
router = APIRouter(prefix="/api/auth", tags=["auth"])

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

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


async def _social_login(email, name, picture, provider):
    """Find or create a customer from a verified social identity, return {token, user}."""
    email = (email or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Sign-in failed. Please try again.")
    user = await db.users.find_one({"email": email})
    if not user:
        doc = {
            "name": name or email.split("@")[0], "email": email, "phone": "",
            "password_hash": "", "role": "customer", "status": "active",
            "profile_photo": picture or "", "auth_provider": provider, "created_at": now_iso(),
        }
        res = await db.users.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        return {"token": create_access_token(doc["id"], "customer"), "user": serialize(doc)}
    uid = str(user["_id"])
    if not user.get("profile_photo") and picture:
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"profile_photo": picture}})
    return {"token": create_access_token(uid, user["role"]), "user": serialize(user)}


@router.post("/google")
async def google_auth(request: Request):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing Google session.")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    except Exception:
        raise HTTPException(status_code=502, detail="Google sign-in is unavailable. Please try again.")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")
    data = resp.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")
    user = await db.users.find_one({"email": email})
    if not user:
        doc = {
            "name": data.get("name") or email.split("@")[0],
            "email": email,
            "phone": "",
            "password_hash": "",
            "role": "customer",
            "status": "active",
            "profile_photo": data.get("picture", ""),
            "auth_provider": "google",
            "created_at": now_iso(),
        }
        res = await db.users.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        user = doc
        uid = doc["id"]
        role = "customer"
    else:
        uid = str(user["_id"])
        role = user["role"]
        if not user.get("profile_photo") and data.get("picture"):
            await db.users.update_one({"_id": user["_id"]}, {"$set": {"profile_photo": data["picture"]}})
    token = create_access_token(uid, role)
    return {"token": token, "user": serialize(user)}


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


@router.post("/change-password")
async def change_password(body: ChangePasswordReq, user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if doc.get("password_hash") and not verify_password(body.old_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    await db.users.update_one({"_id": doc["_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await audit(user, "password_change", "user", user["id"])
    return {"message": "Password changed successfully."}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordReq):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if user:
        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        await db.password_reset_tokens.insert_one({
            "token_hash": token_hash, "user_id": str(user["_id"]), "email": email,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False, "created_at": now_iso(),
        })
        # SECURITY: never log the raw token. It must be delivered out-of-band (email).
        logger.info(f"[password-reset] reset requested for {email}")
    return {"message": "If an account exists for that email, a password reset link has been generated."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordReq):
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    rec = await db.password_reset_tokens.find_one({"token_hash": token_hash})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has already been used.")
    exp = rec["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This reset link has expired.")
    await db.users.update_one({"_id": ObjectId(rec["user_id"])},
                              {"$set": {"password_hash": hash_password(body.new_password)}})
    await db.password_reset_tokens.update_one({"_id": rec["_id"]}, {"$set": {"used": True}})
    return {"message": "Password reset successful. Please log in."}
