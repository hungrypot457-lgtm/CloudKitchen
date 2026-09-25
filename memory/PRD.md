# CloudBite — Cloud Kitchen Ordering & Delivery System (PRD)

## Original Problem
Build a complete cloud kitchen food ordering & delivery management system with ONE shared backend/DB/auth/RBAC/order/delivery/notification system and FOUR interfaces: Admin website, Manager website (responsive dashboards), Customer mobile app, Delivery Partner mobile app.

## Architecture
- Backend: FastAPI (modular routers) + MongoDB (motor). All routes under `/api`.
- Auth: JWT (Bearer token in `Authorization` header, stored in localStorage `cb_token`). bcrypt hashing. Super-admin seeded from `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Brute-force lockout.
- RBAC server-side: roles admin/manager/customer/delivery_partner; granular manager permissions enforced via `require_permission`.
- Maps: Leaflet + OpenStreetMap (no API key). Live tracking via 5s polling.
- Frontend: single React SPA, path-based portals — `/console` (admin+manager, role-aware nav), `/app` (customer), `/rider` (delivery). Auth-first routing with role redirects; `/` → `/app`.

### Backend files
- db.py, auth.py (JWT+RBAC), utils.py (haversine, status mapping, settings, audit, notify), models.py, seed.py, server.py
- routes_auth, routes_menu, routes_cart, routes_orders, routes_delivery, routes_admin, routes_misc

## Core Requirements (static)
- Unavailable items stay visible (badge + disabled add); backend blocks add/order of unavailable items.
- Customer status = 3 stages only (ORDER BEING PREPARED / ON THE WAY / ARRIVED); internal statuses richer with mapping.
- No address system — GPS coords only. Order snapshots delivery_latitude/longitude.
- 5 km delivery radius, server-side validated (Haversine), configurable in Admin Settings.
- COD only; delivery/platform/convenience fees = ₹0. Prices/totals validated server-side.
- Live GPS only during active delivery; cleared on delivered.
- Audit logs for admin actions; in-app notifications.

## Implemented (2026-06)
- All 4 portals functional end-to-end. Backend tested 100% (26/26). Customer order→admin→assign→rider accept/pickup/start/deliver→live tracking verified.
- Admin: dashboard (real stats + chart), orders (detail/status/assign), menu mgmt + availability toggle, categories, customers, delivery partners, managers (permissions), deliveries, live tracking map, reports (charts), notifications, settings (map+radius), audit logs. Fully responsive (sidebar/drawer).
- Manager: same console filtered by permissions; admin-only modules hidden + server-enforced.
- Customer app: signup/login, menu+categories+search, unavailable handling, cart+customizations, map pin checkout w/ 5km check, COD order, history, 3-stage tracking w/ live map, profile, notifications. Google/Facebook = placeholders.
- Delivery app: login, assigned deliveries, accept/reject/pickup/start/delivered, live location push, navigate link, history, profile.

## Demo Credentials
- Admin: hungrypot457@gmail.com / Admin@12345
- Manager: manager@cloudbite.com / Manager@123
- Customer: customer@cloudbite.com / Customer@123
- Rider: rider@cloudbite.com / Rider@123

## Backlog / Future (P1/P2)
- P1: Real Google/Facebook OAuth; push/email notifications; menu customization editor UI in admin.
- P2: Online payment gateway (architecture ready); coupons/reviews; WebSocket tracking; profile photo uploads (object storage).
