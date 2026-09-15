import type { NflGame } from '@gamedayops/core'

// ---------------------------------------------------------------------------
// GameDayOps College — schedule library (curated STARTER set).
//
// This ships a small, clearly-labeled starter schedule for major programs so a
// new customer isn't staring at an empty board: well-established annual
// rivalries and announced marquee non-conference games. It is intentionally
// conservative and NOT a full, verified slate:
//   • Kickoff TIMES are always TBD — we never invent a time. The board shows
//     "TBD" and the operator sets the exact kickoff.
//   • Every entry is flagged to verify site/date and complete the season via the
//     Schedule Import (Admin → Schedule Center → Import), which pulls the real,
//     full FBS + FCS slate from CollegeFootballData. Imported games supersede
//     this starter for that team.
// Teams without a starter entry simply have no games until imported.
// ---------------------------------------------------------------------------

export const CURRENT_SEASON = 2026
export const AVAILABLE_SEASONS = [2026]

export const SCHEDULE_LAST_UPDATED = '2026 starter set — verify & complete via Schedule Import'

const NOTE = 'Starter entry — verify site/date and set kickoff, or import the full schedule.'

// Program display names for opponent labels (also enables opponent branding).
const NAME: Record<string, string> = {
  OSU: 'Ohio State', MICH: 'Michigan', ALA: 'Alabama', AUB: 'Auburn',
  TEX: 'Texas', TAMU: 'Texas A&M', LSU: 'LSU', CLEM: 'Clemson',
}

interface Matchup {
  home: string
  away: string
  date: string // YYYY-MM-DD (real date; kickoff TIME stays TBD)
  week: number
  weekLabel: string
  venue: string
  label?: string // rivalry/game name for the note
}

// Curated, high-confidence fixtures. Sites are best-effort and flagged to verify.
const MATCHUPS: Matchup[] = [
  { home: 'TEX', away: 'OSU', date: '2026-09-05', week: 1, weekLabel: 'Week 1', venue: 'DKR–Texas Memorial Stadium — Austin, TX' },
  { home: 'LSU', away: 'CLEM', date: '2026-09-05', week: 1, weekLabel: 'Week 1', venue: 'Tiger Stadium — Baton Rouge, LA' },
  { home: 'OSU', away: 'MICH', date: '2026-11-28', week: 14, weekLabel: 'Rivalry Week', venue: 'Ohio Stadium — Columbus, OH', label: 'The Game' },
  { home: 'ALA', away: 'AUB', date: '2026-11-28', week: 14, weekLabel: 'Rivalry Week', venue: 'Bryant–Denny Stadium — Tuscaloosa, AL', label: 'Iron Bowl' },
  { home: 'TAMU', away: 'TEX', date: '2026-11-28', week: 14, weekLabel: 'Rivalry Week', venue: 'Kyle Field — College Station, TX', label: 'Lone Star Showdown' },
]

function row(teamId: string, oppId: string, homeAway: 'HOME' | 'AWAY', m: Matchup): NflGame {
  return {
    id: `${teamId}-${CURRENT_SEASON}-${m.date}-${oppId}`,
    season: CURRENT_SEASON,
    teamId,
    phase: 'regular',
    week: m.week,
    weekLabel: m.weekLabel,
    date: m.date,
    time: '', // TBD — never fabricated
    opponentId: oppId,
    opponentName: NAME[oppId] ?? oppId,
    homeAway,
    venue: m.venue,
    status: 'time_tbd',
    notes: m.label ? `${m.label}. ${NOTE}` : NOTE,
  }
}

// Expand each matchup into a per-team row so BOTH programs' schedules populate.
const MASTER: Record<string, NflGame[]> = {}
function push(teamId: string, g: NflGame) {
  const key = `${teamId}:${CURRENT_SEASON}`
  ;(MASTER[key] ||= []).push(g)
}
for (const m of MATCHUPS) {
  // Guard against a malformed matchup ever producing a team vs itself.
  if (m.home === m.away) continue
  push(m.home, row(m.home, m.away, 'HOME', m))
  push(m.away, row(m.away, m.home, 'AWAY', m))
}

/** Bundled master games for a team+season (empty until imported for a team). */
export function masterGames(teamId: string, season: number): NflGame[] {
  return MASTER[`${teamId}:${season}`] ?? []
}
