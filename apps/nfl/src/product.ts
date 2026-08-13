import type { ProductConfig } from '@gamedayops/core'
import { NFL_TEAMS, DEFAULT_TEAM_ID } from './data/nflTeams'
import { AVAILABLE_SEASONS, masterGames, applyOverride, gameKickoffISO } from './data/nflSchedule'
import { makeDefaultState } from './lib/defaults'

// GameDayOps NFL — the NFL data universe injected into the shared core engine.
export const nflProduct: ProductConfig = {
  productType: 'NFL',
  productName: 'GameDayOps NFL',
  teams: NFL_TEAMS.map((t) => ({ ...t, product: 'NFL' as const })),
  defaultTeamId: DEFAULT_TEAM_ID,
  availableSeasons: AVAILABLE_SEASONS,
  masterGames,
  applyOverride,
  gameKickoffISO,
  makeDefaultState,
}
