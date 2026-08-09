# TODO - Allow Duplicate T-Shirt Registrations

## Problem
"Allow duplicate registration also." Previously the system blocked creating a
t-shirt registration when the same mobile number already existed for the same
festival (returning 409 "This resident is already registered for this festival.").

## Root Cause
A DB unique index (`idx_tshirt_festival_mobile` on `(festival_id, mobile_number)`)
combined with an application-level duplicate check prevented multiple
registrations for the same resident in the same festival.

## Steps

- [x] 1. Update DB schema (`lib/db/src/schema/tshirtRegistrations.ts`): remove the unique index definition
- [x] 2. Create migration `lib/db/scripts/migrate-tshirt-allow-duplicates.mjs` to drop the existing unique index
- [x] 3. Run migration against production → unique index removed ✔
- [x] 4. Update API route (`artifacts/api-server/src/routes/tshirt-registrations.ts`):
  - [x] 4a. Remove duplicate-check SELECT in POST handler
  - [x] 4b. Remove 409 responses and 23505 error handling in POST
  - [x] 4c. Remove 23505 error handling in PATCH
- [x] 5. Update base table migration (`migrate-tshirt-registrations.mjs`): stop creating the unique index
- [x] 6. Rebuild API server bundle (`pnpm --dir artifacts/api-server run build`) → dist/ regenerated ✓

## Remaining (ACTION REQUIRED - redeploy)
- [ ] Redeploy the freshly built API bundle (`artifacts/api-server/dist/`) so the running server picks up the change
- [ ] Verify duplicate registration works end-to-end

## Verified
- Unique index `idx_tshirt_festival_mobile` dropped from production DB ✔
- Source route `tshirt-registrations.ts` no longer contains any duplicate check / "already registered" message ✔
- Fresh `dist/index.mjs` bundle rebuilt and no longer contains the t-shirt "already registered" message ✔
- Frontend `tshirt-registrations.tsx` has no client-side duplicate check ✔

## Why the error may still appear
The code/schema/DB are all fixed, but the **running server is still executing the old
bundle**. You must redeploy `artifacts/api-server/dist/` to the hosting platform
(e.g. Vercel/Railway) for the new build to take effect.

## Note
The typecheck reports one pre-existing error in `src/routes/admin-festivals.ts:29`
(unrelated to this change). It does not block the esbuild bundle, which built
successfully.

