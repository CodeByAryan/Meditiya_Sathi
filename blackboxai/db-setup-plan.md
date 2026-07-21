# DB setup plan

## Information gathered
- Project uses **Drizzle** with **drizzle-kit** in `lib/db`.
- `@workspace/db` exposes `pnpm --filter @workspace/db run push` which runs:
  - `drizzle-kit push --config ./drizzle.config.ts`
- `lib/db/drizzle.config.ts` sets:
  - `schema: path.join(__dirname, "./src/schema/index.ts")`
- Attempting `pnpm --filter @workspace/db run push` fails with:
  - `No schema files found for path ... lib/db/src/schema/index.ts`
- The file `lib/db/src/schema/index.ts` exists and exports tables.

## Plan
1. Fix drizzle-kit config schema path so drizzle-kit can resolve schema under ESM/ts.
   - Change `schema` from a direct `.ts` file path to a **directory path** that drizzle-kit can scan reliably.
2. Re-run `pnpm --filter @workspace/db run push`.
3. If it still fails, run drizzle-kit with `--schema` explicitly to pinpoint resolution.

## Dependent files to edit
- `lib/db/drizzle.config.ts`

## Followup steps
- After successful push, run `pnpm --filter @workspace/api-server run dev` and hit `/health`.
- Confirm tables exist in the Postgres database.

