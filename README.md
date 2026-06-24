# Kiosk POS Backend

Express + MongoDB backend for a small self-service cafe/kiosk POS. Counter staff
create token-based orders (no table service), kitchen runs them through a Kitchen
Display System, and a public Ready Pickup screen shows tokens as they're ready.

## Features
- JWT login / refresh / logout, role-based users (owner, pos_manager, kitchen_staff)
- Multi-tenant: every business's data is isolated under its own `businessId`
- Category, Product (with ingredient recipe), Ingredient inventory
- Token-based orders with coupon/discount/tax/fee/tip, split payments, refunds
- Auto-deduction of ingredient stock per order, auto-generated purchase orders
  when stock drops below threshold
- Kitchen Display System endpoints (no payment data exposed)
- Public Ready Pickup screen endpoint + SSE for realtime token updates
- Sales/orders/products/payments/inventory reports

## Quick start

```bash
npm install
cp .env.example .env   # fill in MONGO_URI, JWT secrets
npm run dev
```

KDS realtime stream: `GET /api/kds/stream?token=<accessToken>`
Public ready-screen feed: `GET /api/public/:businessSlug/ready` (poll) or `GET /api/public/:businessSlug/ready/stream` (SSE)
API docs: `GET /api-docs`

## Folder structure
- `src/models` — Mongoose schemas (Business, User, Category, Ingredient, Product, Tax, Fee, Coupon, PurchaseOrder, StockLog, Token, Counter)
- `src/controllers` / `src/routes` — REST API by resource
- `src/services` — order totals calculation, recipe-based inventory deduction, SSE fan-out
- `src/middlewares` — JWT auth, role-based access, image upload (multer)
- `src/utils` — multi-tenant scoping (AsyncLocalStorage), JWT signing, slugify

## Roles
- **owner** — full access: products, inventory, purchase orders, users, reports, business settings
- **pos_manager** (cashier) — create orders, accept payments, refunds (gated by `permissions.canRefund`, falling back to `Business.settings.cashierCanRefundByDefault`), toggle product availability
- **kitchen_staff** — KDS only: start preparing / mark unavailable / mark ready; never sees payment data
