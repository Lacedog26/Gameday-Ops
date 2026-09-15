# GameDayOps College — Backend Setup (your manual steps)

Everything below is **your** action — I can't access your Supabase/Stripe/Vercel.
None of it is done automatically, and nothing charges you without your clicks.

## 1. Supabase — plan & cost decision  ⚠️ money
- **Free tier works to start** (limits + projects pause after ~1 week idle).
- **Pro is $25/month** (no pausing, more capacity) — recommended once you have real
  customers, **not required yet**. Official pricing: https://supabase.com/pricing
- **Do not upgrade until you decide.** I have not enabled anything paid.

## 2. Run the migrations (free)
Supabase Dashboard → **SQL Editor** → run each file in its OWN query, in order.
Skip 0002 and 0003 — those seed NFL data and aren't used by College.
1. `supabase/migrations/0001_init.sql` (the shared multi-tenant schema)
2. `supabase/migrations/0004_billing_multitenant.sql`
3. `supabase/migrations/0005_college_production.sql`  (creates the `team-assets` Storage bucket too)
4. `supabase/migrations/0006_org_boards.sql`  (per-org board isolation + the `bootstrap_org` login function)
5. `supabase/migrations/0007_billing_stripe_columns.sql`  (Stripe columns on `subscriptions`)
6. `supabase/migrations/0008_security_hardening.sql`  ⚠️ **required for security** — locks down board writes to entitled members, fixes `game_acks` cross-org inserts, and adds the token-scoped `display_board` function for TVs
7. `supabase/migrations/0009_card_required_trial.sql`  (seeds new orgs as `incomplete` so the card-required trial starts only after Stripe Checkout)

**Run through 0009 — do not stop at 0006.** 0008 is what actually enforces
per-org isolation and blocks anonymous board writes; skipping it leaves the app
materially less secure. 0009 is what makes the trial card-required. After 0009,
real accounts work: signing in creates your org, and after adding a card in
Checkout you get a 14-day trial; edits save to your own RLS-isolated board.

## 3. Enable Auth (free)
Dashboard → **Authentication → Providers → Email**: ensure it's **on**.
For instant testing, **turn OFF "Confirm email"** (Authentication → settings) so signups
work without an inbox round-trip. Turn it back on for production.

## 4. Login gate — already on for College
The College app enforces sign-in **by default** (it ships with `requireAuth: true`),
so no env var is needed: a logged-out visitor sees the marketing page, and the app,
admin, and billing require an account. Entitlement (trial/subscription) is enforced
both client-side and by row-level security (migration 0008). The TV display stays
public via its per-display token. (`VITE_REQUIRE_AUTH=true` exists only as a
safeguard for other builds; it is redundant here.)

## 5. Stripe (only when you want to charge)  ⚠️ account required
1. Create a Stripe account: https://dashboard.stripe.com/register  (free to create)
2. Create **one Product named exactly `GameDayOps College`** (this name appears on
   the customer's Checkout page and card statement — make sure it is NOT left as
   "Pregame Ops- Project"), with **two recurring Prices**:
   - **$5.99 / month**
   - **$60.00 / year**
   Copy each Price ID (`price_...`). Also set a clear statement descriptor under
   **Settings → Business → Public details**.
3. Deploy all three functions (free):
   `supabase functions deploy create-checkout`,
   `supabase functions deploy customer-portal`, and
   `supabase functions deploy stripe-webhook --no-verify-jwt`.
4. Set function secrets (never in the repo):
   ```
   supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_PRICE_MONTHLY=price_... \
     STRIPE_PRICE_ANNUAL=price_... STRIPE_WEBHOOK_SECRET=whsec_... PUBLIC_SITE_URL=https://pregameopscfb.app \
     SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=https://<your-project>.supabase.co
   ```
5. Add a Stripe **webhook** to the `stripe-webhook` function URL for
   `customer.subscription.*` events; paste its signing secret as `STRIPE_WEBHOOK_SECRET`.

**Never commit secret keys.** The repo only ever reads them from env at runtime.

## 6. Deploy
College Vercel project → **Redeploy** (production branch `monorepo-college`, root dir empty),
confirm `pregameopscfb.app` is attached. NFL project/domain untouched.

---
**Status:** the schema, auth UI, billing model, and Stripe function stubs are in the repo.
They go live only after steps 2–6 above. I did not run any of them.
