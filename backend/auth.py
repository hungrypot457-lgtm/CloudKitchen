import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import Request, HTTPException, Depends
from db import db

JWT_ALGORITHM = "HS256"
ACCESS_TTL_HOURS = 24

MANAGER_PERMISSIONS = [
    "view_dashboard", "view_orders", "update_orders", "view_customers",
    "manage_menu", "manage_availability", "view_deliveries", "manage_deliveries",
    "view_reports", "view_notifications",
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TTL_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    try:
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Account is inactive.")
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    return user


def require_roles(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action.")
        return user
    return dep


def require_permission(perm: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") == "admin":
            return user
        if user.get("role") == "manager" and perm in (user.get("permissions") or []):
            return user
        raise HTTPException(status_code=403, detail="You do not have permission to perform this action.")
    return dep


# staff = admin or manager
require_staff = require_roles("admin", "manager")
require_admin = require_roles("admin")
require_customer = require_roles("customer")
require_delivery = require_roles("delivery_partner")
