-- ===========================================================================
-- GameDayOps College — production storage + master schedule + culture phrase.
-- Builds on 0001_init (orgs/memberships/roles/branding/schedules/events/games/
-- displays/culture_graphics/quotes/alert_settings/audit_logs + RLS).
-- ===========================================================================

-- Culture graphics carry an optional short phrase (the team saying).
alter table if exists culture_graphics add column if not exists phrase text;
alter table if exists culture_graphics add column if not exists team_id text;

-- Team branding: ensure background color + text color exist alongside assets.
alter table if exists team_brand_overrides add column if not exists background_color text;
alter table if exists team_brand_overrides add column if not exists text_color text;

-- Shared MASTER schedule (imported from CFBD; read-only reference for all orgs).
create table if not exists master_games (
  id            text primary key,             -- e.g. 'TEX-2025-regular-2-<cfbdid>'
  season        int not null,
  team_id       text not null,
  phase         text not null default 'regular',
  week          int not null default 0,
  week_label    text,
  date          text,                          -- ET 'YYYY-MM-DD' ('' = TBD)
  time          text,                          -- ET 'HH:MM' ('' = TBD)
  opponent_id   text,
  opponent_name text,
  home_away     text not null default 'HOME' check (home_away in ('HOME','AWAY')),
  venue         text,
  status        text not null default 'scheduled',
  conference_game boolean,
  updated_at    timestamptz not null default now()
);
alter table master_games enable row level security;
create policy master_read on master_games for select to authenticated using (true);
-- Master data is loaded by an admin/importer via the service role (bypasses RLS).

-- Per-ORG schedule overrides (never mutate master_games).
create table if not exists game_overrides (
  org_id       uuid not null references organizations(id) on delete cascade,
  master_id    text not null references master_games(id) on delete cascade,
  date         text,
  time         text,
  timezone     text,
  venue        text,
  status       text,
  home_away    text,
  week_label   text,
  updated_at   timestamptz not null default now(),
  primary key (org_id, master_id)
);
alter table game_overrides enable row level security;
create policy ovr_read  on game_overrides for select to authenticated using (is_member(org_id));
create policy ovr_write on game_overrides for all    to authenticated using (is_member(org_id)) with check (is_member(org_id));

-- 'last updated' for the Schedule Center, per season.
create table if not exists schedule_meta (
  season      int primary key,
  last_updated timestamptz not null default now(),
  source      text
);
alter table schedule_meta enable row level security;
create policy meta_read on schedule_meta for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage: a private bucket for org-uploaded assets (logos, culture graphics).
-- Path convention: <org_id>/<filename>. RLS restricts to org members.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('team-assets', 'team-assets', false)
on conflict (id) do nothing;

create policy "team-assets read"  on storage.objects for select to authenticated
  using (bucket_id = 'team-assets' and is_member((split_part(name, '/', 1))::uuid));
create policy "team-assets write" on storage.objects for insert to authenticated
  with check (bucket_id = 'team-assets' and is_member((split_part(name, '/', 1))::uuid));
create policy "team-assets update" on storage.objects for update to authenticated
  using (bucket_id = 'team-assets' and is_member((split_part(name, '/', 1))::uuid));
create policy "team-assets delete" on storage.objects for delete to authenticated
  using (bucket_id = 'team-assets' and is_member((split_part(name, '/', 1))::uuid));
