import { etWallTimeToEpoch } from './time'
import { sanitizeGames } from './scheduleValidate'
import type { GameInfo, GameState, NflGame } from '../types'

// ---------------------------------------------------------------------------
// Authoritative schedule resolution (the CFB ⇄ NFL "next game" architecture).
//
// The imported team schedule is the SOURCE OF TRUTH. Given the schedule and the
// current time, ONE function derives the previous / current / next game and the
// game state. Home, Admin, Timeline, and the TV Board all resolve through this —
// they never pick games independently. Automatic advancement is a consequence:
// as games complete, "next" moves forward on its own, with no manual week bump.
// ---------------------------------------------------------------------------

// A game is still "live" until this long after kickoff (covers long/OT games).
export const FINISHED_AFTER_MS = 5 * 3600 * 1000

/** Kickoff instant for ordering; a TBD time orders at noon ET (never shown). */
export function gameKickoffMs(g: NflGame): number {
  return etWallTimeToEpoch(`${g.date}T${g.time || '12:00'}`, g.timezone)
}

/** Games eligible to resolve: real (not self-play/malformed), dated, not a bye. */
export function eligibleGames(base: NflGame[], teamName?: string): NflGame[] {
  return sanitizeGames(base, teamName)
    .filter((g) => g.status !== 'bye' && !!g.date)
    .sort((a, b) => gameKickoffMs(a) - gameKickoffMs(b)) // chronological
}

/** Per-game live state (time-based). A TBD-time game is never called "live". */
function stateOf(g: NflGame, nowMs: number): GameState {
  const ko = gameKickoffMs(g)
  if (nowMs >= ko + FINISHED_AFTER_MS) return 'completed'
  if (g.time && nowMs >= ko) return 'live'
  return 'upcoming'
}

export interface ScheduleResolution {
  /** Most recently completed game (or null). */
  previousGame: NflGame | null
  /** The game happening right now (or null). */
  currentGame: NflGame | null
  /** The game the app should act on: the live game, else the next upcoming. */
  nextGame: NflGame | null
  /** State of `nextGame` (or 'unknown'/'bye' when there is none to act on). */
  gameState: GameState
  season?: number
  week?: string
}

/**
 * Resolve the team's schedule against `now`. This is the single source of truth
 * for which game is active. `nextGame` is what Home/Admin/Board should load.
 */
export function resolveSchedule(base: NflGame[], nowMs: number, teamName?: string): ScheduleResolution {
  const games = eligibleGames(base, teamName)
  if (!games.length) {
    // Distinguish "no usable games at all" from "only byes remain".
    const hadByes = base.some((g) => g.status === 'bye')
    return {
      previousGame: null,
      currentGame: null,
      nextGame: null,
      gameState: hadByes ? 'bye' : 'unknown',
    }
  }

  let previousGame: NflGame | null = null
  let currentGame: NflGame | null = null
  let nextGame: NflGame | null = null

  for (const g of games) {
    const s = stateOf(g, nowMs)
    if (s === 'completed') previousGame = g // games are sorted, so last wins
    else if (s === 'live' && !currentGame) currentGame = g
    else if (s === 'upcoming' && !nextGame) nextGame = g
  }

  const active = currentGame ?? nextGame
  const gameState: GameState = currentGame
    ? 'live'
    : nextGame
      ? 'upcoming'
      : previousGame
        ? 'completed' // season finished
        : 'unknown'

  return {
    previousGame,
    currentGame,
    nextGame: active,
    gameState,
    season: active?.season ?? previousGame?.season,
    week: active?.weekLabel ?? previousGame?.weekLabel,
  }
}

/** Back-compat: the single next game to act on (null if none). */
export function selectNextGame(base: NflGame[], nowMs: number, teamName?: string): NflGame | null {
  return resolveSchedule(base, nowMs, teamName).nextGame
}

/**
 * Build the board's GameInfo from a schedule game. Never invents a kickoff: when
 * the source time is TBD, the date is seeded at noon ET as an editable
 * placeholder and `kickoffTbd` is set so the board shows "TBD". `manual` marks a
 * deliberate operator override (which pauses auto-advancement until cleared).
 */
export function toGameInfo(game: NflGame, opponentName: string, opts?: { manual?: boolean }): GameInfo {
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
    manualOverride: opts?.manual ?? false,
  }
}
