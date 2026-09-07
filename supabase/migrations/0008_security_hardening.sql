-- ===========================================================================
-- 0008 — Security hardening (GameDayOps College).
--
-- Closes the production-readiness gaps found in the security audit. ADDITIVE and
-- idempotent: it only tightens policies and adds one RPC. It does NOT drop or
-- modify any customer data (the single audit-probe row created for testing is
-- the sole deletion, and it is not customer data).
--
--   C4  Anonymous writes to public.boards are removed. Board writes now require
--       an authenticated member of a real org (org_id NOT NULL).
--   C3  Board writes additionally require an ACTIVE ENTITLEMENT (org_entitled),
--       so an expired org cannot modify game-day data even if the frontend gate
--       is bypassed. Reads stay open to members and to TV displays (via RPC), so
--       an expired org can still reach billing and its TVs can still show.
--   C7  A per-display token grants read-only access to exactly one org's board
--       through the SECURITY DEFINER display_board() RPC — anon has NO direct
--       select on boards, so a TV can't reach another org by changing the URL.
--   H1  game_acks INSERT no longer uses WITH CHECK (true); it requires the
--       caller be a member of the org that owns the game.
--
-- Run once on the College Supabase project only. NFL is a separate project and
-- is intentionally untouched.
-- ===========================================================================

-- --- C4 cleanup: remove the security-test probe row (not customer data) ------
delete from public.boards where id like 'audit-probe-%';

-- --- C3 + C4: lock down board writes ----------------------------------------
-- Read: members of the org may read their board. (TV displays read via the
-- display_board RPC below, which is SECURITY DEFINER, so no anon table select is
-- needed or granted.)
drop policy if exists boards_read on public.boards;
create policy boards_read on public.boards for select to authenticated
  using (org_id is not null and is_member(org_id));

-- Insert: authenticated member of a REAL org, and the org must be entitled.
drop policy if exists boards_write on public.boards;
create policy boards_write on public.boards for insert to authenticated
  with check (org_id is not null and is_member(org_id) and org_entitled(org_id));

-- Update: the existing row must belong to the caller's org (USING), and the org
-- must still be entitled to accept the new content (WITH CHECK).
drop policy if exists boards_update on public.boards;
create policy boards_update on public.boards for update to authenticated
  using (org_id is not null and is_member(org_id))
  with check (org_id is not null and is_member(org_id) and org_entitled(org_id));

-- No delete policy on boards → deletes are denied by default (RLS deny-all).

-- --- H1: game_acks writes must be by a member of the game's org --------------
drop policy if exists org_write on public.game_acks;
create policy org_write on public.game_acks for all to authenticated
  using (is_member((select g.org_id from public.games g where g.id = game_id)))
  with check (is_member((select g.org_id from public.games g where g.id = game_id)));

-- --- C7: read-only display access by opaque token ----------------------------
-- Returns ONLY the board state of the org that owns the given display token.
-- SECURITY DEFINER so an anonymous TV can call it with just the token; it can
-- reach no other org's data, and an unknown token yields NULL.
create or replace function public.display_board(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select b.state
  from public.displays d
  join public.boards b on b.id = 'org-' || d.org_id::text
  where d.token = p_token
  limit 1;
$$;

grant execute on function public.display_board(text) to anon, authenticated;

-- ===========================================================================
-- Post-conditions (what the app now relies on):
--   • Anonymous role can INSERT/UPDATE/SELECT nothing in public.boards.
--   • Only entitled org members can write their board; expired orgs are blocked
--     server-side (billing still reachable via the subscriptions read policy).
--   • A TV at /#/display/<token> reads exactly one org's board via display_board.
-- ===========================================================================
