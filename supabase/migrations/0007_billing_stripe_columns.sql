-- ===========================================================================
-- 0007 — Extra Stripe columns on subscriptions (idempotent).
--
-- The webhook (supabase/functions/stripe-webhook) writes the active price and
-- cancel-at-period-end so the admin Billing panel can show plan + pending
-- cancellation. Safe to run anytime; add-column-if-not-exists is a no-op if the
-- columns already exist.
-- ===========================================================================

alter table if exists public.subscriptions
  add column if not exists stripe_price_id text;

alter table if exists public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;
