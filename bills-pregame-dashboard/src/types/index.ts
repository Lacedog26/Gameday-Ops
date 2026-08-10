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
  opponent: string
  /** Free-form week label, e.g. "Week 1", "Wild Card", "Preseason Wk 2". */
  week: string
  /** Kickoff as an ISO 8601 string (local wall time of the stadium). */
  kickoffISO: string
  /** Home/away — affects a small header accent only. */
  homeAway: 'HOME' | 'AWAY'
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

/** An event enriched with live, per-tick timing + status for rendering. */
export interface TimedEvent {
  event: PregameEvent
  /** Absolute scheduled time (ms epoch), derived from kickoff. */
  scheduledAt: number
  /** Seconds until the event (negative once it has passed). */
  secondsUntil: number
  level: AlertLevel
  /** Index within the active schedule. */
  index: number
}
