import type { NflGame } from '@gamedayops/core'

// ---------------------------------------------------------------------------
// GameDayOps College Football — schedule library.
//
// IMPORTANT: this is a small DEMONSTRATION schedule, not a verified 2026 slate.
// Real, authoritative college schedules are loaded in Phase 3 via the
// CollegeFootballData import (see SCHEDULE_IMPORT.md). To avoid fabricating
// data, kickoff times here are left TBD (status 'time_tbd') rather than invented
// — the board renders "TBD" for these until a real time is imported or an admin
// edits it. The live countdown demo is driven by the seeded default game (see
// lib/defaults.ts), independent of this library.
// ---------------------------------------------------------------------------

export const CURRENT_SEASON = 2026
export const AVAILABLE_SEASONS = [2026]

/** Last time this product's schedule data was refreshed (demo seed). */
export const SCHEDULE_LAST_UPDATED = '2026-08-13 (demo seed — pending CFBD import)'

// A few Texas demonstration games. Opponents are illustrative; times are TBD by
// design (not fabricated). weekLabel/venue shown as known; edit or import later.
const TEX_2026: NflGame[] = [
  g('TEX-2026-reg-1', 1, 'OSU', 'Ohio State', 'AWAY', 'Ohio Stadium — Columbus, OH'),
  g('TEX-2026-reg-2', 2, undefined, 'San Jose State', 'HOME', 'DKR–Texas Memorial Stadium'),
  g('TEX-2026-reg-3', 3, undefined, 'UTEP', 'HOME', 'DKR–Texas Memorial Stadium'),
  g('TEX-2026-reg-4', 4, undefined, 'Sam Houston', 'HOME', 'DKR–Texas Memorial Stadium'),
  g('TEX-2026-reg-5', 5, 'OU', 'Oklahoma', 'AWAY', 'Cotton Bowl — Dallas, TX (Red River)'),
  g('TEX-2026-reg-6', 6, 'GA', 'Georgia', 'HOME', 'DKR–Texas Memorial Stadium'),
  g('TEX-2026-reg-7', 7, 'TAMU', 'Texas A&M', 'AWAY', 'Kyle Field — College Station, TX'),
]

function g(
  id: string,
  week: number,
  opponentId: string | undefined,
  opponentName: string,
  homeAway: 'HOME' | 'AWAY',
  venue: string,
): NflGame {
  return {
    id,
    season: 2026,
    teamId: 'TEX',
    phase: 'regular',
    week,
    weekLabel: `Week ${week}`,
    date: '', // TBD — not fabricated
    time: '', // TBD — not fabricated
    opponentId,
    opponentName,
    homeAway,
    venue,
    status: 'time_tbd',
    notes: 'Demo entry — verify/replace via CollegeFootballData import.',
  }
}

const MASTER: Record<string, NflGame[]> = {
  'TEX:2026': TEX_2026,
}

/** Bundled master games for a team+season (empty until imported for a team). */
export function masterGames(teamId: string, season: number): NflGame[] {
  return MASTER[`${teamId}:${season}`] ?? []
}
