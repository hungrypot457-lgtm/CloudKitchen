from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from db import db
from models import CategoryReq, MenuItemReq, AvailabilityReq
from auth import require_permission, get_current_user
from utils import serialize, now_iso, audit

router = APIRouter(prefix="/api", tags=["menu"])


def _oid(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


# ---------- PUBLIC / CUSTOMER READS ----------
@router.get("/categories")
async def list_categories(all: bool = False):
    q = {} if all else {"enabled": True}
    cats = await db.menu_categories.find(q).sort("sort_order", 1).to_list(500)
    return [serialize(c) for c in cats]


@router.get("/menu")
async def list_menu(category_id: str | None = None, search: str | None = None,
                    featured: bool | None = None):
    q = {}
    if category_id:
        q["category_id"] = category_id
    if featured is not None:
        q["featured"] = featured
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]
    # NOTE: unavailable items remain visible; we never filter them out.
    items = await db.menu_items.find(q).sort([("featured", -1), ("sort_order", 1)]).to_list(1000)
    return [serialize(i) for i in items]


@router.get("/menu/{item_id}")
async def get_menu_item(item_id: str):
    item = await db.menu_items.find_one({"_id": _oid(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize(item)


# ---------- CATEGORY MANAGEMENT ----------
@router.post("/categories")
async def create_category(body: CategoryReq, user=Depends(require_permission("manage_menu"))):
    doc = body.model_dump()
    doc["created_at"] = now_iso()
    res = await db.menu_categories.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    await audit(user, "create", "category", str(res.inserted_id), {"name": body.name})
    return serialize(doc)


@router.put("/categories/{cat_id}")
async def update_category(cat_id: str, body: CategoryReq, user=Depends(require_permission("manage_menu"))):
    await db.menu_categories.update_one({"_id": _oid(cat_id)}, {"$set": body.model_dump()})
    await audit(user, "update", "category", cat_id, {"name": body.name})
    return serialize(await db.menu_categories.find_one({"_id": _oid(cat_id)}))


@router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user=Depends(require_permission("manage_menu"))):
    count = await db.menu_items.count_documents({"category_id": cat_id})
    if count:
        raise HTTPException(status_code=400, detail="Cannot delete a category that has menu items.")
    await db.menu_categories.delete_one({"_id": _oid(cat_id)})
    await audit(user, "delete", "category", cat_id)
    return {"message": "Deleted"}


# ---------- MENU ITEM MANAGEMENT ----------
@router.post("/menu")
async def create_item(body: MenuItemReq, user=Depends(require_permission("manage_menu"))):
    doc = body.model_dump()
    doc["created_at"] = now_iso()
    res = await db.menu_items.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    await audit(user, "create", "menu_item", str(res.inserted_id), {"name": body.name})
    return serialize(doc)


@router.put("/menu/{item_id}")
async def update_item(item_id: str, body: MenuItemReq, user=Depends(require_permission("manage_menu"))):
    await db.menu_items.update_one({"_id": _oid(item_id)}, {"$set": body.model_dump()})
    await audit(user, "update", "menu_item", item_id, {"name": body.name})
    return serialize(await db.menu_items.find_one({"_id": _oid(item_id)}))


@router.patch("/menu/{item_id}/availability")
async def set_availability(item_id: str, body: AvailabilityReq,
                           user=Depends(require_permission("manage_availability"))):
    item = await db.menu_items.find_one({"_id": _oid(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.menu_items.update_one({"_id": _oid(item_id)}, {"$set": {"available": body.available}})
    await audit(user, "availability_change", "menu_item", item_id,
                {"name": item.get("name"), "available": body.available})
    return serialize(await db.menu_items.find_one({"_id": _oid(item_id)}))


@router.delete("/menu/{item_id}")
async def delete_item(item_id: str, user=Depends(require_permission("manage_menu"))):
    await db.menu_items.delete_one({"_id": _oid(item_id)})
    await audit(user, "delete", "menu_item", item_id)
    return {"message": "Deleted"}
