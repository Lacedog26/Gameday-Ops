import { useEffect, useRef } from 'react'
import { useDashboard } from '../context/DashboardContext'
import { getTeam, masterGames, applyOverride } from '../product'
import { getScope } from '../lib/session'
import { etWallTimeToEpoch } from '../lib/time'
import type { GameInfo, NflGame } from '../types'

/**
 * Automatic next-game selection (#6). Once, after the board has hydrated, this
 * picks the team's NEXT upcoming game from the active schedule (imported/custom
 * supersedes the shipped master, overrides applied) and loads it — but ONLY when
 * the currently-loaded game is missing or already in the past. A valid current/
 * future selection (including a deliberate manual pick) is left untouched, so
 * manual selection is never corrupted. Skipped on read-only TV displays.
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
    const custom = state.customGames.filter((g) => g.teamId === teamId && g.season === season)
    const base: NflGame[] = custom.length ? custom : masterGames(teamId, season)
    const games = base
      .map((g) => applyOverride(g, state.gameOverrides[g.id]))
      .filter((g) => g.status !== 'bye' && g.date && g.time)
    if (!games.length) return

    const now = Date.now()
    const koMs = (g: NflGame) => etWallTimeToEpoch(`${g.date}T${g.time}`, g.timezone)
    const upcoming = [...games]
      .sort((a, b) => koMs(a) - koMs(b))
      .find((g) => koMs(g) + 4 * 3600 * 1000 > now) // not finished (kickoff + 4h in future)
    if (!upcoming) return

    // Is the currently-loaded game still valid (set and not long past)?
    const curKo = state.game.kickoffISO
      ? etWallTimeToEpoch(state.game.kickoffISO, state.game.timezone)
      : NaN
    const currentValid =
      Boolean(state.game.sourceGameId) && !Number.isNaN(curKo) && curKo + 4 * 3600 * 1000 > now
    if (currentValid) return // respect a valid current/future (or manual) selection

    const opp = upcoming.opponentId ? getTeam(upcoming.opponentId) : null
    const info: GameInfo = {
      teamId: upcoming.teamId,
      opponentId: upcoming.opponentId,
      opponent: opp ? opp.name : upcoming.opponentName ?? '',
      week: upcoming.weekLabel,
      homeAway: upcoming.homeAway,
      kickoffISO: `${upcoming.date}T${upcoming.time}`,
      timezone: upcoming.timezone,
      venue: upcoming.venue,
      sourceGameId: upcoming.id,
    }
    actions.loadGame(info)
  }, [hydrated, state, actions])
}
