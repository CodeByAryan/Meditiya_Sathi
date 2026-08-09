# T-Shirt Collection / Distribution Management — Implementation TODO

## Backend (COMPLETE — typechecks)
- [x] Schema: add collection fields to `tshirtRegistrations.ts`
- [x] Migration: `lib/db/scripts/migrate-tshirt-collection.mjs` — **APPLIED to Neon DB** (6/6 columns + unique index, backfilled 5 registrations)
- [x] New route: `api-server/src/routes/tshirt-collection.ts` (summary, search, lookup, atomic collect, history)
- [x] QR endpoint: `GET /api/admin/tshirt-registrations/:id/qr`
- [x] `collection_id` auto-generation on create
- [x] `qrcode` + `@types/qrcode` deps added
- [x] Router registered in `routes/index.ts`

## Frontend
- [x] Install `html5-qrcode` in meditiya-sathi
- [x] `tshirt-registrations.tsx`: add QR button, **QR modal (Download/Print)**, collection status badge
- [x] Frontend typecheck (passes clean)
- [ ] Create `pages/admin/tshirt-collection.tsx` (collection page: festival selector, summary cards, size breakdown, QR scanner, manual search, verification, confirm-distribution modal, already-collected, invalid QR)
- [ ] Create `pages/admin/collection-history.tsx` (history table + filters + pagination)
- [ ] Register routes in `App.tsx` + `App-admin-routes.tsx`
- [ ] Add "T-Shirt Management" nav (Registrations / Collection / History) in `admin.tsx`
## Fixes (APPLIED)
- [x] **QR query ambiguity bug**: `GET /:id/qr` SELECT used bare `id`/`collection_id`/`name`/`quantity`/`t_shirt_size` while joining `festivals f` (which also has `id`), causing Postgres "column reference 'id' is ambiguous". Qualified all columns with the `t.` alias. Verified the corrected query returns the expected row (id=3 → `TSH-2026-0001`) against Neon DB. Rebuilt `dist/`.

## Remaining
- [ ] Backend typecheck
- [ ] Build checks
