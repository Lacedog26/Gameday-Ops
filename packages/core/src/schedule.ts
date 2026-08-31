import type { GameOverride, NflGame } from './types'

// Generic schedule helpers shared by every product. `masterGames` is
// product-specific data (injected via the registry); these two transforms are
// pure and identical across leagues.

/** Apply an org's override to a master game (master itself is never mutated). */
export function applyGameOverride(game: NflGame, ov?: GameOverride): NflGame {
  if (!ov) return game
  return {
    ...game,
    date: ov.date ?? game.date,
    time: ov.time ?? game.time,
    opponentId: ov.opponentId ?? game.opponentId,
    opponentName: ov.opponentName ?? game.opponentName,
    homeAway: ov.homeAway ?? game.homeAway,
    venue: ov.venue ?? game.venue,
    weekLabel: ov.weekLabel ?? game.weekLabel,
    status: ov.status ?? game.status,
    notes: ov.notes ?? game.notes,
  }
}

/** Kickoff ISO (Eastern wall time) for a game, or '' when date/time is TBD. */
export function computeKickoffISO(game: NflGame): string {
  if (!game.date || !game.time) return ''
  return `${game.date}T${game.time}`
}
