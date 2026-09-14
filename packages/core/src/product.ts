import type {
  AppState,
  GameOverride,
  NflGame,
  ProductType,
  TeamBrand,
  TeamId,
} from './types'

// ---------------------------------------------------------------------------
// Product registry.
//
// The shared UI (components, context, theme) is sport-agnostic: it never
// imports league data directly. Instead each product app (NFL, College
// Football) calls configureProduct(...) once at startup with its own team
// universe, schedule source, and default state. The UI reads everything it
// needs through the accessors below, so the SAME components render both
// products — only the injected data differs.
// ---------------------------------------------------------------------------

export interface ProductConfig {
  productType: ProductType
  /** Display name, e.g. "GameDayOps NFL" / "GameDayOps College". */
  productName: string
  /**
   * Storage namespace isolating this product's board + local cache from other
   * products (so NFL and College never share state). Leave unset on the legacy
   * NFL deployment to preserve its existing board/key.
   */
  storageNamespace?: string
  /** The full team universe for this product (never mixed across products). */
  teams: TeamBrand[]
  /** Fallback team when none is selected. */
  defaultTeamId: TeamId
  /** Seasons offered in the Schedule Center. */
  availableSeasons: number[]
  /** Master schedule lookup for a team+season. */
  masterGames: (teamId: string, season: number) => NflGame[]
  /** Apply an org's edits to a master game (master is never mutated). */
  applyOverride: (game: NflGame, ov?: GameOverride) => NflGame
  /** Kickoff ISO (Eastern wall time) for a game. */
  gameKickoffISO: (game: NflGame) => string
  /** Build a fresh first-run AppState (default team, template, culture). */
  makeDefaultState: (now?: number) => AppState
  /** Per-team default culture saying (short cheer), keyed by team id. */
  teamCulture?: Record<string, string>
  /**
   * Commercial mode. When true, authentication AND an active entitlement are
   * enforced by the route architecture itself (not merely an env var): a
   * logged-out visitor cannot reach the app, and a user without a valid
   * trial/subscription is routed to billing. Leave unset for the single-facility
   * NFL deployment, which stays open.
   */
  requireAuth?: boolean
  /**
   * Canonical production origin (e.g. "https://pregameopscfb.app"). Used for
   * auth email redirect targets so confirmation / reset links never point at
   * localhost. Falls back to window.location.origin when unset.
   */
  publicSiteUrl?: string
}

let _cfg: ProductConfig | null = null
let _byId: Record<TeamId, TeamBrand> = {}

export function configureProduct(cfg: ProductConfig): void {
  _cfg = cfg
  _byId = Object.fromEntries(cfg.teams.map((t) => [t.id, t]))
}

export function productConfig(): ProductConfig {
  if (!_cfg) throw new Error('GameDayOps: configureProduct() must run before rendering.')
  return _cfg
}

/** All teams in this product. */
export const allTeams = (): TeamBrand[] => productConfig().teams

/** Resolve a team by id, falling back to the product's default team. */
export function getTeam(id?: string | null): TeamBrand {
  productConfig()
  return (id && _byId[id]) || _byId[productConfig().defaultTeamId]
}

/**
 * Teams grouped for the admin selector. Generic over the league: groups by
 * conference, and by "Conference Division" when a division is present (NFL).
 * College teams (no division) group by conference alone — realignment-safe.
 */
export function teamsByDivision(): { label: string; teams: TeamBrand[] }[] {
  const order: string[] = []
  const groups: Record<string, TeamBrand[]> = {}
  for (const t of productConfig().teams) {
    const label = t.division ? `${t.conference} ${t.division}` : t.conference
    if (!groups[label]) {
      groups[label] = []
      order.push(label)
    }
    groups[label].push(t)
  }
  return order.map((label) => ({ label, teams: groups[label] }))
}

export const availableSeasons = (): number[] => productConfig().availableSeasons
export const masterGames = (teamId: string, season: number): NflGame[] =>
  productConfig().masterGames(teamId, season)
export const applyOverride = (game: NflGame, ov?: GameOverride): NflGame =>
  productConfig().applyOverride(game, ov)
export const gameKickoffISO = (game: NflGame): string => productConfig().gameKickoffISO(game)
export const makeDefaultState = (now?: number): AppState => productConfig().makeDefaultState(now)

/** The shipped default culture saying for a team (empty string if none). */
export const teamDefaultCulture = (teamId: string): string =>
  productConfig().teamCulture?.[teamId] ?? ''

/**
 * Commercial mode: auth + entitlement enforced by the route architecture.
 * True when the product opts in, or the VITE_REQUIRE_AUTH safeguard is set.
 */
export function commercialMode(): boolean {
  let fromCfg = false
  try {
    fromCfg = productConfig().requireAuth === true
  } catch {
    fromCfg = false
  }
  return fromCfg || import.meta.env.VITE_REQUIRE_AUTH === 'true'
}

/** Canonical production origin for auth redirects (falls back to current origin). */
export function siteUrl(): string {
  try {
    const configured = productConfig().publicSiteUrl
    if (configured) return configured.replace(/\/+$/, '')
  } catch {
    /* not configured yet */
  }
  return typeof window !== 'undefined' ? window.location.origin : ''
}
