#!/usr/bin/env node
// GameDayOps College — production black-box security tests (Phase 7).
//
// Run this from an environment that can reach Supabase (the Claude sandbox
// blocks *.supabase.co, so it can't run there). It exercises the anonymous
// attack surface only — no secrets required beyond the PUBLIC anon key.
//
//   SUPABASE_URL=https://wwpwjfrrywzmmbjintgp.supabase.co \
//   SUPABASE_ANON_KEY=sb_publishable_xxx \
//   node scripts/security-blackbox.mjs
//
// Browser-driven tests (login redirect, cross-org isolation, entitlement gate)
// are listed at the end — do those manually or with Playwright against the live
// site; they need real user sessions.

const URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const ANON = process.env.SUPABASE_ANON_KEY || ''
if (!URL || !ANON) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY env vars first.')
  process.exit(2)
}

const results = []
const rec = (name, pass, detail) => results.push({ name, pass, detail })

// TEST 2 — anonymous INSERT into public.boards must be denied by RLS.
{
  const res = await fetch(`${URL}/rest/v1/boards`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ id: `attack-${Date.now()}`, org_id: null, state: { x: 1 } }),
  })
  rec('T2 anon INSERT boards blocked', res.status === 401 || res.status === 403, `HTTP ${res.status} (want 401/403, must NOT be 201)`)
}

// TEST 2b — anonymous SELECT from public.boards must return no rows.
{
  const res = await fetch(`${URL}/rest/v1/boards?select=id&limit=5`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  })
  let rows = []
  try { rows = await res.json() } catch { /* */ }
  const empty = Array.isArray(rows) && rows.length === 0
  rec('T2b anon SELECT boards returns nothing', res.status === 200 && empty || res.status === 401 || res.status === 403, `HTTP ${res.status} rows=${Array.isArray(rows) ? rows.length : 'n/a'}`)
}

// TEST 3 — create-checkout without a JWT must be rejected.
{
  const res = await fetch(`${URL}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ interval: 'monthly', orgId: '00000000-0000-0000-0000-000000000000' }),
  })
  rec('T3 create-checkout requires auth', res.status === 401, `HTTP ${res.status} (want 401)`)
}

// TEST 4 — customer-portal without a JWT must be rejected.
{
  const res = await fetch(`${URL}/functions/v1/customer-portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ orgId: '00000000-0000-0000-0000-000000000000' }),
  })
  rec('T4 customer-portal requires auth', res.status === 401, `HTTP ${res.status} (want 401)`)
}

// TEST 10 — display_board with a bogus token must reveal nothing.
{
  const res = await fetch(`${URL}/rest/v1/rpc/display_board`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: `bogus-${Date.now()}` }),
  })
  let val = null
  try { val = await res.json() } catch { /* */ }
  rec('T10 bogus display token reveals nothing', res.ok && (val === null || val === undefined), `HTTP ${res.status} value=${JSON.stringify(val)?.slice(0, 40)}`)
}

console.log('\nGameDayOps College — anonymous attack-surface tests\n' + '='.repeat(52))
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}\n        ${r.detail}`)
const failed = results.filter((r) => !r.pass)
console.log('\n' + (failed.length ? `${failed.length} FAILED` : 'ALL ANONYMOUS-SURFACE TESTS PASSED'))
console.log(`
Browser/session tests to run manually against https://pregameopscfb.app :
  T1  Logged out → open /#/admin  → should land on the sign-in screen.
  T5  Sign in as User A → cannot read Org B's board (RLS): every boards row
      returned must belong to A's org.
  T6  Expired/no-entitlement account → app routes redirect to /#/billing.
  T7  Active trial account → full app access.
  T8  Active paid account → full app access.
  T9  Open a real display URL from Admin → TV Displays → correct board shows.
`)
process.exit(failed.length ? 1 : 0)
