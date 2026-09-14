-- ===========================================================================
-- Pre-Game Operations Platform — initial Postgres schema (Supabase)
--
-- Multi-tenant SaaS: every tenant-owned row carries org_id, and Row-Level
-- Security restricts access to members of that organization. `teams` is a
-- shared reference table (the 32 NFL clubs) that all orgs can read; per-org
-- brand overrides and uploaded assets live in org-scoped tables.
--
-- Roles: admin (full control), operator (run game day), viewer/display
-- (read-only, used by TV kiosks via a scoped display token).
-- ===========================================================================

create extension if not exists "pgcrypto";

-- --- Reference: NFL teams (shared, read-only to all authenticated users) ----
create table if not exists teams (
  id            text primary key,          -- 'BUF'
  name          text not null,             -- 'Buffalo Bills'
  location      text not null,
  nickname      text not null,
  abbr          text not null,
  conference    text not null check (conference in ('AFC','NFC')),
  division      text not null check (division in ('East','North','South','West')),
  primary_color   text not null,
  secondary_color text not null,
  accent_color    text not null,
  text_color      text not null default '#FFFFFF',
  created_at    timestamptz not null default now()
);

-- --- Organizations (tenants) -----------------------------------------------
create table if not exists organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  team_id       text references teams(id),  -- the club this org operates as
  created_at    timestamptz not null default now()
);

-- --- Membership: which auth users belong to which org, and their role ------
create table if not exists memberships (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'operator' check (role in ('admin','operator','viewer')),
  created_at    timestamptz not null default now(),
  unique (org_id, user_id)
);

-- --- Per-org team brand overrides + uploaded (licensed) assets --------------
create table if not exists team_brand_overrides (
  org_id            uuid not null references organizations(id) on delete cascade,
  team_id           text not null references teams(id),
  primary_color     text,
  secondary_color   text,
  accent_color      text,
  primary_logo_url    text,
  secondary_logo_url  text,
  wordmark_url        text,
  background_asset_url text,
  updated_at        timestamptz not null default now(),
  primary key (org_id, team_id)
);

-- --- Schedules (reusable templates) + their events -------------------------
create table if not exists schedules (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  name          text not null,
  kind          text not null default 'custom'
                  check (kind in ('regular','preseason','playoffs','primetime','international','custom')),
  description   text,
  is_template   boolean not null default true,
  updated_at    timestamptz not null default now()
);

create table if not exists schedule_events (
  id              uuid primary key default gen_random_uuid(),
  schedule_id     uuid not null references schedules(id) on delete cascade,
  label           text not null,
  note            text,
  t_minus_seconds int not null,             -- seconds before kickoff
  is_kickoff      boolean not null default false,
  sort_order      int not null default 0
);

-- --- Games (a live event that runs a schedule) -----------------------------
create table if not exists games (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  team_id       text not null references teams(id),
  opponent_id   text references teams(id),
  opponent_name text,
  week          text,
  game_type     text default 'regular',
  home_away     text not null default 'HOME' check (home_away in ('HOME','AWAY')),
  location      text,
  timezone      text not null default 'America/New_York',
  kickoff_at    timestamptz not null,       -- absolute UTC instant (authoritative)
  schedule_id   uuid references schedules(id),
  is_active     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Live per-game event acknowledgements (so a "GO" ack syncs to every TV).
create table if not exists game_acks (
  game_id       uuid not null references games(id) on delete cascade,
  event_id      uuid not null references schedule_events(id) on delete cascade,
  acked_at      timestamptz not null default now(),
  primary key (game_id, event_id)
);

-- --- Displays (registered TVs) ---------------------------------------------
create table if not exists displays (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  name          text not null,             -- 'Display 01'
  location      text,                      -- 'Turf Area'
  token         text not null unique default encode(gen_random_bytes(16),'hex'),
  active_game_id uuid references games(id),
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- --- Culture graphics + quotes (org-scoped) --------------------------------
create table if not exists culture_graphics (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  name          text not null,
  src_url       text not null,             -- Supabase Storage URL
  enabled       boolean not null default true,
  sort_order    int not null default 0,
  duration_sec  int,
  matte         text not null default 'none' check (matte in ('none','light'))
);

create table if not exists quotes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  text          text not null,
  author        text,
  accent        text not null default 'white' check (accent in ('royal','red','white')),
  enabled       boolean not null default true,
  sort_order    int not null default 0
);

-- --- Alert / display settings (per org) ------------------------------------
create table if not exists alert_settings (
  org_id            uuid primary key references organizations(id) on delete cascade,
  sound_enabled     boolean not null default true,
  volume            real not null default 0.6,
  colorblind_mode   boolean not null default false,
  culture_rotation_sec int not null default 25,
  culture_transition   text not null default 'fade',
  go_window_sec     int not null default 20,
  updated_at        timestamptz not null default now()
);

-- --- Audit log -------------------------------------------------------------
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  user_id     uuid references auth.users(id),
  action      text not null,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table organizations       enable row level security;
alter table memberships          enable row level security;
alter table team_brand_overrides enable row level security;
alter table schedules            enable row level security;
alter table schedule_events      enable row level security;
alter table games                enable row level security;
alter table game_acks            enable row level security;
alter table displays             enable row level security;
alter table culture_graphics     enable row level security;
alter table quotes               enable row level security;
alter table alert_settings       enable row level security;
alter table audit_logs           enable row level security;
alter table teams                enable row level security;

-- Everyone authenticated can read the shared NFL team reference table.
create policy teams_read on teams for select to authenticated using (true);

-- Helper: is the current user a member of :org_id ?
create or replace function is_member(target_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function is_admin(target_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Generic org-scoped policies (members read; admins/operators write).
-- Applied to each tenant table with an org_id column.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'schedules','schedule_events_via_schedule','games','game_acks',
    'displays','culture_graphics','quotes','alert_settings',
    'team_brand_overrides','audit_logs'
  ] loop
    -- schedule_events is handled separately (it has no org_id column).
    null;
  end loop;
end $$;

-- Org tables with a direct org_id column:
create policy org_read  on schedules            for select to authenticated using (is_member(org_id));
create policy org_write on schedules            for all    to authenticated using (is_member(org_id)) with check (is_member(org_id));
create policy org_read  on games                for select to authenticated using (is_member(org_id));
create policy org_write on games                for all    to authenticated using (is_member(org_id)) with check (is_member(org_id));
create policy org_read  on displays             for select to authenticated using (is_member(org_id));
create policy org_write on displays             for all    to authenticated using (is_member(org_id)) with check (is_member(org_id));
create policy org_read  on culture_graphics     for select to authenticated using (is_member(org_id));
create policy org_write on culture_graphics     for all    to authenticated using (is_member(org_id)) with check (is_member(org_id));
create policy org_read  on quotes               for select to authenticated using (is_member(org_id));
create policy org_write on quotes               for all    to authenticated using (is_member(org_id)) with check (is_member(org_id));
create policy org_read  on alert_settings       for select to authenticated using (is_member(org_id));
create policy org_write on alert_settings       for all    to authenticated using (is_member(org_id)) with check (is_member(org_id));
create policy org_read  on team_brand_overrides for select to authenticated using (is_member(org_id));
create policy org_write on team_brand_overrides for all    to authenticated using (is_member(org_id)) with check (is_member(org_id));
create policy org_read  on game_acks            for select to authenticated using (is_member((select org_id from games g where g.id = game_id)));
create policy org_write on game_acks            for all    to authenticated using (is_member((select org_id from games g where g.id = game_id))) with check (true);
create policy org_read  on audit_logs           for select to authenticated using (is_member(org_id));

-- schedule_events: scoped through its parent schedule's org.
create policy se_read  on schedule_events for select to authenticated
  using (is_member((select org_id from schedules s where s.id = schedule_id)));
create policy se_write on schedule_events for all to authenticated
  using (is_member((select org_id from schedules s where s.id = schedule_id)))
  with check (is_member((select org_id from schedules s where s.id = schedule_id)));

-- organizations + memberships: members can read their own org.
create policy org_self_read on organizations for select to authenticated using (is_member(id));
create policy mem_self_read on memberships   for select to authenticated using (user_id = auth.uid() or is_admin(org_id));

-- Realtime: add the live tables to the supabase_realtime publication so every
-- TV receives instant updates when the schedule, game, or acks change.
alter publication supabase_realtime add table games, schedules, schedule_events, game_acks, culture_graphics, quotes, alert_settings;
