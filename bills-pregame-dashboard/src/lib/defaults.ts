import type {
  AppState,
  CultureGraphic,
  PregameEvent,
  ScheduleTemplate,
  Settings,
} from '../types'

// ---------------------------------------------------------------------------
// Shipped defaults: the standard Bills pre-game routine (from the printed card)
// plus culture graphics, template presets, and baseline settings.
// ---------------------------------------------------------------------------

let seq = 0
const uid = (prefix: string) => `${prefix}_${(seq++).toString(36)}_${Math.random().toString(36).slice(2, 7)}`

/** Terse helper: minutes[.seconds] before kickoff. */
const mins = (m: number, s = 0) => m * 60 + s

interface Row {
  label: string
  t: number // tMinusSeconds
  note?: string
  kickoff?: boolean
}

/** Build a fresh event list (new ids) from a compact row spec. */
function buildEvents(rows: Row[]): PregameEvent[] {
  return rows.map((r) => ({
    id: uid('evt'),
    label: r.label,
    note: r.note,
    tMinusSeconds: r.t,
    acknowledgedAt: null,
    isKickoff: r.kickoff,
  }))
}

// The canonical routine transcribed from the Buffalo Bills pre-game card.
const REGULAR_ROWS: Row[] = [
  { label: 'K, P, LS OUT', t: mins(77) },
  { label: 'RETURNERS OUT', t: mins(62) },
  { label: 'DB OUT', t: mins(50) },
  { label: 'QB, C, TE, WR, RB OUT', t: mins(50) },
  { label: 'PAT & GO', t: mins(47) },
  { label: 'OL, DL, LB OUT', t: mins(44) },
  { label: 'TEAM STRETCH', t: mins(44) },
  { label: 'INDIVIDUAL', t: mins(38) },
  { label: "1 ON 1'S", t: mins(35, 30) },
  { label: '7 ON 7', t: mins(33) },
  { label: 'TEAM', t: mins(30) },
  { label: 'LEAVE FIELD', t: mins(27) },
  { label: '2 MINUTE WARNING', t: mins(12) },
  { label: 'KICKOFF', t: 0, kickoff: true },
]

// Preseason: slightly condensed, fewer team periods.
const PRESEASON_ROWS: Row[] = [
  { label: 'K, P, LS OUT', t: mins(70) },
  { label: 'RETURNERS OUT', t: mins(58) },
  { label: 'SPECIALISTS / PAT & GO', t: mins(50) },
  { label: 'QB, C, TE, WR, RB OUT', t: mins(46) },
  { label: 'DB, OL, DL, LB OUT', t: mins(44) },
  { label: 'TEAM STRETCH', t: mins(42) },
  { label: 'INDIVIDUAL', t: mins(36) },
  { label: '7 ON 7', t: mins(31) },
  { label: 'TEAM', t: mins(28) },
  { label: 'LEAVE FIELD', t: mins(25) },
  { label: '2 MINUTE WARNING', t: mins(12) },
  { label: 'KICKOFF', t: 0, kickoff: true },
]

// Primetime / Playoffs: extended warmups and ceremony buffer.
const PRIMETIME_ROWS: Row[] = [
  { label: 'K, P, LS OUT', t: mins(85) },
  { label: 'RETURNERS OUT', t: mins(70) },
  { label: 'DB OUT', t: mins(56) },
  { label: 'QB, C, TE, WR, RB OUT', t: mins(56) },
  { label: 'PAT & GO', t: mins(52) },
  { label: 'OL, DL, LB OUT', t: mins(48) },
  { label: 'TEAM STRETCH', t: mins(48) },
  { label: 'INDIVIDUAL', t: mins(41) },
  { label: "1 ON 1'S", t: mins(38) },
  { label: '7 ON 7', t: mins(35) },
  { label: 'TEAM', t: mins(31) },
  { label: 'LEAVE FIELD', t: mins(27) },
  { label: 'PLAYER INTRODUCTIONS', t: mins(18) },
  { label: 'ANTHEM', t: mins(14) },
  { label: '2 MINUTE WARNING', t: mins(12) },
  { label: 'KICKOFF', t: 0, kickoff: true },
]

function template(
  name: string,
  kind: ScheduleTemplate['kind'],
  rows: Row[],
  description: string,
): ScheduleTemplate {
  return {
    id: uid('tpl'),
    name,
    kind,
    description,
    events: buildEvents(rows),
    builtIn: true,
    updatedAt: Date.now(),
  }
}

export function defaultTemplates(): ScheduleTemplate[] {
  return [
    template('Regular Season', 'regular', REGULAR_ROWS, 'Standard 77-minute home routine.'),
    template('Preseason', 'preseason', PRESEASON_ROWS, 'Condensed preseason warmup.'),
    template('Primetime / Playoffs', 'primetime', PRIMETIME_ROWS, 'Extended routine with intros & anthem.'),
  ]
}

export function defaultGraphics(): CultureGraphic[] {
  return [
    {
      id: uid('gfx'),
      name: 'They Have To Play Us',
      // Official team artwork (transparent PNG, trimmed to the logo bounds).
      src: '/culture/they-have-to-play-us.png',
      enabled: true,
      order: 0,
    },
    {
      id: uid('gfx'),
      name: 'Put The Ball Down',
      src: '/culture/put-the-ball-down.svg',
      enabled: true,
      order: 1,
    },
    {
      id: uid('gfx'),
      name: 'Bills Mafia',
      src: '/culture/bills-mafia.svg',
      enabled: true,
      order: 2,
    },
  ]
}

export function defaultSettings(): Settings {
  return {
    soundEnabled: true,
    volume: 0.6,
    colorblindMode: false,
    cultureRotationSec: 25,
    cultureTransition: 'fade',
    showWeather: false,
    keepAwake: true,
  }
}

/**
 * A complete first-run state. Kickoff is seeded ~80 minutes out so the board is
 * immediately "live" and demonstrates the full alert escalation on first open.
 */
export function makeDefaultState(now = Date.now()): AppState {
  const templates = defaultTemplates()
  const regular = templates[0]
  const kickoff = new Date(now + 80 * 60 * 1000)
  return {
    version: 1,
    game: {
      opponent: 'New York Jets',
      week: 'Week 1',
      kickoffISO: toLocalISO(kickoff),
      homeAway: 'HOME',
    },
    // Deep-copy the regular template's events so editing the active schedule
    // never mutates the stored template.
    activeEvents: regular.events.map((e) => ({ ...e })),
    templates,
    graphics: defaultGraphics(),
    settings: defaultSettings(),
  }
}

/**
 * Produce a `YYYY-MM-DDTHH:mm` string in LOCAL time (what <input type=datetime-local>
 * expects and what the header shows as stadium wall-clock time).
 */
export function toLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

export { uid }
