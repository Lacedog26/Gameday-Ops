// ---------------------------------------------------------------------------
// Core data models for the Buffalo Bills Pre-Game Operations Dashboard.
//
// Design principle: the entire board is driven by ONE absolute timestamp
// (the kickoff time). Every event stores its offset as `tMinusSeconds` — the
// number of seconds BEFORE kickoff it is scheduled to happen. Clock times and
// live countdowns are DERIVED from kickoff + offset, so staff never calculate
// timing by hand and everything stays in sync when kickoff is changed.
// ---------------------------------------------------------------------------

export type EventId = string
export type TemplateId = string
export type GraphicId = string
export type TeamId = string
export type OrgId = string
export type GameId = string

// --- NFL schedule library ---------------------------------------------------

export type GamePhase = 'preseason' | 'regular' | 'postseason'

export type GameStatus =
  | 'scheduled'
  | 'time_tbd'
  | 'date_tbd'
  | 'postponed'
  | 'rescheduled'
  | 'cancelled'
  | 'completed'
  | 'bye'

/** A single game in a team's season schedule (the "NFL master schedule"). */
export interface NflGame {
  id: GameId // stable, e.g. "BUF-2026-reg-2"
  season: number
  teamId: TeamId
  phase: GamePhase
  /** Week number within the phase (1..). 0 for one-off/postseason rounds. */
  week: number
  /** Display label, e.g. "Week 2", "Preseason Week 1", "Wild Card". */
  weekLabel: string
  /** ET date "YYYY-MM-DD" ("" when date is TBD). */
  date: string
  /** ET 24h time "HH:MM" ("" when time is TBD). */
  time: string
  opponentId?: TeamId
  opponentName?: string // fallback when opponent isn't an NFL team id
  homeAway: 'HOME' | 'AWAY'
  venue?: string
  network?: string
  status: GameStatus
  notes?: string
}

/**
 * An organization's edits to a master game. Stored separately so the master
 * schedule is never overwritten (audit trail + one org can't affect others).
 * Any present field overrides the master; `modifiedAt`/`modifiedBy` record who.
 */
export interface GameOverride {
  date?: string
  time?: string
  opponentId?: TeamId
  opponentName?: string
  homeAway?: 'HOME' | 'AWAY'
  venue?: string
  weekLabel?: string
  status?: GameStatus
  notes?: string
  /** Original kickoff before edits, for the "kickoff updated" audit display. */
  originalKickoffISO?: string
  modifiedAt: number
  modifiedBy?: string
}

// --- Multi-tenant / white-label identity ----------------------------------

/** Uploadable, licensed brand assets for a team (URLs, not bundled artwork). */
export interface TeamAssets {
  primaryLogoUrl?: string
  secondaryLogoUrl?: string
  wordmarkUrl?: string
  backgroundAssetUrl?: string
}

/** A team's configurable colors. Drives the white-label theme. */
export interface TeamColors {
  primary: string
  secondary: string
  accent: string
  text: string
}

/**
 * Which product universe a team/schedule belongs to. Keeps the NFL and College
 * Football data worlds strictly separate (never mixed in one team selector).
 */
export type ProductType = 'NFL' | 'COLLEGE_FOOTBALL'

/**
 * A team's full brand configuration (identity + colors + assets).
 *
 * `conference`/`division` are free-form strings (not a fixed NFL union) so the
 * SAME shape serves NFL (AFC/NFC · East/North/South/West) AND college football,
 * where conferences realign season to season and there is no permanent list.
 * College teams additionally carry `subdivision` (FBS/FCS) and `school`.
 */
export interface TeamBrand {
  id: TeamId
  name: string // "Buffalo Bills" / "Texas Longhorns"
  location: string // "Buffalo" / "Austin, TX"
  nickname: string // "Bills" / "Longhorns"
  shortName: string // "Bills" / "Texas"
  abbr: string // "BUF" / "TEX"
  /** Product universe this team belongs to. Defaults to NFL for legacy data. */
  product?: ProductType
  /** Conference name — free-form (AFC/NFC, SEC, Big Ten, MVFC, …). */
  conference: string
  /** Division/region within the conference — free-form ("East", ""). */
  division: string
  /** College only: competitive subdivision. */
  subdivision?: 'FBS' | 'FCS'
  /** College only: the school/institution name ("University of Texas"). */
  school?: string
  /** College only: true for programs that play as an Independent. */
  independent?: boolean
  colors: TeamColors
  assets: TeamAssets
}

/**
 * An organization = one commercial tenant (a club/customer). In the local build
 * there is a single default org; the Supabase schema makes this multi-tenant.
 */
export interface Organization {
  id: OrgId
  name: string
  /** The team this org operates as by default. */
  teamId: TeamId
}

/** A single pre-game routine event (a row on the board). */
export interface PregameEvent {
  id: EventId
  /** Primary label shown on the board, e.g. "K, P, LS OUT". */
  label: string
  /** Optional secondary line, e.g. a location or note. */
  note?: string
  /** Seconds before kickoff this event is scheduled. 0 === kickoff. */
  tMinusSeconds: number
  /**
   * When staff manually acknowledge a "GO NOW" alert this holds the ack
   * timestamp (ms). Cleared automatically if kickoff/schedule is edited.
   */
  acknowledgedAt?: number | null
  /** Marks the terminal KICKOFF row so it renders distinctly. */
  isKickoff?: boolean
}

export type TemplateKind =
  | 'regular'
  | 'preseason'
  | 'playoffs'
  | 'primetime'
  | 'international'
  | 'custom'

/** A reusable schedule (ordered list of events) that can be loaded per game. */
export interface ScheduleTemplate {
  id: TemplateId
  name: string
  kind: TemplateKind
  /** Human note shown in the admin template picker. */
  description?: string
  events: PregameEvent[]
  /** True for the shipped presets so the UI can label / protect them. */
  builtIn?: boolean
  updatedAt: number
}

/** Game-day metadata shown in the header. */
export interface GameInfo {
  /** The team this board is themed as. Defaults to Buffalo. */
  teamId: TeamId
  /** The opponent team id (preferred). Falls back to the free-text `opponent`. */
  opponentId?: TeamId
  /** Free-form opponent label, used when opponentId is not set. */
  opponent: string
  /** Free-form week label, e.g. "Week 1", "Wild Card", "Preseason Wk 2". */
  week: string
  /** Kickoff as an ISO 8601 string (Eastern wall time by default). */
  kickoffISO: string
  /** Home/away — affects a small header accent only. */
  homeAway: 'HOME' | 'AWAY'
  /** Stadium / location (optional). */
  venue?: string
  /** The schedule-library game this was loaded from (if any). */
  sourceGameId?: GameId
  /** Original kickoff (ISO) when this game's time was changed from the schedule. */
  originalKickoffISO?: string
}

/** A team-culture graphic shown in the rotating motivation panel. */
export interface CultureGraphic {
  id: GraphicId
  name: string
  /**
   * Image source. Either a bundled asset path ("/culture/...") or a
   * user-uploaded data URL. PNG/GIF/SVG all preserved as-is (never re-encoded).
   */
  src: string
  enabled: boolean
  /** Manual ordering index (lower shows first). */
  order: number
  /** Per-graphic display duration override in seconds (falls back to global). */
  durationSec?: number
  /**
   * Backdrop behind the artwork. Some official graphics are drawn in dark
   * colors meant for a light background (e.g. "Put The Ball Down"); a 'light'
   * matte shows them on a clean white plaque so they stay legible on the dark
   * board. 'none' (default) renders straight onto the transparent panel.
   */
  matte?: 'none' | 'light'
}

/** A text-based motivational quote shown in the rotating culture panel. */
export interface Quote {
  id: string
  /** The headline line, shown large (e.g. "PUT THE BALL DOWN."). */
  text: string
  /** Optional smaller attribution / subtext (e.g. "— Coach"). */
  author?: string
  enabled: boolean
  /** Manual ordering index (lower shows first). */
  order: number
  /** Accent color for the quote text: team blue, red, or white. */
  accent?: 'royal' | 'red' | 'white'
}

export type TransitionStyle = 'fade' | 'slide'

/** User-tunable settings that persist across sessions. */
export interface Settings {
  soundEnabled: boolean
  /** Master volume 0..1 for alert tones. */
  volume: number
  /** Colorblind-friendly alert palette (shapes + safe hues). */
  colorblindMode: boolean
  /** Culture panel rotation interval in seconds (20–30 typical). */
  cultureRotationSec: number
  cultureTransition: TransitionStyle
  /** Show optional weather widget in header. */
  showWeather: boolean
  /** Keep-awake via the Screen Wake Lock API when in TV mode. */
  keepAwake: boolean
}

/** The full persisted application state (single localStorage document). */
export interface AppState {
  version: number
  game: GameInfo
  /** The currently active schedule the board is running. */
  activeEvents: PregameEvent[]
  templates: ScheduleTemplate[]
  graphics: CultureGraphic[]
  quotes: Quote[]
  settings: Settings
  /** Selected season for the Schedule Center. */
  season: number
  /** Per-game edits, keyed by master game id (preserves the master schedule). */
  gameOverrides: Record<GameId, GameOverride>
  /** Imported / manually-added games not in the bundled master schedule. */
  customGames: NflGame[]
  /** Per-team uploaded logo (data URL) + framing to crop out wordmarks etc. */
  teamLogos: Record<TeamId, TeamLogo>
  /** Per-team editable branding overrides (colors + extra assets). */
  teamBranding?: Record<TeamId, TeamBranding>
}

/**
 * Editable branding overrides for a team, set by an org admin in Admin → Team
 * Branding. Any present value overrides the team's shipped default; the live
 * dashboard consumes the merged result, so onboarding a new customer is a
 * configuration change, never a code change. The primary logo (with crop
 * framing) lives in `teamLogos`; the remaining assets are stored here.
 */
export interface TeamBranding {
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
    /** Base background color the dark board ramp is derived from. */
    background?: string
    /** Primary on-brand text color (team name, accents). */
    text?: string
  }
  secondaryLogoUrl?: string
  wordmarkUrl?: string
  backgroundImageUrl?: string
}

/** An uploaded team logo and how to frame it (uniform crop — never distorts). */
export interface TeamLogo {
  /** Image data URL (PNG/SVG/JPG). Original artwork preserved. */
  url: string
  /** Uniform zoom (1 = fit). Used to crop out text like a wordmark. */
  zoom: number
  /** Vertical offset in % (negative moves image up, revealing the top mark). */
  offsetY: number
}

// --- Derived (runtime-only) types -----------------------------------------

/**
 * Alert urgency tiers, ordered by escalation. Drives row styling, the focus
 * panel, sound cues, and whether the culture panel steps aside.
 */
export type AlertLevel =
  | 'upcoming' // > 5 min away — calm
  | 'warn' // <= 5 min — yellow, soft pulse
  | 'imminent' // <= 2 min — flashing red, ON DECK
  | 'critical' // <= 30 sec — faster flash, larger timer
  | 'go' // 0..-60s — "GO NOW"
  | 'completed' // past + acknowledged / > 60s elapsed

/**
 * Positional operational status (independent of the time-based AlertLevel):
 * where an event sits in the run-of-show sequence.
 *   now      — happening at/just after its scheduled time
 *   ondeck   — the next group that needs to go (only the earliest pending)
 *   upcoming — everything after on-deck
 *   complete — already went out (scheduled time passed)
 */
export type OpStatus = 'now' | 'ondeck' | 'upcoming' | 'complete'

/** An event enriched with live, per-tick timing + status for rendering. */
export interface TimedEvent {
  event: PregameEvent
  /** Absolute scheduled time (ms epoch), derived from kickoff. */
  scheduledAt: number
  /** Seconds until the event (negative once it has passed). */
  secondsUntil: number
  /** Time-based urgency (drives flashing/colors/countdown emphasis). */
  level: AlertLevel
  /** Sequence position (drives the NOW / ON DECK / UPCOMING / COMPLETE label). */
  opStatus: OpStatus
  /** Index within the active schedule. */
  index: number
}
