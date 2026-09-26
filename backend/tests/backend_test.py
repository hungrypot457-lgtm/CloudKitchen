"""CloudBite Kitchen backend security-remediation verification tests.

Focus:
  - SEC-001 Password reset tokens no longer exposed
  - SEC-002 Regex ReDoS mitigation (safe_regex in menu/orders/customers)
  - SEC-003 Delivery state-machine enforcement (illegal steps 400)
  - SEC-004 Notification IDOR (owner-scoped mark_read)
  - JWT hardening (payload type must be 'access', no token => 401)
  - Regression on core flows (auth, RBAC, menu, cart, orders, deliveries)

Since demo manager/customer/delivery accounts have been removed, the tests
create their own accounts through admin endpoints / customer register.
"""
import os
import time
import uuid
import pytest
import requests

# ---- config ----
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"


def _env_admin():
    email, pw = os.environ.get("ADMIN_EMAIL"), os.environ.get("ADMIN_PASSWORD")
    if not (email and pw) and os.path.exists("/app/backend/.env"):
        with open("/app/backend/.env") as f:
            kv = dict(line.strip().split("=", 1) for line in f if "=" in line and not line.startswith("#"))
        email, pw = email or kv.get("ADMIN_EMAIL"), pw or kv.get("ADMIN_PASSWORD")
    if not (email and pw):
        pytest.exit("ADMIN_EMAIL / ADMIN_PASSWORD not configured; refusing to run with hardcoded credentials")
    return (email, pw)


ADMIN = _env_admin()

KITCHEN = (19.0760, 72.8777)
NEAR = (19.08, 72.88)
FAR = (28.6139, 77.2090)


def _h(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


# ---------------- session fixtures: build the full test cast ----------------
@pytest.fixture(scope="session")
def admin_token():
    return _login(*ADMIN)


@pytest.fixture(scope="session")
def customer_creds():
    email = f"test_cust_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Passw0rd!"
    r = requests.post(f"{API}/auth/register", json={
        "name": "TEST_Customer", "email": email, "phone": "9998887771", "password": pw,
    }, timeout=15)
    assert r.status_code == 200, r.text
    return {"email": email, "password": pw, "token": r.json()["token"],
            "id": r.json()["user"]["id"]}


@pytest.fixture(scope="session")
def customer_token(customer_creds):
    return customer_creds["token"]


@pytest.fixture(scope="session")
def rider_creds(admin_token):
    email = f"rider_test_{uuid.uuid4().hex[:6]}@cloudbite.com"
    pw = "Rider@123"
    r = requests.post(f"{API}/admin/delivery-partners", headers=_h(admin_token), json={
        "name": "TEST_Rider", "email": email, "phone": "9990001112",
        "password": pw, "vehicle_type": "Bike", "vehicle_number": "TX99",
    }, timeout=15)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    return {"email": email, "password": pw, "id": pid, "token": _login(email, pw)}


@pytest.fixture(scope="session")
def rider_token(rider_creds):
    return rider_creds["token"]


@pytest.fixture(scope="session")
def manager_creds(admin_token):
    email = f"test_mgr_{uuid.uuid4().hex[:6]}@example.com"
    pw = "Manager@123"
    r = requests.post(f"{API}/admin/managers", headers=_h(admin_token), json={
        "name": "TEST_Manager", "email": email, "phone": "9990002222",
        "password": pw, "permissions": ["view_orders", "manage_deliveries"],
    }, timeout=15)
    assert r.status_code == 200, r.text
    return {"email": email, "password": pw, "id": r.json()["id"], "token": _login(email, pw)}


@pytest.fixture(scope="session")
def manager_token(manager_creds):
    return manager_creds["token"]


# helper: place an order for customer, walk it to READY_FOR_PICKUP, assign to rider
def _place_and_assign(customer_token, admin_token, rider_id):
    items = requests.get(f"{API}/menu").json()
    cb = next(i for i in items if i["available"])
    requests.delete(f"{API}/cart", headers=_h(customer_token))
    add = requests.post(f"{API}/cart/items", headers=_h(customer_token),
                        json={"menu_item_id": cb["id"], "quantity": 1, "customizations": []})
    assert add.status_code == 200, add.text
    po = requests.post(f"{API}/orders", headers=_h(customer_token), json={
        "delivery_latitude": NEAR[0], "delivery_longitude": NEAR[1],
        "delivery_note": "TEST_sec"})
    assert po.status_code == 200, po.text
    oid = po.json()["id"]
    for st in ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"]:
        r = requests.patch(f"{API}/admin/orders/{oid}/status",
                           headers=_h(admin_token), json={"status": st})
        assert r.status_code == 200, r.text
    asn = requests.post(f"{API}/admin/deliveries/assign", headers=_h(admin_token),
                        json={"order_id": oid, "delivery_partner_id": rider_id})
    assert asn.status_code == 200, asn.text
    return oid


# ================================================================
# SEC-001 Password reset tokens not exposed
# ================================================================
class TestSEC001PasswordReset:
    def test_forgot_password_generic_message_no_token(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN[0]})
        assert r.status_code == 200
        body = r.json()
        # Message present
        assert "message" in body
        # No raw token field returned
        low = {k.lower() for k in body.keys()}
        for forbidden in ("token", "reset_token", "reset_link", "token_hash", "link"):
            assert forbidden not in low, f"forgot-password leaked '{forbidden}': {body}"

    def test_forgot_password_unknown_email_same_generic(self):
        r = requests.post(f"{API}/auth/forgot-password", json={
            "email": f"noone_{uuid.uuid4().hex[:6]}@example.com"})
        assert r.status_code == 200
        assert "message" in r.json()

    def test_reset_with_garbage_token_400(self):
        r = requests.post(f"{API}/auth/reset-password", json={
            "token": "totally-garbage-token", "new_password": "NewPassw0rd!"})
        assert r.status_code == 400
        assert "invalid" in r.json().get("detail", "").lower() or \
               "expired" in r.json().get("detail", "").lower()

    def test_reset_with_empty_token_400(self):
        r = requests.post(f"{API}/auth/reset-password", json={
            "token": "", "new_password": "NewPassw0rd!"})
        # Either 400 (business) or 422 (validation) is acceptable; NOT 500 or 200
        assert r.status_code in (400, 422)


# ================================================================
# SEC-002 Regex ReDoS mitigation
# ================================================================
class TestSEC002RegexSafe:
    def test_menu_search_normal(self):
        r = requests.get(f"{API}/menu", params={"search": "biryani"}, timeout=10)
        assert r.status_code == 200
        # results should contain biryani (case-insensitive) if seeded, or be empty list
        names = [i["name"].lower() for i in r.json()]
        assert all(isinstance(n, str) for n in names)

    def test_menu_search_regex_special_no_crash(self):
        # Malicious patterns should be escaped literally; response fast + 200
        for pattern in ["(a+)+$", ".*", "^$", "[[[[", "(.*)*", "a{99999}"]:
            t0 = time.time()
            r = requests.get(f"{API}/menu", params={"search": pattern}, timeout=10)
            elapsed = time.time() - t0
            assert r.status_code == 200, f"pattern {pattern!r} -> {r.status_code} {r.text}"
            assert elapsed < 3.0, f"pattern {pattern!r} took {elapsed:.2f}s"
            # escaped literal => should not match seeded item names
            assert isinstance(r.json(), list)

    def test_admin_orders_q_regex_special(self, admin_token):
        for pattern in ["biryani", "(a+)+$", ".*"]:
            r = requests.get(f"{API}/admin/orders", params={"q": pattern},
                             headers=_h(admin_token), timeout=10)
            assert r.status_code == 200, f"{pattern!r}: {r.text}"
            assert "orders" in r.json()

    def test_admin_customers_q_regex_special(self, admin_token):
        for pattern in ["test", "(a+)+$", ".*"]:
            r = requests.get(f"{API}/admin/customers", params={"q": pattern},
                             headers=_h(admin_token), timeout=10)
            assert r.status_code == 200, f"{pattern!r}: {r.text}"


# ================================================================
# SEC-003 Delivery state-machine enforcement
# ================================================================
class TestSEC003DeliveryStateMachine:
    def test_happy_path(self, customer_token, admin_token, rider_token, rider_creds):
        oid = _place_and_assign(customer_token, admin_token, rider_creds["id"])
        # accept
        r = requests.post(f"{API}/delivery/{oid}/accept", headers=_h(rider_token), json={})
        assert r.status_code == 200, r.text
        # pickup
        r = requests.post(f"{API}/delivery/{oid}/pickup", headers=_h(rider_token), json={})
        assert r.status_code == 200, r.text
        # start (needs lat/lng)
        r = requests.post(f"{API}/delivery/{oid}/start", headers=_h(rider_token),
                          json={"latitude": NEAR[0], "longitude": NEAR[1]})
        assert r.status_code == 200, r.text
        # verify OUT_FOR_DELIVERY + payment_status not yet paid
        det = requests.get(f"{API}/orders/{oid}", headers=_h(customer_token)).json()
        assert det["internal_status"] == "OUT_FOR_DELIVERY"
        assert det.get("payment_status") != "paid"
        # delivered
        r = requests.post(f"{API}/delivery/{oid}/delivered", headers=_h(rider_token), json={})
        assert r.status_code == 200, r.text
        det2 = requests.get(f"{API}/orders/{oid}", headers=_h(customer_token)).json()
        assert det2["internal_status"] == "DELIVERED"
        assert det2.get("payment_status") == "paid"

    def test_illegal_steps_rejected(self, customer_token, admin_token, rider_token, rider_creds):
        """Second assigned order; verify illegal transitions all return 400."""
        oid = _place_and_assign(customer_token, admin_token, rider_creds["id"])

        # delivered before accept -> 400
        r = requests.post(f"{API}/delivery/{oid}/delivered", headers=_h(rider_token), json={})
        assert r.status_code == 400, f"delivered before accept: {r.status_code} {r.text}"
        assert "invalid" in r.json().get("detail", "").lower()

        # pickup before accept -> 400
        r = requests.post(f"{API}/delivery/{oid}/pickup", headers=_h(rider_token), json={})
        assert r.status_code == 400, f"pickup before accept: {r.status_code} {r.text}"

        # start before pickup -> 400
        r = requests.post(f"{API}/delivery/{oid}/start", headers=_h(rider_token),
                          json={"latitude": NEAR[0], "longitude": NEAR[1]})
        assert r.status_code == 400, f"start before pickup: {r.status_code} {r.text}"

        # Now accept -> then start (still before pickup) must 400
        r = requests.post(f"{API}/delivery/{oid}/accept", headers=_h(rider_token), json={})
        assert r.status_code == 200
        r = requests.post(f"{API}/delivery/{oid}/start", headers=_h(rider_token),
                          json={"latitude": NEAR[0], "longitude": NEAR[1]})
        assert r.status_code == 400, f"start after accept but before pickup: {r.text}"

        # delivered still 400 (not yet out_for_delivery)
        r = requests.post(f"{API}/delivery/{oid}/delivered", headers=_h(rider_token), json={})
        assert r.status_code == 400

        # Payment must NOT be paid since not legitimately delivered
        det = requests.get(f"{API}/orders/{oid}", headers=_h(customer_token)).json()
        assert det.get("payment_status") != "paid"

    def test_unassigned_order_returns_403(self, customer_token, admin_token, rider_token):
        # Place an order without assigning it to this rider
        items = requests.get(f"{API}/menu").json()
        cb = next(i for i in items if i["available"])
        requests.delete(f"{API}/cart", headers=_h(customer_token))
        requests.post(f"{API}/cart/items", headers=_h(customer_token),
                      json={"menu_item_id": cb["id"], "quantity": 1, "customizations": []})
        po = requests.post(f"{API}/orders", headers=_h(customer_token), json={
            "delivery_latitude": NEAR[0], "delivery_longitude": NEAR[1]})
        oid = po.json()["id"]
        r = requests.post(f"{API}/delivery/{oid}/accept", headers=_h(rider_token), json={})
        assert r.status_code == 403


# ================================================================
# SEC-004 Notification IDOR
# ================================================================
class TestSEC004NotificationIDOR:
    def _get_notif(self, token):
        r = requests.get(f"{API}/notifications", headers=_h(token))
        assert r.status_code == 200
        return r.json().get("notifications", [])

    def test_customer_can_mark_own_notification(self, customer_token, admin_token,
                                                 rider_token, rider_creds):
        # Trigger a notification for this customer by placing + advancing an order
        oid = _place_and_assign(customer_token, admin_token, rider_creds["id"])
        # Give the write a moment (notify() is awaited but harmless)
        time.sleep(0.2)
        notifs = self._get_notif(customer_token)
        if not notifs:
            pytest.skip("no customer notifications generated yet")
        nid = notifs[0]["id"]
        r = requests.post(f"{API}/notifications/{nid}/read", headers=_h(customer_token))
        assert r.status_code == 200

    def test_customer_cannot_mark_other_users_notification(self, customer_token,
                                                            admin_token):
        # Fetch admin's notifications (admin sees own + staff-targeted)
        admin_notifs = self._get_notif(admin_token)
        # Pick a notification that is not owned by our customer.
        # Since admin sees staff-targeted ones, most nids there are unrelated to customer.
        if not admin_notifs:
            pytest.skip("no admin notifications available")
        target = admin_notifs[0]
        nid = target["id"]

        # Get "read" state pre
        pre_read = target.get("read", False)

        # Customer attempts to mark it read
        r = requests.post(f"{API}/notifications/{nid}/read", headers=_h(customer_token))
        # Endpoint returns 200 but should be NO-OP (owner-scoped filter)
        assert r.status_code == 200

        # Verify it did NOT change (still same read state) from admin's view
        admin_notifs_after = self._get_notif(admin_token)
        after = next((n for n in admin_notifs_after if n["id"] == nid), None)
        assert after is not None
        assert bool(after.get("read", False)) == bool(pre_read), \
            "customer was able to modify another user's notification (IDOR)"

    def test_malformed_notification_id_returns_400(self, customer_token):
        r = requests.post(f"{API}/notifications/not-a-valid-oid/read",
                          headers=_h(customer_token))
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"


# ================================================================
# JWT hardening
# ================================================================
class TestJWTHardening:
    def test_no_token_returns_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_valid_access_token_ok(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_garbage_token_returns_401(self):
        r = requests.get(f"{API}/auth/me",
                         headers={"Authorization": "Bearer not.a.real.jwt"})
        assert r.status_code == 401

    def test_non_access_type_token_rejected(self):
        """Craft a JWT with type='refresh' using the server secret; must be rejected."""
        import jwt as _jwt
        from datetime import datetime, timezone, timedelta
        # Read secret from backend .env
        secret = None
        try:
            with open("/app/backend/.env") as f:
                for line in f:
                    if line.startswith("JWT_SECRET="):
                        secret = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except Exception:
            pass
        if not secret:
            pytest.skip("JWT_SECRET not readable from backend/.env; cannot craft test token")
        bad_payload = {
            "sub": "507f1f77bcf86cd799439011",
            "role": "admin",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "type": "refresh",   # <- not 'access'
        }
        bad_token = _jwt.encode(bad_payload, secret, algorithm="HS256")
        r = requests.get(f"{API}/auth/me",
                         headers={"Authorization": f"Bearer {bad_token}"})
        assert r.status_code == 401, f"non-access type token accepted: {r.text}"


# ================================================================
# Regression: core flows
# ================================================================
class TestRegression:
    def test_menu_public_unavailable_visible(self):
        r = requests.get(f"{API}/menu")
        assert r.status_code == 200
        items = r.json()
        # At least one unavailable item should be visible (seed guarantees this)
        assert any(not i["available"] for i in items), \
            "Unavailable items must still be visible in menu listing"

    def test_cannot_add_unavailable_to_cart(self, customer_token):
        items = requests.get(f"{API}/menu").json()
        unavail = next((i for i in items if not i["available"]), None)
        if not unavail:
            pytest.skip("no unavailable item")
        r = requests.post(f"{API}/cart/items", headers=_h(customer_token),
                          json={"menu_item_id": unavail["id"], "quantity": 1,
                                "customizations": []})
        assert r.status_code == 400

    def test_location_within_and_outside(self, customer_token):
        r1 = requests.post(f"{API}/location/check", headers=_h(customer_token),
                           json={"latitude": NEAR[0], "longitude": NEAR[1]})
        assert r1.status_code == 200 and r1.json()["within_radius"] is True
        r2 = requests.post(f"{API}/location/check", headers=_h(customer_token),
                           json={"latitude": FAR[0], "longitude": FAR[1]})
        assert r2.status_code == 200 and r2.json()["within_radius"] is False

    def test_cart_add_update(self, customer_token):
        items = requests.get(f"{API}/menu").json()
        cb = next(i for i in items if i["available"])
        requests.delete(f"{API}/cart", headers=_h(customer_token))
        add = requests.post(f"{API}/cart/items", headers=_h(customer_token),
                            json={"menu_item_id": cb["id"], "quantity": 2,
                                  "customizations": []})
        assert add.status_code == 200
        line_id = add.json()["items"][0]["line_id"]
        upd = requests.patch(f"{API}/cart/items/{line_id}",
                             headers=_h(customer_token), json={"quantity": 3})
        assert upd.status_code == 200
        assert upd.json()["items"][0]["quantity"] == 3

    def test_admin_dashboard_ok(self, admin_token):
        r = requests.get(f"{API}/admin/dashboard", headers=_h(admin_token))
        assert r.status_code == 200

    def test_customer_forbidden_dashboard(self, customer_token):
        r = requests.get(f"{API}/admin/dashboard", headers=_h(customer_token))
        assert r.status_code == 403

    def test_manager_cannot_create_menu(self, manager_token):
        cats = requests.get(f"{API}/categories").json()
        cid = cats[0]["id"] if cats else "abc"
        r = requests.post(f"{API}/menu", headers=_h(manager_token), json={
            "category_id": cid, "name": "TEST_x", "price": 10})
        assert r.status_code == 403

    def test_manager_reports_denied(self, manager_token):
        r = requests.get(f"{API}/admin/reports", headers=_h(manager_token))
        assert r.status_code == 403

    def test_manager_managers_list_denied(self, manager_token):
        r = requests.get(f"{API}/admin/managers", headers=_h(manager_token))
        assert r.status_code == 403
