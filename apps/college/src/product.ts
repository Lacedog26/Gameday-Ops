import type { ProductConfig } from '@gamedayops/core'
import { applyGameOverride, computeKickoffISO } from '@gamedayops/core'
import { COLLEGE_TEAMS, DEFAULT_TEAM_ID } from './data/collegeTeams'
import { AVAILABLE_SEASONS, masterGames } from './data/collegeSchedule'
import { makeDefaultState } from './lib/defaults'

// GameDayOps College — the college data universe injected into the
// shared core engine (same UI/engine as NFL; different team + schedule world).
export const collegeProduct: ProductConfig = {
  productType: 'COLLEGE_FOOTBALL',
  productName: 'GameDayOps College',
  teams: COLLEGE_TEAMS,
  defaultTeamId: DEFAULT_TEAM_ID,
  availableSeasons: AVAILABLE_SEASONS,
  masterGames,
  applyOverride: applyGameOverride,
  gameKickoffISO: computeKickoffISO,
  makeDefaultState,
}
