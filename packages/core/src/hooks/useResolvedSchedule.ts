import { useMemo } from 'react'
import { useDashboard } from '../context/DashboardContext'
import { getTeam, masterGames, applyOverride } from '../product'
import { useNow } from './useNow'
import { resolveSchedule, type ScheduleResolution } from '../lib/nextGame'

/**
 * The one place any component gets the team's authoritative schedule resolution
 * (previous / current / next game + state). Home, Admin, and the Board all read
 * through this, so they can never disagree about which game is next. Custom
 * (imported) games supersede the shipped master; per-game overrides are applied.
 * Re-resolves every 30s so a game rolling from upcoming → live → completed
 * advances on its own.
 */
export function useResolvedSchedule(): ScheduleResolution {
  const { state } = useDashboard()
  const now = useNow(30_000)
  return useMemo(() => {
    const teamId = state.game.teamId
    const season = state.season
    const teamName = getTeam(teamId)?.name
    const custom = state.customGames.filter((g) => g.teamId === teamId && g.season === season)
    const base = (custom.length ? custom : masterGames(teamId, season)).map((g) =>
      applyOverride(g, state.gameOverrides[g.id]),
    )
    return resolveSchedule(base, now, teamName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.game.teamId, state.season, state.customGames, state.gameOverrides, now])
}
