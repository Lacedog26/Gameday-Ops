# GameDayOps College — Backend Setup (your manual steps)

Everything below is **your** action — I can't access your Supabase/Stripe/Vercel.
None of it is done automatically, and nothing charges you without your clicks.

## 1. Supabase — plan & cost decision  ⚠️ money
- **Free tier works to start** (limits + projects pause after ~1 week idle).
- **Pro is $25/month** (no pausing, more capacity) — recommended once you have real
  customers, **not required yet**. Official pricing: https://supabase.com/pricing
- **Do not upgrade until you decide.** I have not enabled anything paid.

## 2. Run the migrations (free)
Supabase Dashboard → **SQL Editor** → run these in order (paste each file):
1. `apps/nfl/supabase/migrations/0001_init.sql` (the shared multi-tenant schema)
2. `supabase/migrations/0004_billing_multitenant.sql`
3. `supabase/migrations/0005_college_production.sql`  (creates the `team-assets` Storage bucket too)

## 3. Enable Auth (free)
Dashboard → **Authentication → Providers → Email**: ensure it's **on**.
For instant testing, **turn OFF "Confirm email"** (Authentication → settings) so signups
work without an inbox round-trip. Turn it back on for production.

## 4. Turn on the login gate (when ready)
In the College **Vercel** project → Settings → Environment Variables, add:
```
VITE_REQUIRE_AUTH = true
```
Until you set this, the admin stays open (so your demo isn't locked). With it on,
`/#/admin` requires sign-in; the board and TV display stay public.

## 5. Stripe (only when you want to charge)  ⚠️ account required
1. Create a Stripe account: https://dashboard.stripe.com/register  (free to create)
2. Create **two recurring Prices** on one Product ("GameDayOps College"):
   - **$5.99 / month**
   - **$59.99 / year**
   Copy each Price ID (`price_...`).
3. Deploy the functions (free): `supabase functions deploy create-checkout` and
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
