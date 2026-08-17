-- ===========================================================================
-- GameDayOps platform — product scoping + billing readiness (Track B).
--
-- Extends the existing multi-tenant schema (0001_init) for commercial SaaS:
--   • product_type on organizations (NFL vs COLLEGE_FOOTBALL — one org per app)
--   • subscriptions (plan/status/limits + Stripe ids) — Stripe-ready, no keys
-- No payment provider is connected here; this is the shape a Stripe webhook and
-- the app read/write. Run in the same Supabase project used by cloud mode.
-- ===========================================================================

-- One organization belongs to exactly one product universe.
alter table if exists organizations
  add column if not exists product_type text not null default 'COLLEGE_FOOTBALL'
    check (product_type in ('NFL', 'COLLEGE_FOOTBALL'));

-- Per-organization subscription (populated by the app + a future Stripe webhook).
create table if not exists subscriptions (
  org_id                 uuid primary key references organizations(id) on delete cascade,
  plan                   text not null default 'free'
                           check (plan in ('free','pro','team','enterprise')),
  status                 text not null default 'trialing'
                           check (status in ('trialing','active','past_due','canceled','expired')),
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  -- Stripe identifiers — set once billing is connected (never store secret keys here).
  stripe_customer_id     text,
  stripe_subscription_id text,
  -- Provisioned limits (null = unlimited); default to the plan's limits in app code.
  max_displays           int,
  max_users              int,
  updated_at             timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- Members can read their org's subscription; only admins/owners change it
-- (server-side/Stripe webhook uses the service role and bypasses RLS).
create policy sub_read  on subscriptions for select to authenticated
  using (is_member(org_id));
create policy sub_write on subscriptions for all to authenticated
  using (is_admin(org_id)) with check (is_admin(org_id));

-- Every new organization starts on a free/trial subscription.
create or replace function seed_subscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (org_id, plan, status, trial_ends_at)
  values (new.id, 'free', 'trialing', now() + interval '14 days')
  on conflict (org_id) do nothing;
  return new;
end $$;

drop trigger if exists on_org_created_seed_subscription on organizations;
create trigger on_org_created_seed_subscription
  after insert on organizations
  for each row execute function seed_subscription();
