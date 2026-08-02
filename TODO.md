# Date-wise Collection Analytics (Admin Dashboard) ✅

## Plan
- [x] **Backend: `api-server/src/routes/festival-donations.ts`** - Extend `GET /admin/festivals/:festivalId/collection-summary?date=YYYY-MM-DD`
  - [x] Add `AVG(amount)` to the summary SQL → `averageDonation`
  - [x] Convert `paymentMethods` from a Record to a sorted array `[{ method, amount, count }]`
  - [x] Normalize `bank_transfer` -> `bank`, sort by amount desc

- [x] **Frontend: `meditiya-sathi/src/pages/admin/festival-detail.tsx`** - Add date-wise analytics cards
  - [x] Update `CollectionSummary` interface to array form + `averageDonation`
  - [x] Add `TrendingUp` icon import
  - [x] Add `useEffect` triggering fetch on festival/date change
  - [x] Add glassmorphism analytics section (Card 1: Date-wise Collection, Card 2: Payment Method Breakdown) below summary stats
  - [x] Loading / empty / error states; "No collections found for this date."
  - [x] Refresh summary on donation add/edit/delete

## Verification
- [ ] Frontend typecheck: `npx tsc -p tsconfig.json --noEmit` passes
- [ ] Backend typecheck passes

## Deployment Fix (404 on https://meditiya-sathi.onrender.com)
- [x] Diagnosed: Production back end runs last committed code; `collection-summary` route only exists in the working tree
- [ ] Commit + push changes (incl. new `requireRole.ts`) so Render re-deploys with the new route

