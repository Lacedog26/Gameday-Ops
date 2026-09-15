import type { NflGame } from '../types'

// ---------------------------------------------------------------------------
// Defensive schedule validation. Bad schedule data — most importantly a team
// playing ITSELF (e.g. "Texas vs Texas") — must never reach the board, whether
// it comes from seeded data or an import. These are pure, unit-testable checks
// used to sanitize any game list before it is shown or loaded.
// ---------------------------------------------------------------------------

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase()

/**
 * A game is a self-play if the opponent resolves to the same program as the
 * team — by id or by name. This is always invalid and is dropped/flagged.
 */
export function isSelfPlay(game: Pick<NflGame, 'teamId' | 'opponentId' | 'opponentName'>, teamName?: string): boolean {
  if (game.opponentId && norm(game.opponentId) === norm(game.teamId)) return true
  if (game.opponentName && teamName && norm(game.opponentName) === norm(teamName)) return true
  return false
}

/** Is the date a well-formed YYYY-MM-DD (or empty, meaning TBD)? */
export function isValidDate(date?: string): boolean {
  if (!date) return true // empty = TBD, allowed
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** Is the time a well-formed HH:mm (or empty, meaning TBD)? */
export function isValidTime(time?: string): boolean {
  if (!time) return true // empty = TBD, allowed
  if (!/^\d{2}:\d{2}$/.test(time)) return false
  const [h, mi] = time.split(':').map(Number)
  return h >= 0 && h <= 23 && mi >= 0 && mi <= 59
}

/** A single game is structurally valid (opponent differs, dates/times sane). */
export function isValidGame(game: NflGame, teamName?: string): boolean {
  if (!game.teamId) return false
  if (isSelfPlay(game, teamName)) return false
  if (!isValidDate(game.date)) return false
  if (!isValidTime(game.time)) return false
  return true
}

/**
 * Drop impossible games from a list (self-play, malformed date/time). Returns a
 * new array; never mutates. `teamName` lets us also catch name-based self-play.
 */
export function sanitizeGames(games: NflGame[], teamName?: string): NflGame[] {
  return games.filter((g) => isValidGame(g, teamName))
}
