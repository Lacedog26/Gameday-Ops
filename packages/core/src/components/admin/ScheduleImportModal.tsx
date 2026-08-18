import { useMemo, useRef, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { getTeam, masterGames, teamsByDivision } from '../../product'
import {
  diffSchedule,
  parseScheduleText,
  rowsToGames,
  type DiffRow,
  type ParsedRow,
  type RowStatus,
  type TeamLite,
} from '../../lib/scheduleParse'
import { Button } from './ui'

// ---------------------------------------------------------------------------
// Universal schedule importer. Accepts a CSV, a spreadsheet (.xlsx), a PDF, or
// pasted text, turns it into structured rows, and shows an EDITABLE review grid
// with a diff (new / updated / unchanged / duplicate / error) before anything is
// saved. Nothing imports blindly — the human confirms, and only then does the
// schedule become the organization's source of truth (per team + season).
// ---------------------------------------------------------------------------

const STATUS_STYLE: Record<RowStatus, string> = {
  new: 'bg-emerald-500/20 text-emerald-300',
  updated: 'bg-amber-400/20 text-amber-300',
  unchanged: 'bg-white/10 text-slate-400',
  duplicate: 'bg-orange-500/20 text-orange-300',
  error: 'bg-red-500/25 text-red-300',
}

export default function ScheduleImportModal({ onClose }: { onClose: () => void }) {
  const { state, actions } = useDashboard()
  const teamId = state.game.teamId
  const season = state.season
  const teamName = getTeam(teamId).name
  const fileRef = useRef<HTMLInputElement>(null)

  const teams: TeamLite[] = useMemo(
    () => teamsByDivision().flatMap((d) => d.teams.map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, abbr: t.abbr }))),
    [],
  )
  const existing = useMemo(() => {
    const master = masterGames(teamId, season)
    const custom = state.customGames.filter((g) => g.teamId === teamId && g.season === season)
    return [...master, ...custom]
  }, [teamId, season, state.customGames])

  const [text, setText] = useState('')
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  // Recompute the diff live as the reviewer edits rows.
  const diff: DiffRow[] = useMemo(() => (rows ? diffSchedule(rows, existing) : []), [rows, existing])
  const counts = useMemo(() => {
    const c: Record<RowStatus, number> = { new: 0, updated: 0, unchanged: 0, duplicate: 0, error: 0 }
    diff.forEach((d) => (c[d.status] += 1))
    return c
  }, [diff])

  function ingest(parsed: ParsedRow[], label: string) {
    if (!parsed.length) {
      setNote(`Couldn't find any games in ${label}. Paste the rows below and press Parse, or type them in.`)
      return
    }
    setRows(parsed)
    setNote(`${parsed.length} games read from ${label}. Review and fix anything highlighted, then Confirm.`)
  }

  async function onFile(file: File) {
    setBusy(true)
    setNote('')
    try {
      const ext = file.name.toLowerCase().split('.').pop() ?? ''
      if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])
        ingest(parseScheduleText(csv, { season, teams }), file.name)
      } else if (ext === 'pdf') {
        const text = await extractPdfText(await file.arrayBuffer())
        if (!text.trim()) {
          setNote('That PDF has no selectable text (likely a scan/image). Open it, copy the schedule, and paste below.')
        } else {
          ingest(parseScheduleText(text, { season, teams }), file.name)
        }
      } else if (file.type.startsWith('image/')) {
        setNote('Image detected. Automatic reading of photos isn’t reliable — type the games into the grid, or paste the text below, then Parse.')
        if (!rows) setRows([blankRow(1)])
      } else {
        ingest(parseScheduleText(await file.text(), { season, teams }), file.name)
      }
    } catch (e) {
      setNote(`Couldn't read that file (${e instanceof Error ? e.message : 'error'}). Try CSV, or paste the rows below.`)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function parsePasted() {
    ingest(parseScheduleText(text, { season, teams }), 'the pasted text')
  }

  function editRow(i: number, patch: Partial<ParsedRow>) {
    setRows((rs) => {
      if (!rs) return rs
      const next = rs.slice()
      const row = { ...next[i], ...patch }
      // Re-match opponent + re-validate on edit.
      if (patch.opponentName !== undefined) {
        const m = teams.find((t) => t.name.toLowerCase() === patch.opponentName!.toLowerCase())
        row.opponentId = m?.id
      }
      row.errors = validate(row)
      next[i] = row
      return next
    })
  }
  function deleteRow(i: number) {
    setRows((rs) => (rs ? rs.filter((_, j) => j !== i) : rs))
  }
  function addRow() {
    setRows((rs) => [...(rs ?? []), blankRow((rs?.length ?? 0) + 1)])
  }

  function confirmImport() {
    // Import every non-error row as the team/season schedule (source of truth).
    const keep = (rows ?? []).filter((r) => !validate(r).some((e) => e.startsWith('Missing')))
    if (!keep.length) {
      setNote('Nothing to import — every row is missing an opponent or date. Fix the highlighted rows first.')
      return
    }
    const games = rowsToGames(keep, { teamId, season })
    actions.importGames(games)
    onClose()
  }

  const importable = diff.filter((d) => d.status !== 'error').length

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4" onClick={onClose}>
      <div
        className="my-auto flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-white/15 bg-navy-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <div className="font-display text-xl font-extrabold uppercase tracking-wide">Import Schedule</div>
            <div className="text-xs text-slate-400">
              {teamName} · {season} — CSV, spreadsheet, PDF, or paste. Reviewed before it goes live.
            </div>
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-slate-400 hover:bg-white/10 hover:text-white">✕</button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          {/* Input row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-navy-950/50 p-4">
              <div className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-300">Upload a file</div>
              <Button onClick={() => fileRef.current?.click()} disabled={busy}>
                {busy ? 'Reading…' : 'Choose file (CSV / XLSX / PDF / image)'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
              <p className="mt-2 text-xs text-slate-500">Text-based PDFs read automatically. Photos/scans: paste or type.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-navy-950/50 p-4">
              <div className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-300">…or paste the schedule</div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder={'Week, Date, Opponent, Home/Away, Kickoff\n1, Sep 6, Rice, Home, 7:00 PM'}
                className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
              <Button variant="ghost" onClick={parsePasted} className="mt-2" disabled={!text.trim()}>Parse pasted text</Button>
            </div>
          </div>

          {note && (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{note}</p>
          )}

          {/* Review grid */}
          {rows && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <Chip cls={STATUS_STYLE.new}>{counts.new} NEW</Chip>
                <Chip cls={STATUS_STYLE.updated}>{counts.updated} UPDATED</Chip>
                <Chip cls={STATUS_STYLE.unchanged}>{counts.unchanged} UNCHANGED</Chip>
                {counts.duplicate > 0 && <Chip cls={STATUS_STYLE.duplicate}>{counts.duplicate} DUPLICATE</Chip>}
                {counts.error > 0 && <Chip cls={STATUS_STYLE.error}>{counts.error} NEEDS FIX</Chip>}
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="bg-white/5 text-left text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2 w-14">Wk</th>
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Opponent</th>
                      <th className="px-2 py-2 w-24">H/A</th>
                      <th className="px-2 py-2">Kickoff</th>
                      <th className="px-2 py-2">Venue</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((d, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-2 py-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[d.status]}`}>
                            {d.status.toUpperCase()}
                          </span>
                          {d.status === 'updated' && d.changes && (
                            <div className="mt-0.5 text-[10px] text-amber-300/80">{d.changes.join('; ')}</div>
                          )}
                          {d.errors.length > 0 && (
                            <div className="mt-0.5 text-[10px] text-red-300/80">{d.errors.join('; ')}</div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.week ?? ''} onChange={(e) => editRow(i, { week: e.target.value ? +e.target.value : null, weekLabel: `Week ${e.target.value}` })}
                            className="w-12 rounded bg-white/[0.06] px-1.5 py-1 outline-none focus:bg-white/10" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="date" value={d.date} onChange={(e) => editRow(i, { date: e.target.value })}
                            className="rounded bg-white/[0.06] px-1.5 py-1 outline-none focus:bg-white/10" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input list="gdo-teamlist" value={d.opponentName} onChange={(e) => editRow(i, { opponentName: e.target.value })}
                            className={`w-40 rounded px-1.5 py-1 outline-none focus:bg-white/10 ${d.opponentId ? 'bg-white/[0.06]' : 'bg-amber-500/10'}`} />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={d.homeAway} onChange={(e) => editRow(i, { homeAway: e.target.value as 'HOME' | 'AWAY' })}
                            className="rounded bg-white/[0.06] px-1.5 py-1 outline-none focus:bg-white/10">
                            <option value="HOME">Home</option>
                            <option value="AWAY">Away</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="time" value={d.time} onChange={(e) => editRow(i, { time: e.target.value })}
                            className="rounded bg-white/[0.06] px-1.5 py-1 outline-none focus:bg-white/10" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.venue} onChange={(e) => editRow(i, { venue: e.target.value })}
                            className="w-28 rounded bg-white/[0.06] px-1.5 py-1 outline-none focus:bg-white/10" />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button onClick={() => deleteRow(i)} className="rounded px-2 py-1 text-slate-500 hover:bg-red-500/20 hover:text-red-300">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <datalist id="gdo-teamlist">
                  {teams.map((t) => <option key={t.id} value={t.name} />)}
                </datalist>
              </div>
              <Button variant="ghost" onClick={addRow} className="w-fit">+ Add a game</Button>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          <p className="text-xs text-slate-500">
            {rows ? `${importable} game${importable === 1 ? '' : 's'} will be saved to ${teamName} · ${season}. This becomes the active schedule.` : 'The master schedule is never invented — nothing is saved until you Confirm.'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={confirmImport} disabled={!rows || importable === 0}>Confirm Import</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={`rounded-full px-2.5 py-1 ${cls}`}>{children}</span>
}

function blankRow(week: number): ParsedRow {
  return { week, weekLabel: `Week ${week}`, date: '', time: '', opponentName: '', homeAway: 'HOME', venue: '', errors: ['Missing opponent', 'Missing/invalid date'] }
}

function validate(r: ParsedRow): string[] {
  const errors: string[] = []
  if (!r.opponentName.trim()) errors.push('Missing opponent')
  if (!r.date) errors.push('Missing/invalid date')
  if (!r.time) errors.push('Kickoff time TBD')
  return errors
}

/** Extract selectable text from a text-based PDF using pd.js (lazy-loaded). */
async function extractPdfText(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Run the parser on the main thread (no separate worker asset to host).
  ;(pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = ''
  const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false, useWorkerFetch: false }).promise
  const lines: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    // Group text items into visual lines by their y-position.
    const byY = new Map<number, { x: number; s: string }[]>()
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = Math.round(item.transform[5])
      if (!byY.has(y)) byY.set(y, [])
      byY.get(y)!.push({ x: item.transform[4], s: item.str })
    }
    ;[...byY.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => {
        const line = items.sort((a, b) => a.x - b.x).map((it) => it.s).join('  ').trim()
        if (line) lines.push(line)
      })
  }
  return lines.join('\n')
}
