-- ═════════════════════════════════════════════════════════════════
-- Kindness journal — "small acts of kindness" redesign (2026-08-11)
--
-- Adds the generalized KindnessAction concept alongside the existing
-- compliments system (which is untouched):
--   • kindness_acts table      — one row per logged act
--   • log_kindness_act RPC     — insert + advance user_streaks atomically
--   • set_kindness_note RPC    — attach/update the optional reflection
--
-- Paste this whole file into the Supabase SQL editor and run it once.
-- The app works local-only until this is applied, then starts syncing
-- automatically — no app update coordination needed.
-- ═════════════════════════════════════════════════════════════════

-- ── Table ────────────────────────────────────────────────────────
create table if not exists public.kindness_acts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  action_id   text not null default '',          -- library slug ('' = custom)
  title       text not null,
  emoji       text not null default '🌻',
  category    text not null default 'small-things',
  note        text,                              -- optional user reflection
  source      text not null default 'custom',    -- daily | random | explore | custom
  acted_on    date not null,                     -- user's LOCAL calendar day
  created_at  timestamptz not null default now()
);

create index if not exists kindness_acts_user_day
  on public.kindness_acts (user_id, acted_on desc);

alter table public.kindness_acts enable row level security;

drop policy if exists "kindness_select_own" on public.kindness_acts;
create policy "kindness_select_own" on public.kindness_acts
  for select using (auth.uid() = user_id);

drop policy if exists "kindness_insert_own" on public.kindness_acts;
create policy "kindness_insert_own" on public.kindness_acts
  for insert with check (auth.uid() = user_id);

drop policy if exists "kindness_update_own" on public.kindness_acts;
create policy "kindness_update_own" on public.kindness_acts
  for update using (auth.uid() = user_id);

-- ── log_kindness_act ─────────────────────────────────────────────
-- Inserts the act and advances user_streaks the same way a compliment
-- does: same-day logs don't double-count, consecutive days increment,
-- a gap resets to 1 — unless a streak freeze covers exactly the missed
-- day (mirrors the freeze behavior of the compliment flow; wrapped
-- defensively in case the streak_freezes table differs/doesn't exist).
create or replace function public.log_kindness_act(
  p_action_id  text,
  p_title      text,
  p_emoji      text,
  p_category   text,
  p_note       text,
  p_source     text,
  p_local_date date
) returns table (id uuid, current_streak integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_id         uuid;
  v_prev_last  date;
  v_prev_curr  integer;
  v_new_curr   integer;
  v_bridged    boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'A kindness needs a title';
  end if;

  insert into kindness_acts (user_id, action_id, title, emoji, category, note, source, acted_on)
  values (
    v_uid,
    coalesce(p_action_id, ''),
    trim(p_title),
    coalesce(nullif(p_emoji, ''), '🌻'),
    coalesce(nullif(p_category, ''), 'small-things'),
    nullif(trim(coalesce(p_note, '')), ''),
    coalesce(nullif(p_source, ''), 'custom'),
    coalesce(p_local_date, current_date)
  )
  returning kindness_acts.id into v_id;

  -- ── Streak update ──
  select us.last_completed_on, us.current_streak
    into v_prev_last, v_prev_curr
    from user_streaks us
   where us.user_id = v_uid;

  if not found then
    insert into user_streaks (user_id, current_streak, last_completed_on)
    values (v_uid, 1, p_local_date)
    on conflict (user_id) do nothing;
    v_new_curr := 1;
  elsif v_prev_last is not distinct from p_local_date then
    v_new_curr := coalesce(v_prev_curr, 1);          -- already counted today
  elsif v_prev_last = p_local_date - 1 then
    v_new_curr := coalesce(v_prev_curr, 0) + 1;      -- consecutive day
  elsif v_prev_last = p_local_date - 2 then
    -- One full day missed: honor a streak freeze on the gap day if the
    -- freezes table exists and has one recorded.
    begin
      select exists (
        select 1 from streak_freezes sf
         where sf.user_id = v_uid
           and sf.used_on = p_local_date - 1
      ) into v_bridged;
    exception when undefined_table or undefined_column then
      v_bridged := false;
    end;
    v_new_curr := case when v_bridged then coalesce(v_prev_curr, 0) + 1 else 1 end;
  else
    v_new_curr := 1;                                 -- longer gap → reset
  end if;

  update user_streaks us
     set current_streak    = v_new_curr,
         last_completed_on = greatest(coalesce(us.last_completed_on, p_local_date), p_local_date)
   where us.user_id = v_uid;

  return query select v_id, v_new_curr;
end;
$$;

grant execute on function public.log_kindness_act(text, text, text, text, text, text, date) to authenticated;

-- ── set_kindness_note ────────────────────────────────────────────
create or replace function public.set_kindness_note(
  p_id   uuid,
  p_note text
) returns void
language sql
security definer
set search_path = public
as $$
  update kindness_acts
     set note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_id
     and user_id = auth.uid();
$$;

grant execute on function public.set_kindness_note(uuid, text) to authenticated;

-- ── Notes for the future (not executed) ──────────────────────────
-- • Longest-streak / best-day columns: user_streaks already carries the
--   fields the compliment flow maintains; if you later add a
--   longest_streak column, extend the update above the same way.
-- • Premium ideas, themed packs, workplace kindness campaigns: model as
--   a `kindness_packs` table + `pack_id` column here — the app's library
--   loader is already data-driven, so no client rearchitecture needed.
