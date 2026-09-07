-- ===========================================================================
-- GameDayOps platform — product scoping + billing (Track B). NO payment here.
--
-- ONE simple plan (per product direction): $5.99/mo or $59.99/yr, 14-day trial.
-- A Stripe webhook (see supabase/functions) updates status/period. Secret keys
-- live only in function env vars — never in the database or the repo.
-- ===========================================================================

alter table if exists organizations
  add column if not exists product_type text not null default 'COLLEGE_FOOTBALL'
    check (product_type in ('NFL', 'COLLEGE_FOOTBALL'));

create table if not exists subscriptions (
  org_id                 uuid primary key references organizations(id) on delete cascade,
  status                 text not null default 'trialing'
                           check (status in ('trialing','active','past_due','canceled','expired','suspended')),
  billing_interval       text check (billing_interval in ('monthly','annual')),
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  updated_at             timestamptz not null default now()
);

alter table subscriptions enable row level security;
create policy sub_read  on subscriptions for select to authenticated using (is_member(org_id));
create policy sub_write on subscriptions for all    to authenticated using (is_admin(org_id)) with check (is_admin(org_id));

-- Every new org starts on a 14-day free trial.
create or replace function seed_subscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (org_id, status, trial_ends_at)
  values (new.id, 'trialing', now() + interval '14 days')
  on conflict (org_id) do nothing;
  return new;
end $$;

drop trigger if exists on_org_created_seed_subscription on organizations;
create trigger on_org_created_seed_subscription
  after insert on organizations for each row execute function seed_subscription();

-- Entitlement helper the app/API can call.
create or replace function org_entitled(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions s where s.org_id = target
      and (s.status = 'active'
        or (s.status = 'trialing' and coalesce(s.trial_ends_at, now()) > now()))
  );
$$;
