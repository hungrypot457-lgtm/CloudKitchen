from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from db import db
from models import CartItemReq, CartQtyReq
from auth import require_customer
from utils import serialize

router = APIRouter(prefix="/api/cart", tags=["cart"])


def _oid(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


async def _get_cart(customer_id):
    cart = await db.carts.find_one({"customer_id": customer_id})
    if not cart:
        cart = {"customer_id": customer_id, "items": []}
        await db.carts.insert_one(cart)
        cart = await db.carts.find_one({"customer_id": customer_id})
    return cart


def _price_customizations(item, selected):
    """Validate selected customizations against item definition; return list + total adjust."""
    groups = {g["group_name"]: g for g in item.get("customizations", [])}
    result = []
    adjust = 0.0
    for sel in selected:
        g = groups.get(sel["group_name"])
        if not g:
            raise HTTPException(status_code=400, detail="Invalid customization group.")
        opt = next((o for o in g["options"] if o["name"] == sel["option_name"]), None)
        if not opt:
            raise HTTPException(status_code=400, detail="Invalid customization option.")
        adjust += float(opt.get("price_adjust", 0))
        result.append({"group_name": sel["group_name"], "option_name": sel["option_name"],
                       "price_adjust": float(opt.get("price_adjust", 0))})
    return result, adjust


async def _rebuild(cart):
    """Recompute prices & availability snapshot for the cart response."""
    items = []
    subtotal = 0.0
    for line in cart.get("items", []):
        item = await db.menu_items.find_one({"_id": ObjectId(line["menu_item_id"])})
        if not item:
            continue
        unit = float(item["price"]) - float(item.get("discount", 0)) + line.get("customization_adjust", 0)
        line_total = unit * line["quantity"]
        subtotal += line_total
        items.append({
            **line,
            "name": item["name"],
            "image": item.get("image", ""),
            "is_veg": item.get("is_veg", True),
            "available": item.get("available", True),
            "unit_price": unit,
            "line_total": line_total,
        })
    return {"id": str(cart["_id"]), "customer_id": cart["customer_id"], "items": items, "subtotal": subtotal}


@router.get("")
async def get_cart(user=Depends(require_customer)):
    cart = await _get_cart(user["id"])
    return await _rebuild(cart)


@router.post("/items")
async def add_item(body: CartItemReq, user=Depends(require_customer)):
    item = await db.menu_items.find_one({"_id": _oid(body.menu_item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not item.get("available", True):
        raise HTTPException(status_code=400, detail="This item is currently unavailable.")
    customs, adjust = _price_customizations(item, [c.model_dump() for c in body.customizations])
    cart = await _get_cart(user["id"])
    # merge if same item + same customizations
    key = body.menu_item_id + "|" + ",".join(sorted(c["group_name"] + ":" + c["option_name"] for c in customs))
    found = False
    for line in cart["items"]:
        lkey = line["menu_item_id"] + "|" + ",".join(
            sorted(c["group_name"] + ":" + c["option_name"] for c in line.get("customizations", [])))
        if lkey == key:
            line["quantity"] = min(line["quantity"] + body.quantity, 50)
            found = True
            break
    if not found:
        cart["items"].append({
            "line_id": str(ObjectId()),
            "menu_item_id": body.menu_item_id,
            "quantity": body.quantity,
            "customizations": customs,
            "customization_adjust": adjust,
        })
    await db.carts.update_one({"_id": cart["_id"]}, {"$set": {"items": cart["items"]}})
    return await _rebuild(await db.carts.find_one({"_id": cart["_id"]}))


@router.patch("/items/{line_id}")
async def update_qty(line_id: str, body: CartQtyReq, user=Depends(require_customer)):
    cart = await _get_cart(user["id"])
    if body.quantity == 0:
        cart["items"] = [l for l in cart["items"] if l["line_id"] != line_id]
    else:
        for line in cart["items"]:
            if line["line_id"] == line_id:
                line["quantity"] = body.quantity
    await db.carts.update_one({"_id": cart["_id"]}, {"$set": {"items": cart["items"]}})
    return await _rebuild(await db.carts.find_one({"_id": cart["_id"]}))


@router.delete("/items/{line_id}")
async def remove_item(line_id: str, user=Depends(require_customer)):
    cart = await _get_cart(user["id"])
    cart["items"] = [l for l in cart["items"] if l["line_id"] != line_id]
    await db.carts.update_one({"_id": cart["_id"]}, {"$set": {"items": cart["items"]}})
    return await _rebuild(await db.carts.find_one({"_id": cart["_id"]}))


@router.delete("")
async def clear_cart(user=Depends(require_customer)):
    cart = await _get_cart(user["id"])
    await db.carts.update_one({"_id": cart["_id"]}, {"$set": {"items": []}})
    return await _rebuild(await db.carts.find_one({"_id": cart["_id"]}))
