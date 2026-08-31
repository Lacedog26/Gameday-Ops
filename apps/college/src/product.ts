import type { ProductConfig } from '@gamedayops/core'
import { applyGameOverride, computeKickoffISO } from '@gamedayops/core'
import { COLLEGE_TEAMS, DEFAULT_TEAM_ID } from './data/collegeTeams'
import { AVAILABLE_SEASONS, masterGames } from './data/collegeSchedule'
import { makeDefaultState } from './lib/defaults'
import { TEAM_CULTURE } from './data/collegeCulture'

// GameDayOps College — the college data universe injected into the
// shared core engine (same UI/engine as NFL; different team + schedule world).
export const collegeProduct: ProductConfig = {
  productType: 'COLLEGE_FOOTBALL',
  productName: 'GameDayOps College',
  storageNamespace: 'college',
  teams: COLLEGE_TEAMS,
  defaultTeamId: DEFAULT_TEAM_ID,
  availableSeasons: AVAILABLE_SEASONS,
  masterGames,
  applyOverride: applyGameOverride,
  gameKickoffISO: computeKickoffISO,
  makeDefaultState,
  teamCulture: TEAM_CULTURE,
  // Commercial SaaS: enforce login + entitlement at the route layer, and send
  // auth emails back to the production origin (never localhost).
  requireAuth: true,
  publicSiteUrl: 'https://pregameopscfb.app',
}
