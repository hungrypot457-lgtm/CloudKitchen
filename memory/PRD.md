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
- Seeded admin only: from backend/.env ADMIN_EMAIL / ADMIN_PASSWORD (see /app/memory/test_credentials.md). No permanent demo/manager/customer/rider accounts exist (user rule).

## QA Audit (2026-09-26)
- Frontend env: /app/frontend/.env REACT_APP_BACKEND_URL set from platform runtime `preview_endpoint` (not committed; CRA build-time var).
- Backend QA: 130 tests (iteration_1/2) + 27 pytest regression PASS. Frontend authenticated browser QA (iteration_3/4) PASS across admin/manager/customer/rider incl. full e2e order→assign→deliver, 5 km rule, ₹0 fees, RBAC, responsive.
- Bugs fixed this audit: negative pagination 500; registration markup; unknown-route blank page; manager could open admin-only console pages by URL (client route Guard in StaffApp.jsx); /app/orders/:id infinite Loading on invalid id (not-found state); LeafletMap exhaustive-deps lint → CI build failure; pytest suite hardcoded non-existent admin (now env-driven).
- Known leftovers (pre-existing test artifacts, not touched): menu item "Test Item", business_name "CloudBite Kitchen Updated", 11 orphan order_status_history + 12 audit_logs rows from earlier sessions.

## Real-Device Readiness Check (2026-09-26) — PASS, no code changes
- Mobile-emulated (iPhone 13 / Pixel 5, touch) browser run: /app/test_reports/iteration_5.json. Customer checkout GPS denied/granted paths, touch pin drop + marker drag, OSM tiles + Leaflet CDN CSS load, COD/₹0, order→rider accept/pickup/start(GPS-denied kitchen fallback)/live location POST ~8s/delivered, customer 3-stage tracking, admin/manager at 1920/1366/1024/768/390 — all PASS. Google login = full-page redirect (no popup).
- BLOCKED (physical phone only): real GPS fix/accuracy, native permission prompt persistence, background-tab throttling of rider location loop, Google consent completion, iOS Safari gesture/momentum-scroll, Android WebView drag.
- Note: pytest suite creates TEST_* accounts/orders and admin reset tokens and does not self-clean — remove after each run.

## Pending — Security & Configuration Hardening (user request, NOT started)
- seed.py: remove default fallback admin credentials (fail safely). CORS: remove wildcard. Delivery assignment: validate partner active (server-side; UI already filters). Audit log on delivery rejection. JWT in localStorage review. Password reset token delivery (email/SMS).

## Backlog / Future (P1/P2)
- P1: Real Google/Facebook OAuth; push/email notifications; menu customization editor UI in admin.
- P2: Online payment gateway (architecture ready); coupons/reviews; WebSocket tracking; profile photo uploads (object storage).
