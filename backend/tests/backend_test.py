"""CloudBite Kitchen backend API tests.

Covers: auth (all roles), RBAC, menu, cart, orders (location check, place,
transitions), delivery lifecycle, admin management, settings, notifications.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

ADMIN = ("hungrypot457@gmail.com", "Admin@12345")
MANAGER = ("manager@cloudbite.com", "Manager@123")
CUSTOMER = ("customer@cloudbite.com", "Customer@123")
RIDER = ("rider@cloudbite.com", "Rider@123")

KITCHEN = (19.0760, 72.8777)
NEAR = (19.08, 72.88)
FAR = (28.6139, 77.2090)


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def admin_token():
    return _login(*ADMIN)


@pytest.fixture(scope="session")
def manager_token():
    return _login(*MANAGER)


@pytest.fixture(scope="session")
def customer_token():
    return _login(*CUSTOMER)


@pytest.fixture(scope="session")
def rider_token():
    return _login(*RIDER)


# ---------------- AUTH ----------------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN[0], "password": ADMIN[1]})
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["role"] == "admin"
        assert d["token"]

    def test_bad_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN[0], "password": "wrongwrong"})
        assert r.status_code == 401

    def test_me(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_customer_signup(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "TEST_signup", "email": email, "phone": "9998887777", "password": "Passw0rd!"
        })
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "customer"


# ---------------- RBAC ----------------
class TestRBAC:
    def test_customer_cannot_access_dashboard(self, customer_token):
        r = requests.get(f"{API}/admin/dashboard", headers=_h(customer_token))
        assert r.status_code == 403

    def test_manager_reports_denied(self, manager_token):
        r = requests.get(f"{API}/admin/reports", headers=_h(manager_token))
        assert r.status_code == 403

    def test_manager_managers_list_denied(self, manager_token):
        r = requests.get(f"{API}/admin/managers", headers=_h(manager_token))
        assert r.status_code == 403

    def test_manager_cannot_create_menu(self, manager_token):
        # find any category id
        cats = requests.get(f"{API}/categories").json()
        cid = cats[0]["id"] if cats else "abc"
        r = requests.post(f"{API}/menu", headers=_h(manager_token), json={
            "category_id": cid, "name": "TEST_x", "price": 10
        })
        assert r.status_code == 403

    def test_manager_view_orders_ok(self, manager_token):
        r = requests.get(f"{API}/admin/orders", headers=_h(manager_token))
        assert r.status_code == 200

    def test_manager_manage_deliveries_ok(self, manager_token):
        r = requests.get(f"{API}/admin/deliveries", headers=_h(manager_token))
        assert r.status_code == 200

    def test_non_admin_cannot_update_settings(self, manager_token):
        r = requests.put(f"{API}/admin/settings", headers=_h(manager_token),
                         json={"delivery_radius_km": 10})
        assert r.status_code == 403


# ---------------- MENU ----------------
class TestMenu:
    def test_categories_public(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_menu_includes_unavailable(self):
        r = requests.get(f"{API}/menu")
        assert r.status_code == 200
        items = r.json()
        names = {i["name"]: i for i in items}
        assert "Mutton Biryani" in names, "Mutton Biryani (unavailable) must remain visible"
        assert names["Mutton Biryani"]["available"] is False
        assert "Cold Coffee" in names
        assert names["Cold Coffee"]["available"] is False

    def test_availability_toggle(self, admin_token):
        items = requests.get(f"{API}/menu").json()
        target = next(i for i in items if i["name"] == "Cold Coffee")
        # toggle on
        r1 = requests.patch(f"{API}/menu/{target['id']}/availability",
                            headers=_h(admin_token), json={"available": True})
        assert r1.status_code == 200 and r1.json()["available"] is True
        # revert to False (keep seed state consistent)
        r2 = requests.patch(f"{API}/menu/{target['id']}/availability",
                            headers=_h(admin_token), json={"available": False})
        assert r2.status_code == 200 and r2.json()["available"] is False

    def test_admin_create_category(self, admin_token):
        name = f"TEST_cat_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/categories", headers=_h(admin_token),
                          json={"name": name, "sort_order": 99, "enabled": True})
        assert r.status_code == 200
        cid = r.json()["id"]
        # cleanup
        requests.delete(f"{API}/categories/{cid}", headers=_h(admin_token))


# ---------------- CART + ORDER + LOCATION ----------------
class TestOrderFlow:
    def test_location_within_radius(self, customer_token):
        r = requests.post(f"{API}/location/check", headers=_h(customer_token),
                          json={"latitude": NEAR[0], "longitude": NEAR[1]})
        assert r.status_code == 200
        d = r.json()
        assert d["within_radius"] is True

    def test_location_outside_radius(self, customer_token):
        r = requests.post(f"{API}/location/check", headers=_h(customer_token),
                          json={"latitude": FAR[0], "longitude": FAR[1]})
        assert r.status_code == 200
        assert r.json()["within_radius"] is False

    def test_cannot_add_unavailable_to_cart(self, customer_token):
        items = requests.get(f"{API}/menu").json()
        mb = next(i for i in items if i["name"] == "Mutton Biryani")
        r = requests.post(f"{API}/cart/items", headers=_h(customer_token),
                          json={"menu_item_id": mb["id"], "quantity": 1, "customizations": [
                              {"group_name": "Spice Level", "option_name": "Mild"}]})
        assert r.status_code == 400

    def test_empty_cart_order_fails(self, customer_token):
        # clear then place
        requests.delete(f"{API}/cart", headers=_h(customer_token))
        r = requests.post(f"{API}/orders", headers=_h(customer_token), json={
            "delivery_latitude": NEAR[0], "delivery_longitude": NEAR[1]})
        assert r.status_code == 400

    def test_order_outside_radius_fails(self, customer_token):
        # add an available item
        items = requests.get(f"{API}/menu").json()
        cb = next(i for i in items if i["name"] == "Classic Chicken Burger")
        requests.delete(f"{API}/cart", headers=_h(customer_token))
        add = requests.post(f"{API}/cart/items", headers=_h(customer_token),
                            json={"menu_item_id": cb["id"], "quantity": 1, "customizations": []})
        assert add.status_code == 200
        r = requests.post(f"{API}/orders", headers=_h(customer_token), json={
            "delivery_latitude": FAR[0], "delivery_longitude": FAR[1]})
        assert r.status_code == 400

    def test_full_delivery_lifecycle(self, customer_token, admin_token, rider_token):
        # Prep cart
        items = requests.get(f"{API}/menu").json()
        cb = next(i for i in items if i["name"] == "Classic Chicken Burger")
        requests.delete(f"{API}/cart", headers=_h(customer_token))
        add = requests.post(f"{API}/cart/items", headers=_h(customer_token),
                            json={"menu_item_id": cb["id"], "quantity": 2, "customizations": []})
        assert add.status_code == 200
        cart = add.json()
        assert cart["subtotal"] == pytest.approx(cb["price"] * 2)

        # update qty
        line_id = cart["items"][0]["line_id"]
        upd = requests.patch(f"{API}/cart/items/{line_id}",
                             headers=_h(customer_token), json={"quantity": 1})
        assert upd.status_code == 200
        assert upd.json()["items"][0]["quantity"] == 1

        # place order (within radius)
        po = requests.post(f"{API}/orders", headers=_h(customer_token), json={
            "delivery_latitude": NEAR[0], "delivery_longitude": NEAR[1],
            "delivery_note": "TEST_note"})
        assert po.status_code == 200, po.text
        order = po.json()
        oid = order["id"]
        assert order["internal_status"] == "PENDING"
        assert order["customer_stage"] == "ORDER BEING PREPARED"
        assert order["delivery_latitude"] == NEAR[0]
        assert order["payment_method"] == "COD"
        assert order["delivery_fee"] == 0

        # customer sees order (3-stage)
        mine = requests.get(f"{API}/orders/mine", headers=_h(customer_token))
        assert mine.status_code == 200
        assert any(o["id"] == oid for o in mine.json())

        # invalid transition
        bad = requests.patch(f"{API}/admin/orders/{oid}/status",
                             headers=_h(admin_token), json={"status": "DELIVERED"})
        assert bad.status_code == 400

        # PENDING -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP
        for st in ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"]:
            r = requests.patch(f"{API}/admin/orders/{oid}/status",
                               headers=_h(admin_token), json={"status": st})
            assert r.status_code == 200, r.text
            assert r.json()["internal_status"] == st

        # find rider id
        parts = requests.get(f"{API}/admin/delivery-partners", headers=_h(admin_token)).json()
        rider = next(p for p in parts if p["email"] == RIDER[0])
        rid = rider["id"]

        # assign
        asn = requests.post(f"{API}/admin/deliveries/assign", headers=_h(admin_token),
                            json={"order_id": oid, "delivery_partner_id": rid})
        assert asn.status_code == 200

        # rider sees own assignment
        my_a = requests.get(f"{API}/delivery/assignments", headers=_h(rider_token))
        assert my_a.status_code == 200
        assert any(a["order_id"] == oid for a in my_a.json())

        # accept, pickup, start, delivered
        for path, body in [
            (f"/delivery/{oid}/accept", None),
            (f"/delivery/{oid}/pickup", None),
            (f"/delivery/{oid}/start", {"latitude": NEAR[0], "longitude": NEAR[1]}),
        ]:
            r = requests.post(f"{API}{path}", headers=_h(rider_token), json=body or {})
            assert r.status_code == 200, f"{path} => {r.status_code} {r.text}"

        # order now OUT_FOR_DELIVERY -> customer_stage ON THE WAY
        det = requests.get(f"{API}/orders/{oid}", headers=_h(customer_token)).json()
        assert det["internal_status"] == "OUT_FOR_DELIVERY"
        assert det["customer_stage"] == "ORDER ON THE WAY"
        assert "partner_location" in det

        # deliver
        r = requests.post(f"{API}{'/delivery/' + oid + '/delivered'}",
                          headers=_h(rider_token), json={})
        assert r.status_code == 200

        det2 = requests.get(f"{API}/orders/{oid}", headers=_h(customer_token)).json()
        assert det2["internal_status"] == "DELIVERED"
        assert det2["customer_stage"] == "ORDER ARRIVED"
        assert det2.get("payment_status") == "paid"
        # live location cleared
        assert "partner_location" not in det2

    def test_customer_cannot_view_others_order(self, customer_token, admin_token):
        # find an existing order
        orders = requests.get(f"{API}/admin/orders", headers=_h(admin_token)).json()["orders"]
        # try find one not by our customer
        me = requests.get(f"{API}/auth/me", headers=_h(customer_token)).json()["user"]
        other = next((o for o in orders if o["customer_id"] != me["id"]), None)
        if not other:
            pytest.skip("no foreign order to test")
        r = requests.get(f"{API}/orders/{other['id']}", headers=_h(customer_token))
        assert r.status_code == 403


# ---------------- ADMIN MANAGEMENT ----------------
class TestAdminManagement:
    def test_create_manager_and_partner(self, admin_token):
        email_m = f"TEST_mgr_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/admin/managers", headers=_h(admin_token), json={
            "name": "TEST_Manager", "email": email_m, "phone": "9990001111",
            "password": "Test@1234", "permissions": ["view_orders", "manage_deliveries"],
        })
        assert r.status_code == 200, r.text
        mid = r.json()["id"]

        email_p = f"TEST_dp_{uuid.uuid4().hex[:6]}@example.com"
        r2 = requests.post(f"{API}/admin/delivery-partners", headers=_h(admin_token), json={
            "name": "TEST_Partner", "email": email_p, "phone": "9992223333",
            "password": "Test@1234", "vehicle_type": "Bike", "vehicle_number": "TX01",
        })
        assert r2.status_code == 200, r2.text
        pid = r2.json()["id"]

        # audit log
        al = requests.get(f"{API}/admin/audit-logs", headers=_h(admin_token)).json()
        actions = [l["action"] for l in al["logs"][:20]]
        assert "create" in actions

        # cleanup
        requests.delete(f"{API}/admin/managers/{mid}", headers=_h(admin_token))
        requests.delete(f"{API}/admin/delivery-partners/{pid}", headers=_h(admin_token))


# ---------------- SETTINGS ----------------
class TestSettings:
    def test_admin_update_radius(self, admin_token, customer_token):
        # bump to 10
        r = requests.put(f"{API}/admin/settings", headers=_h(admin_token),
                         json={"delivery_radius_km": 10})
        assert r.status_code == 200
        assert r.json()["delivery_radius_km"] == 10
        # far point still outside (Delhi ~1150km), but 6-8km should now be inside; test with a 7km point
        # 7km east of kitchen ~ lon+0.063
        r2 = requests.post(f"{API}/location/check", headers=_h(customer_token),
                           json={"latitude": KITCHEN[0], "longitude": KITCHEN[1] + 0.06})
        assert r2.status_code == 200
        assert r2.json()["within_radius"] is True
        # revert
        rev = requests.put(f"{API}/admin/settings", headers=_h(admin_token),
                          json={"delivery_radius_km": 5})
        assert rev.status_code == 200
        assert rev.json()["delivery_radius_km"] == 5


# ---------------- NOTIFICATIONS ----------------
class TestNotifications:
    def test_customer_notifs(self, customer_token):
        r = requests.get(f"{API}/notifications", headers=_h(customer_token))
        assert r.status_code == 200
        assert "notifications" in r.json()

    def test_admin_notifs(self, admin_token):
        r = requests.get(f"{API}/notifications", headers=_h(admin_token))
        assert r.status_code == 200
