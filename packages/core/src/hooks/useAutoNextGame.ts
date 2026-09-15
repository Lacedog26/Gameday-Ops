import { useEffect, useRef } from 'react'
import { useDashboard } from '../context/DashboardContext'
import { getTeam, masterGames, applyOverride } from '../product'
import { getScope } from '../lib/session'
import { etWallTimeToEpoch } from '../lib/time'
import { selectNextGame, toGameInfo, FINISHED_AFTER_MS } from '../lib/nextGame'
import type { NflGame } from '../types'

/**
 * Automatic next-game selection (Part 9). Once, after the board has hydrated,
 * this picks the team's NEXT upcoming game from the active schedule (imported/
 * custom supersedes the shipped master, overrides applied) and loads it — but
 * ONLY when the currently-loaded game is missing or already in the past. A valid
 * current/future selection (including a deliberate manual pick) is left
 * untouched, so manual selection is never corrupted. Skipped on TV displays.
 *
 * Games are chosen by DATE (a TBD kickoff still counts, and loads as TBD rather
 * than a fabricated time), impossible games are dropped, and byes are skipped.
 */
export function useAutoNextGame(): void {
  const { state, actions, hydrated } = useDashboard()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current || !hydrated) return
    if (getScope().displayToken) { ranRef.current = true; return } // never auto-drive a kiosk
    ranRef.current = true

    const teamId = state.game.teamId
    const season = state.season
    const teamName = getTeam(teamId)?.name
    const custom = state.customGames.filter((g) => g.teamId === teamId && g.season === season)
    const base: NflGame[] = (custom.length ? custom : masterGames(teamId, season)).map((g) =>
      applyOverride(g, state.gameOverrides[g.id]),
    )

    // A deliberate manual override pauses auto-advancement until the operator
    // clicks "Use Next Game" (which clears the flag). The schedule stays the
    // source of truth; this is just the user temporarily steering.
    if (state.game.manualOverride) return

    const now = Date.now()
    const upcoming = selectNextGame(base, now, teamName)
    if (!upcoming) return

    // Respect a valid current/future selection that is already the resolved game.
    const curKo = state.game.kickoffISO
      ? etWallTimeToEpoch(state.game.kickoffISO, state.game.timezone)
      : NaN
    const currentValid =
      Boolean(state.game.sourceGameId) &&
      state.game.sourceGameId === upcoming.id &&
      !Number.isNaN(curKo) &&
      curKo + FINISHED_AFTER_MS > now
    if (currentValid) return

    const opp = upcoming.opponentId ? getTeam(upcoming.opponentId) : null
    actions.loadGame(toGameInfo(upcoming, opp ? opp.name : upcoming.opponentName ?? ''))
  }, [hydrated, state, actions])
}
