import os
from datetime import datetime, timezone
from db import db
from auth import hash_password
from utils import now_iso

KITCHEN_LAT = float(os.environ.get("KITCHEN_LATITUDE", "19.0760"))
KITCHEN_LON = float(os.environ.get("KITCHEN_LONGITUDE", "72.8777"))

IMG = {
    "biryani": "https://images.unsplash.com/photo-1631515242808-497c3fbd3972?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    "burger": "https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    "pizza": "https://images.unsplash.com/photo-1662186342592-5b1236e95a4e?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
}


async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.orders.create_index("customer_id")
    await db.orders.create_index("internal_status")
    await db.orders.create_index("created_at")
    await db.menu_items.create_index("category_id")
    await db.delivery_assignments.create_index("delivery_partner_id")
    await db.delivery_assignments.create_index("order_id")
    await db.audit_logs.create_index("timestamp")
    await db.password_reset_tokens.create_index("token")


async def remove_demo_accounts():
    # Per spec: no demo Manager/Customer/Delivery accounts must exist.
    await db.users.delete_many({
        "email": {"$in": ["manager@cloudbite.com", "rider@cloudbite.com", "customer@cloudbite.com"]}
    })


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "name": "Super Admin", "email": admin_email,
            "password_hash": hash_password(admin_password), "phone": "0000000000",
            "role": "admin", "status": "active", "profile_photo": "", "created_at": now_iso(),
        })
    else:
        from auth import verify_password
        if not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email},
                                      {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})


async def seed_demo():
    if await db.menu_items.count_documents({}) > 0:
        return

    await db.settings.update_one({"_id": "global"}, {"$set": {
        "business_name": "CloudBite Kitchen",
        "kitchen_latitude": KITCHEN_LAT, "kitchen_longitude": KITCHEN_LON,
        "delivery_radius_km": 5.0, "tax_percent": 0.0,
    }}, upsert=True)

    # Demo business data only — NO demo user accounts are seeded.
    # Categories
    cats = [
        {"name": "Biryani & Rice", "sort_order": 1, "enabled": True},
        {"name": "Burgers", "sort_order": 2, "enabled": True},
        {"name": "Pizza", "sort_order": 3, "enabled": True},
        {"name": "Beverages", "sort_order": 4, "enabled": True},
    ]
    cat_ids = {}
    for c in cats:
        c["created_at"] = now_iso()
        res = await db.menu_categories.insert_one(c)
        cat_ids[c["name"]] = str(res.inserted_id)

    spice_group = {"group_name": "Spice Level", "required": True, "multi": False,
                   "options": [{"name": "Mild", "price_adjust": 0}, {"name": "Medium", "price_adjust": 0},
                               {"name": "Spicy", "price_adjust": 0}]}
    extra_group = {"group_name": "Add-ons", "required": False, "multi": True,
                   "options": [{"name": "Extra Cheese", "price_adjust": 40}, {"name": "Extra Raita", "price_adjust": 20}]}

    items = [
        {"category": "Biryani & Rice", "name": "Chicken Biryani", "description": "Fragrant basmati rice layered with spiced chicken and saffron.",
         "price": 199, "is_veg": False, "image": IMG["biryani"], "featured": True, "available": True,
         "tags": ["bestseller", "spicy"], "customizations": [spice_group, extra_group], "prep_time": 30},
        {"category": "Biryani & Rice", "name": "Veg Dum Biryani", "description": "Slow-cooked biryani with garden vegetables and herbs.",
         "price": 169, "is_veg": True, "image": IMG["biryani"], "featured": False, "available": True,
         "tags": ["veg"], "customizations": [spice_group], "prep_time": 28},
        {"category": "Biryani & Rice", "name": "Mutton Biryani", "description": "Rich Hyderabadi mutton biryani, tender and flavourful.",
         "price": 279, "is_veg": False, "image": IMG["biryani"], "featured": True, "available": False,
         "tags": ["premium"], "customizations": [spice_group], "prep_time": 40},
        {"category": "Burgers", "name": "Classic Chicken Burger", "description": "Crispy chicken patty, lettuce, and house sauce.",
         "price": 149, "is_veg": False, "image": IMG["burger"], "featured": True, "available": True,
         "tags": ["popular"], "customizations": [extra_group], "prep_time": 15},
        {"category": "Burgers", "name": "Veggie Delight Burger", "description": "Grilled veg patty with fresh salad and cheese.",
         "price": 129, "is_veg": True, "image": IMG["burger"], "featured": False, "available": True,
         "tags": ["veg"], "customizations": [extra_group], "prep_time": 15},
        {"category": "Pizza", "name": "Margherita Pizza", "description": "Woodfired classic with mozzarella and basil.",
         "price": 199, "is_veg": True, "image": IMG["pizza"], "featured": True, "available": True,
         "tags": ["veg", "cheese"], "customizations": [extra_group], "prep_time": 20},
        {"category": "Pizza", "name": "Chicken Pepperoni Pizza", "description": "Loaded pepperoni with extra cheese.",
         "price": 259, "is_veg": False, "image": IMG["pizza"], "featured": False, "available": True,
         "tags": ["nonveg"], "customizations": [extra_group], "prep_time": 22},
        {"category": "Beverages", "name": "Fresh Lime Soda", "description": "Chilled sweet & salt lime soda.",
         "price": 59, "is_veg": True, "image": IMG["pizza"], "featured": False, "available": True,
         "tags": ["drink"], "customizations": [], "prep_time": 5},
        {"category": "Beverages", "name": "Cold Coffee", "description": "Creamy blended cold coffee.",
         "price": 89, "is_veg": True, "image": IMG["pizza"], "featured": False, "available": False,
         "tags": ["drink"], "customizations": [], "prep_time": 6},
    ]
    for idx, it in enumerate(items):
        doc = {
            "category_id": cat_ids[it["category"]], "name": it["name"], "description": it["description"],
            "price": float(it["price"]), "discount": 0.0, "tax_percent": 0.0, "image": it["image"],
            "is_veg": it["is_veg"], "prep_time": it["prep_time"], "available": it["available"],
            "featured": it["featured"], "sort_order": idx, "tags": it["tags"],
            "customizations": it["customizations"], "created_at": now_iso(),
        }
        await db.menu_items.insert_one(doc)


async def run_seed():
    await create_indexes()
    await remove_demo_accounts()
    await seed_admin()
    await seed_demo()
