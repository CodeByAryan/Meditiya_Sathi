# Outsider Donation Module - Implementation Plan

## Steps

- [x] 1. Analyze existing architecture (DB schema, API routes, frontend patterns)
- [x] 2. Create Drizzle schema `lib/db/src/schema/outsiderDonations.ts`
- [x] 3. Export new schema from `lib/db/src/schema/index.ts`
- [x] 4. Create backend API `artifacts/api-server/src/routes/outsider-donations.ts`
- [x] 5. Register route in `artifacts/api-server/src/routes/index.ts`
- [x] 6. Create migration script `lib/db/scripts/migrate-outsider-donations.mjs`
- [x] 7. Create frontend page `artifacts/meditiya-sathi/src/pages/admin/outsider-donations.tsx`
- [x] 8. Register route in `artifacts/meditiya-sathi/src/App.tsx`
- [x] 9. Export page in `artifacts/meditiya-sathi/src/App-admin-routes.tsx`
- [x] 10. Add dashboard card in `artifacts/meditiya-sathi/src/pages/admin.tsx`
- [x] 11. All steps completed ✓
- [x] 12. Fix 404 on localhost — root cause identified and fixed ✓

## Root Cause of 404 on Localhost

1. **`.env` was missing `VITE_API_URL`** — `getApiUrl()` in `lib/utils.ts` falls back to `https://meditiya-sathi.onrender.com` (production) when `VITE_API_URL` isn't set. Local dev was calling the production server, which lacks the new routes → **404**.
2. **API server was not running** — The server process on port 8080 had been terminated (after the 20h interruption). Routes were correctly built into `dist/index.mjs`, but nothing was listening.

## Fix Applied

- **`.env`**: Added `VITE_API_URL=http://localhost:8080` so local dev hits the local API server.
- **API server**: Rebuilt and restarted on port 8080.

## Verification (all 6 endpoints now return 401, not 404)

| Endpoint | Before | After |
|---|---|---|
| `GET /api/admin/outsider-donations` | 404 | 401 |
| `GET /api/admin/outsider-donations/stats` | 404 | 401 |
| `GET /api/admin/outsider-donations/reports` | 404 | 401 |
| `POST /api/admin/outsider-donations` | 404 | 401 |
| `PATCH /api/admin/outsider-donations/:id` | 404 | 401 |
| `DELETE /api/admin/outsider-donations/:id` | 404 | 401 |
