# TODO - Admin + User Profile Edit (name/email/phone/bldg name/wing/flat number)

## Backend
- [ ] Add DB columns: `bldg_name` and `wing` to `users` table (nullable)
- [ ] Update Drizzle schema: `lib/db/src/schema/users.ts`
- [ ] Update `PATCH /api/users/me` (UpdateMyProfileBody) to accept `bldg_name` and `wing`
- [ ] Add admin endpoint: `PATCH /api/admin/users/:clerkUserId/profile` protected by `requireAdmin()`
- [ ] Update `GET /api/users` to return `bldg_name` and `wing`
- [ ] Update OpenAPI/Zod generation sources (if required by repo)
- [ ] Regenerate `lib/api-zod` and `lib/api-client-react`

## Frontend
- [ ] Fix/complete `artifacts/meditiya-sathi/src/pages/admin/residents.tsx`
- [ ] Make table columns editable: name, email, phone, bldg_name, wing, flatNumber
- [ ] Save button per row calling admin update endpoint

## Verification
- [ ] Run builds: `lib/db`, `lib/api-zod`, `lib/api-client-react`, `artifacts/api-server`, `artifacts/meditiya-sathi`

