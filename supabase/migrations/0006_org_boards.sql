-- ===========================================================================
-- 0006 — Multi-tenant board state + org bootstrap.
--
-- Turns the schema into a working multi-tenant product. Two pieces:
--
--   1. `boards` — the whole AppState as one JSON blob, but now scoped to an org
--      so every customer's data is isolated by RLS. A public/demo board
--      (org_id IS NULL) stays readable+writable by anyone so the un-gated demo
--      and TV displays keep working exactly as they do today.
--
--   2. `bootstrap_org()` — a SECURITY DEFINER function the app calls once right
--      after login. It creates the caller's organization + an `admin` membership
--      atomically (there are intentionally no INSERT policies on organizations /
--      memberships, so this is the only sanctioned path). The 14-day trial is
--      seeded by the existing on_org_created_seed_subscription trigger (0004).
--
-- Safe to run on a project that already has 0003's open `boards` table: the
-- columns/policies are added idempotently and the old open policies are dropped.
-- Does NOT touch NFL: NFL runs on a separate project and never calls bootstrap.
-- ===========================================================================

-- --- Board state, org-scoped -----------------------------------------------
create table if not exists public.boards (
  id          text primary key,          -- 'org-<uuid>' for a tenant, or a public/demo id
  org_id      uuid references public.organizations(id) on delete cascade,
  state       jsonb not null,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

-- If the table pre-existed (0003), make sure the org column is present.
alter table public.boards
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

-- Integrity: a tenant board's id must equal 'org-<its own org_id>'. This stops a
-- member from writing a row whose org_id is their org but whose id (the PK)
-- targets another tenant's board. Public/demo boards (org_id NULL) are exempt.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'boards_id_matches_org'
  ) then
    alter table public.boards
      add constraint boards_id_matches_org
      check (org_id is null or id = 'org-' || org_id::text);
  end if;
end $$;

alter table public.boards enable row level security;

-- Read: anyone may read a public/demo board; members read their org board.
drop policy if exists boards_read on public.boards;
create policy boards_read on public.boards for select to anon, authenticated
  using (org_id is null or is_member(org_id));

-- Insert: public/demo boards open (preserves the no-login demo); org boards
-- only by their own members.
drop policy if exists boards_write on public.boards;
create policy boards_write on public.boards for insert to anon, authenticated
  with check (org_id is null or is_member(org_id));

-- Update: same. The USING clause checks the EXISTING row's org, so a member can
-- never update another tenant's board.
drop policy if exists boards_update on public.boards;
create policy boards_update on public.boards for update to anon, authenticated
  using (org_id is null or is_member(org_id))
  with check (org_id is null or is_member(org_id));

-- Realtime needs the whole new row so every TV in an org live-syncs.
alter table public.boards replica identity full;
do $$
begin
  begin
    alter publication supabase_realtime add table public.boards;
  exception when duplicate_object then null;
  end;
end $$;

-- --- Org bootstrap ----------------------------------------------------------
-- Idempotent: returns the caller's existing org, or creates one (org + admin
-- membership) and returns it. Runs as definer to bypass the (absent) insert
-- policies; every write is still tied to auth.uid().
create or replace function public.bootstrap_org(product text default 'COLLEGE_FOOTBALL')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing uuid;
  new_org  uuid;
  email    text;
  label    text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Already a member of an org? Return the first one.
  select m.org_id into existing
  from memberships m
  where m.user_id = auth.uid()
  order by m.created_at asc
  limit 1;
  if existing is not null then
    return existing;
  end if;

  -- Derive a friendly org name from the email local-part.
  select u.email into email from auth.users u where u.id = auth.uid();
  label := coalesce(nullif(split_part(coalesce(email, ''), '@', 1), ''), 'My');

  insert into organizations (name, product_type)
  values (label || '''s Program', product)
  returning id into new_org;

  insert into memberships (org_id, user_id, role)
  values (new_org, auth.uid(), 'admin');

  return new_org;
end $$;

grant execute on function public.bootstrap_org(text) to authenticated;
