# GameDayOps College — Security Hardening (production readiness)

This documents the audit fixes applied to make GameDayOps **College** safe for
paying customers. **NFL is untouched** (separate project, domain, DB, Stripe).

The guarantees the architecture now enforces:

- A logged-out person **cannot** use the application (auth enforced by the route
  layer, not just an env var, and fail-closed).
- A user in Org A **cannot** reach Org B's data (RLS + verified edge functions).
- A user **without an active entitlement cannot** modify game-day data (client
  gate **and** server-side RLS).
- A TV shows exactly **one** org's board via an opaque display token; changing
  the token exposes nothing.

---

## What changed (by audit ID)

| ID | Fix | Where |
|----|-----|-------|
| **C1** | Auth enforced by route architecture (`commercialMode()` from product config, not just `VITE_REQUIRE_AUTH`), and **fail-closed** if the backend is unreachable. `/`, `/admin`, `/billing` are gated; only `/login`, `/welcome`, `/display/:token` are public. | `RequireAuth.tsx`, `Root.tsx`, `product.ts`, `apps/college/src/product.ts` |
| **C2** | Client entitlement gate — no valid trial/subscription ⇒ redirect to `/billing`. | `RequireEntitlement.tsx`, `billing.ts` (`isEntitled`, `entitlementReason`) |
| **C3** | Server-side entitlement — board writes require `org_entitled(org_id)` in RLS, so an expired org can't write even if the frontend is bypassed. | `migrations/0008` |
| **C4** | Anonymous writes to `public.boards` removed; writes require an authenticated member of a real org (`org_id NOT NULL`). Audit-probe rows deleted. | `migrations/0008` |
| **C5** | `create-checkout` requires a valid JWT **and** membership of the requested org; uses the verified user's email. | `functions/create-checkout`, `functions/_shared/auth.ts` |
| **C6** | `customer-portal` requires a valid JWT **and** membership of the requested org. | `functions/customer-portal`, `functions/_shared/auth.ts` |
| **C7** | Per-display opaque token → read-only board via `display_board()` SECURITY DEFINER RPC. Admin “TV Displays” panel creates/copies/revokes tokens. Anon has **no** direct `boards` select. | `migrations/0008`, `DisplaysSection.tsx`, `DisplayRoute.tsx`, `session.ts`, `storage.ts` |
| **H1** | `game_acks` INSERT no longer `WITH CHECK (true)` — requires membership of the game's org. | `migrations/0008` |
| **H2** | Auth emails redirect to the production origin (`publicSiteUrl`), never localhost; password-recovery flow added. | `AuthProvider.tsx`, `RecoveryOverlay.tsx`, `product.ts` |
| **H3** | “Save Changes” shows success **only after the DB write actually succeeds**; on failure it keeps edits and shows the real error. | `storage.ts` (`saveNow`), `DashboardContext.tsx` (`commit`), `ScheduleEditorSection.tsx` |
| **H4** | Stripe webhook returns **HTTP 500** when the DB update fails, so Stripe retries instead of falsely acking. | `functions/stripe-webhook` |

---

## Deploy / apply steps (run where Supabase + Stripe are reachable)

The web app deploys automatically when the branch is pushed (Vercel). The
database migration, edge functions, and env vars must be applied by you — the
build sandbox cannot reach Supabase.

### 1. Database migration (once, on the **College** project)
Supabase → SQL Editor → paste **all** of `supabase/migrations/0008_security_hardening.sql` → Run.
It is additive/idempotent and deletes only the `audit-probe-%` test rows.

### 2. Edge functions (College project)
```bash
supabase functions deploy create-checkout
supabase functions deploy customer-portal
supabase functions deploy stripe-webhook   # --no-verify-jwt (verifies Stripe sig itself)
```
Function secrets required (already set if billing worked before):
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`,
`STRIPE_WEBHOOK_SECRET`, `PUBLIC_SITE_URL=https://pregameopscfb.app`.
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.)

### 3. Supabase Auth settings (H2)
Authentication → URL Configuration:
- **Site URL:** `https://pregameopscfb.app`
- **Redirect URLs:** add `https://pregameopscfb.app` (and `https://pregameopscfb.app/**`).

### 4. Vercel (College project) env — optional safeguard
`VITE_REQUIRE_AUTH=true` (belt-and-suspenders; enforcement no longer depends on
it). Redeploy after changing env.

### 5. Verify
```bash
SUPABASE_URL=https://wwpwjfrrywzmmbjintgp.supabase.co \
SUPABASE_ANON_KEY=sb_publishable_xxx \
node scripts/security-blackbox.mjs
```
Then the browser/session checks the script prints (T1, T5–T9).

---

## Notes / decisions
- **Entitlement applies to everyone, including owners**, when the org is not
  entitled — an expired org shouldn't run game day. Owners/admins reach
  `/billing` to reactivate; their data is preserved and returns on payment.
- `past_due` keeps access (grace, card-retry) with a warning banner; `canceled`
  keeps access until `current_period_end`, then locks.
- Board reads stay open to org members (so the operator preview and billing work)
  and to TVs (via the RPC); only **writes** carry the entitlement requirement.
