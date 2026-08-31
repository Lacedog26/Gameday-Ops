import type { NflGame } from '../types'
import { uid } from './id'

// ---------------------------------------------------------------------------
// Schedule parsing — turn messy real-world input (CSV, a pasted table, a
// spreadsheet, or text lifted from a PDF/screenshot) into structured, VALIDATED
// game rows. Nothing here writes to state; the UI shows an editable preview and
// the human confirms before anything becomes the org's active schedule.
//
// Deliberately forgiving on input, strict on output: every row is normalized to
// { week, date(YYYY-MM-DD), time(HH:MM 24h), opponent, HOME/AWAY, venue } and
// carries any errors so the reviewer can fix them before import.
// ---------------------------------------------------------------------------

export interface ParsedRow {
  week: number | null
  weekLabel: string
  date: string // YYYY-MM-DD, or '' when TBD/unparseable
  time: string // HH:MM 24h, or '' when TBD
  opponentId?: string
  opponentName: string
  homeAway: 'HOME' | 'AWAY'
  venue: string
  errors: string[]
}

export interface TeamLite {
  id: string
  name: string
  shortName?: string
  abbr?: string
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

/** Normalize free text for fuzzy matching (lowercase, strip punctuation). */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Best-effort opponent name → team id. Returns undefined if no confident match. */
export function matchOpponent(raw: string, teams: TeamLite[]): string | undefined {
  const n = norm(raw)
  if (!n) return undefined
  let best: { id: string; score: number } | undefined
  for (const t of teams) {
    const candidates = [t.name, t.shortName, t.abbr].filter(Boolean).map((c) => norm(c as string))
    for (const c of candidates) {
      if (!c) continue
      let score = 0
      if (c === n) score = 100
      else if (n.includes(c) || c.includes(n)) score = Math.min(c.length, n.length)
      if (score && (!best || score > best.score)) best = { id: t.id, score }
    }
  }
  return best && best.score >= 3 ? best.id : undefined
}

/** Parse a date in many common formats to "YYYY-MM-DD". seasonYear disambiguates. */
export function parseDate(raw: string, seasonYear: number): string {
  const s = raw.trim()
  if (!s || /tbd|tba/i.test(s)) return ''
  // ISO: 2026-09-05
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  // Numeric: 9/5/2026 or 09-05-26 or 9.5
  m = s.match(/\b(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?\b/)
  if (m) {
    const mo = +m[1], da = +m[2]
    let yr = m[3] ? +m[3] : seasonYear
    if (yr < 100) yr += 2000
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) return `${yr}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`
  }
  // Month-name: "Sept 5", "September 5, 2026", "Sat, Sep 5"
  m = s.match(/([a-z]{3,9})\.?\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i)
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()]
    const da = +m[2]
    if (mo && da >= 1 && da <= 31) {
      // No year given: football season spans one calendar year (Aug–Jan). Months
      // Jan–Feb belong to the following year relative to an Aug-anchored season.
      const yr = m[3] ? +m[3] : mo <= 2 ? seasonYear + 1 : seasonYear
      return `${yr}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`
    }
  }
  return ''
}

/** Parse a time like "7:00 PM", "7 PM", "19:00", "noon", "TBD" to "HH:MM" 24h. */
export function parseTime(raw: string): string {
  const s = raw.trim().toLowerCase()
  if (!s || /tbd|tba/.test(s)) return ''
  if (/noon/.test(s)) return '12:00'
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/)
  if (!m) return ''
  let h = +m[1]
  const min = m[2] ? +m[2] : 0
  const ap = m[3]?.replace(/\./g, '')
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return ''
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Detect HOME/AWAY from a cell or an opponent string ("@", "at", "vs", "H"/"A"). */
function parseHomeAway(cell: string, opponent: string): 'HOME' | 'AWAY' {
  const c = ` ${cell.toLowerCase()} `
  if (/\b(away|@|at|a)\b/.test(c) || /^\s*[@]/.test(opponent) || /^\s*at\s+/i.test(opponent)) return 'AWAY'
  if (/\b(home|vs|v|h)\b/.test(c)) return 'HOME'
  return 'HOME'
}

/** Split one line into fields, honoring commas, tabs, pipes, or 2+ spaces. */
function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t')
  if (line.includes('|')) return line.split('|')
  if (line.includes(',')) return parseCsvLine(line)
  // Fallback: 2+ spaces as a column boundary (common when pasted from a PDF).
  return line.split(/\s{2,}/)
}

/** Minimal CSV line parser (handles quoted fields with embedded commas). */
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

const HEADER_KEYS: Record<string, keyof ColumnMap> = {
  week: 'week', wk: 'week', game: 'week',
  date: 'date', day: 'date',
  opponent: 'opp', opp: 'opp', vs: 'opp', team: 'opp', matchup: 'opp',
  time: 'time', kickoff: 'time', kick: 'time', start: 'time',
  home: 'homeAway', away: 'homeAway', location: 'homeAway', loc: 'homeAway', site: 'homeAway', 'h/a': 'homeAway',
  venue: 'venue', stadium: 'venue', place: 'venue',
}
interface ColumnMap { week?: number; date?: number; opp?: number; time?: number; homeAway?: number; venue?: number }

function detectHeader(cells: string[]): ColumnMap | null {
  const map: ColumnMap = {}
  let hits = 0
  cells.forEach((cell, i) => {
    const key = HEADER_KEYS[norm(cell).replace(/\s+/g, '')] ?? HEADER_KEYS[norm(cell)]
    if (key && map[key] === undefined) { map[key] = i; hits++ }
  })
  return hits >= 2 ? map : null
}

/**
 * Parse tabular schedule text into rows. Works for CSV, TSV, pipe tables, and
 * space-aligned text pasted from a PDF. Uses a header row when present, else a
 * positional heuristic. Every row is validated; unparseable ones still appear
 * (with errors) so the reviewer can fix rather than silently drop them.
 */
export function parseScheduleText(
  text: string,
  opts: { season: number; teams: TeamLite[] },
): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []

  let colMap = detectHeader(splitLine(lines[0]))
  const dataLines = colMap ? lines.slice(1) : lines
  const rows: ParsedRow[] = []
  let autoWeek = 0

  for (const line of dataLines) {
    const cells = splitLine(line).map((c) => c.trim())
    if (!cells.some(Boolean)) continue
    // Skip an obvious repeated header / separator row.
    if (!colMap && /^(week|date|opponent|kickoff|time)$/i.test(norm(cells[0]))) continue

    let weekCell = '', dateCell = '', oppCell = '', timeCell = '', haCell = '', venueCell = ''
    if (colMap) {
      const at = (i?: number) => (i === undefined ? '' : cells[i] ?? '')
      weekCell = at(colMap.week); dateCell = at(colMap.date); oppCell = at(colMap.opp)
      timeCell = at(colMap.time); haCell = at(colMap.homeAway); venueCell = at(colMap.venue)
    } else {
      // Positional heuristic: [week?] date opponent [time] [venue]
      const rest = [...cells]
      if (/^\d{1,2}$/.test(rest[0]) && +rest[0] <= 25) weekCell = rest.shift() as string
      // Find the date cell (first cell that parses as a date).
      const di = rest.findIndex((c) => parseDate(c, opts.season))
      if (di >= 0) { dateCell = rest.splice(di, 1)[0] }
      // Find the time cell (first that parses as a time).
      const ti = rest.findIndex((c) => parseTime(c) && !parseDate(c, opts.season))
      if (ti >= 0) { timeCell = rest.splice(ti, 1)[0] }
      // Remaining: opponent (+ maybe venue). Longest cell = opponent.
      rest.sort((a, b) => b.length - a.length)
      oppCell = rest[0] ?? ''
      venueCell = rest[1] ?? ''
      haCell = oppCell
    }

    const week = weekCell && /\d/.test(weekCell) ? parseInt(weekCell.replace(/\D/g, ''), 10) : ++autoWeek
    const date = parseDate(dateCell, opts.season)
    const time = parseTime(timeCell)
    const homeAway = parseHomeAway(haCell, oppCell)
    const opponentName = oppCell.replace(/^\s*(@|at|vs\.?|v\.?)\s+/i, '').trim()
    const opponentId = matchOpponent(opponentName, opts.teams)

    const errors: string[] = []
    if (!opponentName) errors.push('Missing opponent')
    if (!date) errors.push('Missing/invalid date')
    if (!time) errors.push('Kickoff time TBD')

    rows.push({
      week: Number.isFinite(week) ? week : null,
      weekLabel: `Week ${Number.isFinite(week) ? week : autoWeek}`,
      date, time, opponentId, opponentName, homeAway,
      venue: venueCell, errors,
    })
  }
  return rows
}

export type RowStatus = 'new' | 'updated' | 'unchanged' | 'duplicate' | 'error'

export interface DiffRow extends ParsedRow {
  status: RowStatus
  /** For 'updated': what changed vs the existing game. */
  changes?: string[]
}

/** Classify parsed rows against the org's existing games for this team/season. */
export function diffSchedule(rows: ParsedRow[], existing: NflGame[]): DiffRow[] {
  const byWeek = new Map<number, NflGame>()
  for (const g of existing) byWeek.set(g.week, g)
  const seenWeeks = new Set<number>()

  return rows.map((r) => {
    if (r.errors.some((e) => e.startsWith('Missing'))) return { ...r, status: 'error' as RowStatus }
    if (r.week != null && seenWeeks.has(r.week)) return { ...r, status: 'duplicate' as RowStatus }
    if (r.week != null) seenWeeks.add(r.week)

    const prev = r.week != null ? byWeek.get(r.week) : undefined
    if (!prev) return { ...r, status: 'new' as RowStatus }

    const changes: string[] = []
    if (prev.date !== r.date) changes.push(`date ${prev.date || 'TBD'} → ${r.date || 'TBD'}`)
    if (prev.time !== r.time) changes.push(`kickoff ${prev.time || 'TBD'} → ${r.time || 'TBD'}`)
    // Opponent is unchanged if the matched ids agree; otherwise compare names.
    const oppSame = r.opponentId && prev.opponentId
      ? r.opponentId === prev.opponentId
      : norm(prev.opponentName ?? prev.opponentId ?? '') === norm(r.opponentName)
    if (!oppSame) changes.push(`opponent ${prev.opponentName ?? prev.opponentId ?? '?'} → ${r.opponentName}`)
    if (prev.homeAway !== r.homeAway) changes.push(`${prev.homeAway} → ${r.homeAway}`)
    return changes.length ? { ...r, status: 'updated' as RowStatus, changes } : { ...r, status: 'unchanged' as RowStatus }
  })
}

/** Convert confirmed rows into structured game records for a team+season. */
export function rowsToGames(rows: ParsedRow[], opts: { teamId: string; season: number }): NflGame[] {
  return rows.map((r) => ({
    id: uid(`${opts.teamId}-${opts.season}-w${r.week ?? 0}`),
    season: opts.season,
    teamId: opts.teamId,
    phase: 'regular',
    week: r.week ?? 0,
    weekLabel: r.weekLabel || `Week ${r.week ?? 0}`,
    date: r.date,
    time: r.time,
    opponentId: r.opponentId,
    opponentName: r.opponentId ? undefined : r.opponentName || undefined,
    homeAway: r.homeAway,
    venue: r.venue || undefined,
    status: r.time ? 'scheduled' : 'time_tbd',
  }))
}
