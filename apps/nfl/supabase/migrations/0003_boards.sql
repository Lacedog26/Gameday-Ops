-- ===========================================================================
-- 0003 — Live board sync table (interim, pre-auth).
--
-- Stores the whole board state as one JSON row and broadcasts every change over
-- Supabase Realtime, so one admin edit updates every connected TV instantly.
--
-- NOTE ON SECURITY (interim): this table allows the public `anon` role to read
-- and write, which is what lets TVs and the admin sync without a login yet.
-- This is fine for a single-organization, in-facility deployment. Phase 5 locks
-- writes behind Supabase Auth (admin/operator) using the RLS already defined in
-- 0001; viewers/displays stay read-only. Until then, treat the board URL as
-- internal.
-- ===========================================================================

create table if not exists boards (
  id          text primary key,
  state       jsonb not null,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

alter table boards enable row level security;

-- Interim open policies (anon + authenticated). Tighten in Phase 5.
drop policy if exists boards_read on boards;
create policy boards_read  on boards for select to anon, authenticated using (true);

drop policy if exists boards_write on boards;
create policy boards_write on boards for insert to anon, authenticated with check (true);

drop policy if exists boards_update on boards;
create policy boards_update on boards for update to anon, authenticated using (true) with check (true);

-- Realtime needs the full new row on updates.
alter table boards replica identity full;

-- Broadcast board changes to subscribed clients (ignore if already added).
do $$
begin
  begin
    alter publication supabase_realtime add table boards;
  exception when duplicate_object then null;
  end;
end $$;
