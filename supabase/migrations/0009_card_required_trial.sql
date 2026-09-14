-- ===========================================================================
-- 0009 — Card-required trial (GameDayOps College).
--
-- New behavior: a brand-new organization does NOT receive a free trial until a
-- payment method is entered. On signup the org's subscription is seeded as
-- 'incomplete' (NOT entitled), so the app routes the user to billing. When they
-- complete Stripe Checkout (which now requires a card — see the create-checkout
-- function), Stripe creates a subscription with a 14-day trial and the webhook
-- flips the row to 'trialing' with the Stripe customer/subscription attached.
-- At trial end Stripe auto-charges the saved card; the webhook then moves the
-- row to 'active' (invoice.paid) or 'past_due' (invoice.payment_failed).
--
-- Idempotent and additive. Existing subscriptions are untouched (only the seed
-- for FUTURE orgs and the allowed-status list change).
-- ===========================================================================

-- Allow 'incomplete' as a status (the pre-card state for a new org).
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('incomplete','trialing','active','past_due','canceled','expired','suspended'));

-- New orgs seed as 'incomplete' (no trial yet, no entitlement) — the 14-day
-- trial begins only after Checkout attaches a card.
create or replace function public.seed_subscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (org_id, status, trial_ends_at)
  values (new.id, 'incomplete', null)
  on conflict (org_id) do nothing;
  return new;
end $$;

-- (Trigger on_org_created_seed_subscription from 0004 already calls this.)
