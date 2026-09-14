#!/usr/bin/env node
/**
 * GameDayOps College — CollegeFootballData (CFBD) schedule importer.
 *
 * Pulls the real FBS + FCS schedule for a season from the free CollegeFootballData
 * API and writes a JSON file you import in Admin → Schedule Center → "Import
 * Schedule (JSON)". It NEVER invents data: unknown kickoff times are emitted as
 * TBD (status 'time_tbd', empty time). Team names are mapped to GameDayOps team
 * ids using this app's own team file, so ids always stay in sync.
 *
 * USAGE:
 *   1) Get a FREE API key: https://collegefootballdata.com/key
 *   2) CFBD_KEY=xxxxx node apps/college/scripts/import-cfbd.mjs 2025
 *   3) Import the generated college-schedule-<year>.json in the admin.
 *
 * Output row shape matches the app's NflGame model (per-team rows: one for the
 * home team and one for the away team, so every team's schedule populates).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const KEY = process.env.CFBD_KEY
const SEASON = Number(process.argv[2] || 2025)
if (!KEY) {
  console.error('Missing CFBD_KEY. Get a free key at https://collegefootballdata.com/key')
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const teamsFile = readFileSync(join(here, '../src/data/collegeTeams.ts'), 'utf8')

// Build school-name -> team id from our own data file (stays in sync).
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const nameToId = {}
for (const m of teamsFile.matchAll(/c\('([A-Z0-9]+)',\s*'([^']+)'/g)) {
  nameToId[norm(m[2])] = m[1]
}
// A few common CFBD spellings that differ from our `school` field:
const ALIASES = {
  [norm('UConn')]: 'UCONN', [norm('Connecticut')]: 'UCONN',
  [norm('Miami')]: 'MIAF', [norm('Miami (OH)')]: 'MIOH',
  [norm('Sam Houston')]: 'SHSU', [norm('Sam Houston State')]: 'SHSU',
  [norm('Louisiana')]: 'ULL', [norm('UL Monroe')]: 'ULM',
  [norm('App State')]: 'APP', [norm('Appalachian State')]: 'APP',
}
const idFor = (school) => nameToId[norm(school)] ?? ALIASES[norm(school)] ?? null

// UTC ISO -> Eastern wall-clock parts ('YYYY-MM-DD', 'HH:MM').
const etParts = (iso) => {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  const p = Object.fromEntries(dtf.formatToParts(new Date(iso)).filter(x => x.type !== 'literal').map(x => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` }
}

async function fetchGames(classification) {
  const url = `https://api.collegefootballdata.com/games?year=${SEASON}&seasonType=both&classification=${classification}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`CFBD ${classification} ${res.status}: ${await res.text()}`)
  return res.json()
}

const rows = []
const unmapped = new Set()
function emit(g, teamId, oppId, oppName, homeAway) {
  const tbd = g.startTimeTBD || !g.startDate
  const { date, time } = g.startDate ? etParts(g.startDate) : { date: '', time: '' }
  const phase = g.seasonType === 'postseason' ? 'postseason' : 'regular'
  rows.push({
    id: `${teamId}-${SEASON}-${phase}-${g.week ?? 0}-${g.id}`,
    season: SEASON, teamId, phase,
    week: g.week ?? 0,
    weekLabel: phase === 'postseason' ? (g.notes || 'Postseason') : `Week ${g.week ?? 0}`,
    date, time: tbd ? '' : time,
    opponentId: oppId ?? undefined,
    opponentName: oppName,
    homeAway,
    venue: g.venue || undefined,
    status: tbd ? 'time_tbd' : 'scheduled',
    notes: g.conferenceGame ? 'Conference game' : 'Non-conference',
  })
}

for (const cls of ['fbs', 'fcs']) {
  const games = await fetchGames(cls)
  for (const g of games) {
    const homeId = idFor(g.homeTeam), awayId = idFor(g.awayTeam)
    if (!homeId) unmapped.add(g.homeTeam)
    if (!awayId) unmapped.add(g.awayTeam)
    if (homeId) emit(g, homeId, awayId, g.awayTeam, 'HOME')
    if (awayId) emit(g, awayId, homeId, g.homeTeam, 'AWAY')
  }
}

const out = join(process.cwd(), `college-schedule-${SEASON}.json`)
writeFileSync(out, JSON.stringify(rows, null, 2))
console.log(`Wrote ${rows.length} team-game rows to ${out}`)
if (unmapped.size) console.log(`Unmapped opponents (kept as text names): ${[...unmapped].sort().join(', ')}`)
