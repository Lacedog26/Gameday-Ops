import type { NflGame } from '@gamedayops/core'
import rawSchedule from './nflSchedule2026.json'

// ---------------------------------------------------------------------------
// NFL master schedule library.
//
// Buffalo's 2026 season is preloaded with REAL, sourced data (preseason + all
// 18 regular-season weeks incl. the bye). Other teams start empty and are
// populated via the Schedule Center's JSON/CSV import — the app never fabricates
// games, dates, times, or opponents.
//
// Source of truth for timing is ALWAYS kickoff + T-minus; games store the
// kickoff (date + ET time), never per-event clock times.
// ---------------------------------------------------------------------------

export const CURRENT_SEASON = 2026
export const AVAILABLE_SEASONS = [2026]

interface Row {
  phase: 'preseason' | 'regular'
  week: number
  date: string // YYYY-MM-DD (ET); Jan dates roll to season+1
  time: string // HH:MM 24h ET, '' = TBD
  opp?: string // opponent team id
  ha: 'HOME' | 'AWAY'
  net?: string
  bye?: boolean
  venue?: string
}

const HIGHMARK = 'Highmark Stadium'

// 2026 Buffalo Bills — verified against multiple published sources (Aug 2026).
const BUF_2026: Row[] = [
  // Preseason
  { phase: 'preseason', week: 1, date: '2026-08-15', time: '13:00', opp: 'CAR', ha: 'HOME', venue: HIGHMARK },
  { phase: 'preseason', week: 2, date: '2026-08-22', time: '13:00', opp: 'CLE', ha: 'AWAY' },
  { phase: 'preseason', week: 3, date: '2026-08-27', time: '19:00', opp: 'PIT', ha: 'HOME', venue: HIGHMARK },
  // Regular season
  { phase: 'regular', week: 1, date: '2026-09-13', time: '13:00', opp: 'HOU', ha: 'AWAY', net: 'CBS' },
  { phase: 'regular', week: 2, date: '2026-09-17', time: '20:15', opp: 'DET', ha: 'HOME', net: 'Prime Video', venue: HIGHMARK },
  { phase: 'regular', week: 3, date: '2026-09-27', time: '13:00', opp: 'LAC', ha: 'HOME', net: 'FOX', venue: HIGHMARK },
  { phase: 'regular', week: 4, date: '2026-10-04', time: '13:00', opp: 'NE', ha: 'HOME', net: 'CBS', venue: HIGHMARK },
  { phase: 'regular', week: 5, date: '2026-10-12', time: '20:15', opp: 'LAR', ha: 'AWAY', net: 'ESPN' },
  { phase: 'regular', week: 6, date: '2026-10-18', time: '16:25', opp: 'LV', ha: 'AWAY', net: 'CBS' },
  { phase: 'regular', week: 7, date: '', time: '', ha: 'HOME', bye: true },
  { phase: 'regular', week: 8, date: '2026-11-01', time: '13:00', opp: 'BAL', ha: 'HOME', net: 'CBS', venue: HIGHMARK },
  { phase: 'regular', week: 9, date: '2026-11-09', time: '20:15', opp: 'MIN', ha: 'AWAY', net: 'ESPN' },
  { phase: 'regular', week: 10, date: '2026-11-15', time: '13:00', opp: 'NYJ', ha: 'AWAY', net: 'CBS' },
  { phase: 'regular', week: 11, date: '2026-11-22', time: '13:00', opp: 'MIA', ha: 'HOME', net: 'FOX', venue: HIGHMARK },
  { phase: 'regular', week: 12, date: '2026-11-26', time: '20:20', opp: 'KC', ha: 'HOME', net: 'NBC', venue: HIGHMARK },
  { phase: 'regular', week: 13, date: '2026-12-06', time: '16:25', opp: 'NE', ha: 'AWAY', net: 'CBS' },
  { phase: 'regular', week: 14, date: '2026-12-13', time: '20:20', opp: 'GB', ha: 'AWAY', net: 'NBC' },
  { phase: 'regular', week: 15, date: '2026-12-19', time: '20:20', opp: 'CHI', ha: 'HOME', net: 'CBS', venue: HIGHMARK },
  { phase: 'regular', week: 16, date: '2026-12-25', time: '16:30', opp: 'DEN', ha: 'AWAY', net: 'Netflix' },
  { phase: 'regular', week: 17, date: '2027-01-03', time: '13:00', opp: 'MIA', ha: 'AWAY' },
  { phase: 'regular', week: 18, date: '', time: '', opp: 'NYJ', ha: 'HOME', net: 'CBS', venue: HIGHMARK },
]

function buildTeamSeason(teamId: string, season: number, rows: Row[]): NflGame[] {
  return rows.map((r) => {
    const phaseKey = r.phase === 'preseason' ? 'pre' : 'reg'
    const label =
      r.phase === 'preseason' ? `Preseason Week ${r.week}` : `Week ${r.week}`
    const status: NflGame['status'] = r.bye
      ? 'bye'
      : !r.date
        ? 'date_tbd'
        : !r.time
          ? 'time_tbd'
          : 'scheduled'
    return {
      id: `${teamId}-${season}-${phaseKey}-${r.week}`,
      season,
      teamId,
      phase: r.phase,
      week: r.week,
      weekLabel: label,
      date: r.date,
      time: r.time,
      opponentId: r.opp,
      homeAway: r.ha,
      venue: r.venue,
      network: r.net,
      status,
    }
  })
}

// Full 2026 regular-season schedule for all 32 teams (real data compiled from
// the authoritative nflverse dataset; verified internally consistent and
// matching the hand-checked Buffalo schedule). Buffalo keeps its hand-authored
// entries below because they also carry preseason games, venues, and networks.
const JSON_GAMES = rawSchedule as unknown as NflGame[]

// Master library keyed by `${teamId}:${season}`.
const MASTER: Record<string, NflGame[]> = {
  [`BUF:${CURRENT_SEASON}`]: buildTeamSeason('BUF', CURRENT_SEASON, BUF_2026),
}

for (const g of JSON_GAMES) {
  if (g.teamId === 'BUF') continue // keep the richer hand-authored Buffalo data
  const key = `${g.teamId}:${g.season}`
  ;(MASTER[key] ??= []).push(g)
}

/** Bundled master games for a team+season (empty if not yet imported). */
export function masterGames(teamId: string, season: number): NflGame[] {
  return MASTER[`${teamId}:${season}`] ?? []
}

