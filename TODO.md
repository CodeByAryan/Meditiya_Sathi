# TODO - Sync Festival Dashboard with Outsider Donations

## Steps
- [x] 1. Explore repo & understand the data flow (festival detail page, outsider donations, stats endpoints)
- [x] 2. Confirm plan with user
- [x] 3. Backend: Update `/api/admin/festivals/:festivalId/stats` to include per-festival `outsiderCollection`, `outsiderDonations`, `residentCollection`, and set `totalCollection = resident + outsider`
- [x] 4. Backend: Add optional `festivalId` filter to `/api/admin/outsider-donations/analytics`
- [x] 5. Frontend: Update `Stats` interface in festival-detail.tsx (add residentCollection, outsiderCollection, outsiderDonations)
- [x] 6. Frontend: Update `OutsiderCollectionCard` to use per-festival stats + filtered analytics (single source of truth)
- [x] 7. Type-check backend (`pnpm --filter @workspace/api-server exec tsc --noEmit`) — only pre-existing unrelated error in admin-festivals.ts
- [x] 8. Type-check frontend (`pnpm --filter @workspace/meditiya-sathi exec tsc --noEmit`) — passes
- [x] 9. Verify dashboard shows Total Collection = resident + outsider and Outsider Collection scoped to the festival

