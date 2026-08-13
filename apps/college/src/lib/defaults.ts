import type {
  AppState,
  CultureGraphic,
  PregameEvent,
  Quote,
  ScheduleTemplate,
  Settings,
} from '@gamedayops/core'
import { epochToEtWallISO, uid } from '@gamedayops/core'

// ---------------------------------------------------------------------------
// GameDayOps College Football — shipped defaults (Texas demonstration org).
//
// Nothing here is hard-coded into the UI: templates, culture graphics, and the
// starting game are editable data. "Hook 'Em Horns" is a culture SLOT with a
// clearly-labeled placeholder graphic that an authorized customer replaces with
// its own authorized artwork. Every program can build its own template — the
// one below is a sensible starting point, not an assumed routine.
// ---------------------------------------------------------------------------

const mins = (m: number, s = 0) => m * 60 + s

interface Row {
  label: string
  t: number
  note?: string
  kickoff?: boolean
}

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

// A sensible college home-game warmup structure (editable per program).
const HOME_ROWS: Row[] = [
  { label: 'SPECIALISTS OUT', t: mins(90) },
  { label: 'QUARTERBACKS OUT', t: mins(75) },
  { label: 'RETURNERS OUT', t: mins(68) },
  { label: 'OFFENSE OUT', t: mins(60) },
  { label: 'DEFENSE OUT', t: mins(58) },
  { label: 'TEAM STRETCH', t: mins(50) },
  { label: 'INDIVIDUAL', t: mins(44) },
  { label: 'ONE ON ONES', t: mins(38) },
  { label: 'SEVEN ON SEVEN', t: mins(33) },
  { label: 'TEAM', t: mins(28) },
  { label: 'LEAVE FIELD', t: mins(24) },
  { label: 'PLAYER WALK / SWAG SURF', t: mins(18) },
  { label: 'ANTHEM', t: mins(12) },
  { label: 'KICKOFF', t: 0, kickoff: true },
]

const AWAY_ROWS: Row[] = [
  { label: 'SPECIALISTS OUT', t: mins(80) },
  { label: 'QUARTERBACKS OUT', t: mins(68) },
  { label: 'OFFENSE / DEFENSE OUT', t: mins(58) },
  { label: 'TEAM STRETCH', t: mins(48) },
  { label: 'INDIVIDUAL', t: mins(42) },
  { label: 'SEVEN ON SEVEN', t: mins(33) },
  { label: 'TEAM', t: mins(28) },
  { label: 'LEAVE FIELD', t: mins(22) },
  { label: 'ANTHEM', t: mins(12) },
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
    template('College Home Game', 'regular', HOME_ROWS, 'Full home-game warmup with anthem & walk.'),
    template('College Road Game', 'custom', AWAY_ROWS, 'Condensed road-game warmup.'),
  ]
}

export function defaultGraphics(): CultureGraphic[] {
  return [
    {
      id: uid('gfx'),
      name: "Hook 'Em Horns",
      // Placeholder culture graphic — an authorized customer uploads its own
      // artwork via Admin → Team Culture. Not official trademarked artwork.
      src: '/culture/hook-em-placeholder.svg',
      enabled: true,
      order: 0,
    },
  ]
}

export function defaultQuotes(): Quote[] {
  return [
    { id: uid('qt'), text: 'PROTECT THE ROCK.', enabled: true, order: 0, accent: 'white' },
    { id: uid('qt'), text: 'EARN IT TODAY.', enabled: true, order: 1, accent: 'white' },
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

/** First-run state: Texas, kickoff seeded ~80 min out for an immediate demo. */
export function makeDefaultState(now = Date.now()): AppState {
  const templates = defaultTemplates()
  const home = templates[0]
  return {
    version: 2,
    game: {
      teamId: 'TEX',
      opponentId: 'GA',
      opponent: 'Georgia',
      week: 'Week 6',
      kickoffISO: epochToEtWallISO(now + 80 * 60 * 1000),
      homeAway: 'HOME',
      venue: 'DKR–Texas Memorial Stadium',
    },
    activeEvents: home.events.map((e) => ({ ...e })),
    templates,
    graphics: defaultGraphics(),
    quotes: defaultQuotes(),
    settings: defaultSettings(),
    season: 2026,
    gameOverrides: {},
    customGames: [],
    teamLogos: {},
  }
}
