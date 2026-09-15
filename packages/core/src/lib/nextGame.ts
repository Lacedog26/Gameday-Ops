import { etWallTimeToEpoch } from './time'
import { sanitizeGames } from './scheduleValidate'
import type { GameInfo, NflGame } from '../types'

// Shared next-game selection (Part 9). The schedule is the source of truth:
// impossible games are dropped, byes skipped, and the next game is chosen by
// DATE so a TBD kickoff time still counts. Used both on first open
// (useAutoNextGame) and when the operator switches teams.

// A game not yet finished this long after kickoff is still "current".
export const FINISHED_AFTER_MS = 5 * 3600 * 1000

/** Kickoff instant for ordering; a TBD time orders at noon ET (never shown). */
export function gameKickoffMs(g: NflGame): number {
  return etWallTimeToEpoch(`${g.date}T${g.time || '12:00'}`, g.timezone)
}

/** Games eligible to be "next": real (not self-play/malformed), dated, not a bye. */
export function eligibleGames(base: NflGame[], teamName?: string): NflGame[] {
  return sanitizeGames(base, teamName).filter((g) => g.status !== 'bye' && !!g.date)
}

/**
 * The next upcoming game from an (override-applied) list, or null if none.
 * Chosen by date/time; a game is still "upcoming" until FINISHED_AFTER_MS past
 * its kickoff so an in-progress game stays selected.
 */
export function selectNextGame(base: NflGame[], nowMs: number, teamName?: string): NflGame | null {
  const games = eligibleGames(base, teamName)
  if (!games.length) return null
  const upcoming = [...games]
    .sort((a, b) => gameKickoffMs(a) - gameKickoffMs(b))
    .find((g) => gameKickoffMs(g) + FINISHED_AFTER_MS > nowMs)
  return upcoming ?? null
}

/**
 * Build the board's GameInfo from a schedule game. Never invents a kickoff:
 * when the source time is TBD, the date is seeded at noon ET as an editable
 * placeholder and `kickoffTbd` is set so the board shows "TBD".
 */
export function toGameInfo(game: NflGame, opponentName: string): GameInfo {
  const timeKnown = !!game.time
  return {
    teamId: game.teamId,
    opponentId: game.opponentId,
    opponent: opponentName,
    week: game.weekLabel,
    homeAway: game.homeAway,
    kickoffISO: `${game.date}T${game.time || '12:00'}`,
    timezone: game.timezone,
    venue: game.venue,
    sourceGameId: game.id,
    kickoffTbd: !timeKnown,
  }
}
