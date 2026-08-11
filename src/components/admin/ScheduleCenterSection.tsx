import { useMemo, useRef, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import { getTeam, teamsByDivision } from '../../data/nflTeams'
import {
  AVAILABLE_SEASONS,
  applyOverride,
  gameKickoffISO,
  masterGames,
} from '../../data/nflSchedule'
import type { GameInfo, GameOverride, NflGame } from '../../types'
import { etWallTimeToEpoch, formatClock } from '../../lib/time'
import { Section, Field, TextInput, Select, Button, IconButton } from './ui'

// --- date/time helpers (ET) -------------------------------------------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmtDate(date: string): string {
  if (!date) return 'Date TBD'
  const [y, m, d] = date.split('-').map(Number)
  const dow = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${dow}, ${MONTHS[m - 1]} ${d}`
}
function fmtTime(time: string): string {
  if (!time) return 'TBD'
  const [h, mm] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  let hh = h % 12
  if (hh === 0) hh = 12
  return `${hh}:${String(mm).padStart(2, '0')} ${ampm}`
}

/** The Schedule Center: pick a team + season, see its games, edit, and load. */
export default function ScheduleCenterSection() {
  const { state, actions } = useDashboard()
  const viewTeamId = state.game.teamId
  const team = getTeam(viewTeamId)
  const divisions = teamsByDivision()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmGame, setConfirmGame] = useState<NflGame | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  // Merge master + custom games for this team/season, then apply overrides.
  const games = useMemo(() => {
    const master = masterGames(viewTeamId, state.season)
    const custom = state.customGames.filter(
      (g) => g.teamId === viewTeamId && g.season === state.season,
    )
    const all = [...master, ...custom]
    const phaseOrder: Record<string, number> = { preseason: 0, regular: 1, postseason: 2 }
    return all
      .map((g) => ({ base: g, current: applyOverride(g, state.gameOverrides[g.id]) }))
      .sort((a, b) => {
        const pa = phaseOrder[a.current.phase] ?? 3
        const pb = phaseOrder[b.current.phase] ?? 3
        return pa !== pb ? pa - pb : a.current.week - b.current.week
      })
  }, [viewTeamId, state.season, state.customGames, state.gameOverrides])

  const preseason = games.filter((g) => g.current.phase === 'preseason')
  const regular = games.filter((g) => g.current.phase === 'regular')

  const tbdCount = games.filter(
    (g) => g.current.status === 'time_tbd' || g.current.status === 'date_tbd',
  ).length
  const modifiedCount = games.filter((g) => state.gameOverrides[g.base.id]).length

  const importJSON = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      const arr: NflGame[] = Array.isArray(parsed) ? parsed : parsed.games
      if (!Array.isArray(arr) || !arr.every((g) => g.id && g.teamId && g.season)) {
        alert('Invalid schedule JSON. Expected an array of games with id, teamId, season.')
        return
      }
      actions.importGames(arr)
      alert(`Imported ${arr.length} games.`)
    } catch {
      alert('Could not read that file.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Section title="Schedule Center" subtitle="Preloaded NFL schedule — pick a game to load" accent="red">
      {/* Stats + selectors */}
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Season" value={String(state.season)} />
        <Stat label="Games" value={String(games.length || 0)} />
        <Stat label="TBD" value={String(tbdCount)} />
        <Stat label="Modified" value={String(modifiedCount)} accent={modifiedCount > 0} />
      </div>

      <div className="mb-4 grid items-end gap-3 sm:grid-cols-[1fr_160px]">
        <Field label="Team">
          <Select value={viewTeamId} onChange={(e) => actions.setGame({ teamId: e.target.value })}>
            {divisions.map((d) => (
              <optgroup key={d.label} label={d.label}>
                {d.teams.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Season">
          <Select value={state.season} onChange={(e) => actions.setSeason(Number(e.target.value))}>
            {AVAILABLE_SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {games.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-navy-950/50 p-6 text-center">
          <p className="text-slate-300">
            No preloaded schedule for <span className="font-bold text-white">{team.name}</span> yet.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Import the official schedule (JSON) to populate it — the app never invents games.
          </p>
          <div className="mt-3">
            <Button onClick={() => fileRef.current?.click()}>Import Schedule (JSON)</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <PhaseGroup
            title="Preseason"
            rows={preseason}
            overrides={state.gameOverrides}
            editId={editId}
            onEdit={(id) => setEditId(editId === id ? null : id)}
            onLoad={(g) => setConfirmGame(g)}
          />
          <PhaseGroup
            title="Regular Season"
            rows={regular}
            overrides={state.gameOverrides}
            editId={editId}
            onEdit={(id) => setEditId(editId === id ? null : id)}
            onLoad={(g) => setConfirmGame(g)}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
          ⬆ Import Schedule (JSON)
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])}
        />
        <span className="text-xs text-slate-500">
          Master schedule is never overwritten — edits are stored as overrides.
        </span>
      </div>

      {/* Inline editor */}
      {editId && (
        <EditGame
          key={editId}
          gameId={editId}
          onClose={() => setEditId(null)}
        />
      )}

      {/* Load confirmation */}
      {confirmGame && (
        <LoadConfirm game={confirmGame} onClose={() => setConfirmGame(null)} />
      )}
    </Section>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-950/50 px-4 py-2.5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`font-display text-2xl font-extrabold ${accent ? 'text-alert-warn' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}

interface RowData {
  base: NflGame
  current: NflGame
}

function PhaseGroup({
  title,
  rows,
  overrides,
  editId,
  onEdit,
  onLoad,
}: {
  title: string
  rows: RowData[]
  overrides: Record<string, GameOverride>
  editId: string | null
  onEdit: (id: string) => void
  onLoad: (g: NflGame) => void
}) {
  if (rows.length === 0) return null
  return (
    <div>
      <div className="mb-2 font-display text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
        {title}
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map(({ base, current }) => (
          <GameRow
            key={base.id}
            current={current}
            modified={Boolean(overrides[base.id])}
            expanded={editId === base.id}
            onEdit={() => onEdit(base.id)}
            onLoad={() => onLoad(current)}
          />
        ))}
      </div>
    </div>
  )
}

function GameRow({
  current,
  modified,
  onEdit,
  onLoad,
}: {
  current: NflGame
  modified: boolean
  expanded: boolean
  onEdit: () => void
  onLoad: () => void
}) {
  const isBye = current.status === 'bye'
  const opp = current.opponentId ? getTeam(current.opponentId) : null
  const oppName = opp ? opp.name : current.opponentName ?? 'TBD'
  const loadable = !isBye && Boolean(current.date && current.time)

  return (
    <div className="rounded-xl border border-white/10 bg-navy-950/50 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="w-[92px] shrink-0 font-display text-sm font-bold text-slate-300">
          {current.weekLabel.replace('Preseason ', 'Pre ')}
        </div>
        {isBye ? (
          <div className="flex-1 font-display text-lg font-bold text-slate-500">BYE WEEK</div>
        ) : (
          <>
            <div className="w-[120px] shrink-0 text-sm font-semibold text-slate-300">
              {fmtDate(current.date)}
            </div>
            <div className="min-w-[180px] flex-1 font-display text-lg font-bold">
              <span className="text-slate-400">{current.homeAway === 'HOME' ? 'vs ' : 'at '}</span>
              <span className="text-white">{oppName}</span>
            </div>
            <div className="w-[110px] shrink-0 tnum font-mono text-base font-bold text-sky-300">
              {fmtTime(current.time)}
            </div>
            <StatusBadge modified={modified} status={current.status} />
          </>
        )}
        <div className="flex items-center gap-1.5">
          <IconButton title="Edit game" onClick={onEdit}>
            ✎
          </IconButton>
          {loadable && (
            <Button variant="success" onClick={onLoad} className="py-1.5">
              Load
            </Button>
          )}
        </div>
      </div>
      {current.network && !isBye && (
        <div className="mt-0.5 pl-[92px] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {current.network}
          {current.venue ? ` · ${current.venue}` : ''}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ modified, status }: { modified: boolean; status: NflGame['status'] }) {
  if (modified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-alert-warn/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-alert-warn">
        ● MODIFIED
      </span>
    )
  }
  if (status === 'time_tbd' || status === 'date_tbd') {
    return (
      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-slate-300">
        TBD
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-emerald-300">
      ● OFFICIAL
    </span>
  )
}

// --- Edit a game (writes an override; master preserved) ---------------------
function EditGame({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const { state, actions } = useDashboard()
  const divisions = teamsByDivision()
  const master =
    masterGames(state.game.teamId, state.season).find((g) => g.id === gameId) ??
    state.customGames.find((g) => g.id === gameId)
  const ov = state.gameOverrides[gameId]
  const current = master ? applyOverride(master, ov) : undefined

  const [form, setForm] = useState(() => ({
    date: current?.date ?? '',
    time: current?.time ?? '',
    opponentId: current?.opponentId ?? '',
    homeAway: current?.homeAway ?? 'HOME',
    venue: current?.venue ?? '',
    weekLabel: current?.weekLabel ?? '',
    status: current?.status ?? 'scheduled',
    notes: current?.notes ?? '',
  }))
  if (!master || !current) return null

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const save = () => {
    const override: GameOverride = {
      date: form.date,
      time: form.time,
      opponentId: form.opponentId || undefined,
      homeAway: form.homeAway as 'HOME' | 'AWAY',
      venue: form.venue || undefined,
      weekLabel: form.weekLabel || undefined,
      status: form.status as NflGame['status'],
      notes: form.notes || undefined,
      originalKickoffISO: ov?.originalKickoffISO ?? gameKickoffISO(master),
      modifiedAt: Date.now(),
    }
    actions.setGameOverride(gameId, override)
    onClose()
  }

  return (
    <div className="mt-4 rounded-xl border border-alert-warn/40 bg-navy-900/80 p-4">
      <div className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-alert-warn">
        Edit Game — {master.weekLabel}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date (ET)">
          <TextInput type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <Field label="Kickoff time (ET)">
          <TextInput type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} />
        </Field>
        <Field label="Opponent">
          <Select value={form.opponentId} onChange={(e) => set({ opponentId: e.target.value })}>
            <option value="">— TBD —</option>
            {divisions.map((d) => (
              <optgroup key={d.label} label={d.label}>
                {d.teams.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Home / Away">
          <Select value={form.homeAway} onChange={(e) => set({ homeAway: e.target.value as 'HOME' | 'AWAY' })}>
            <option value="HOME">Home</option>
            <option value="AWAY">Away</option>
          </Select>
        </Field>
        <Field label="Venue">
          <TextInput value={form.venue} onChange={(e) => set({ venue: e.target.value })} />
        </Field>
        <Field label="Week label">
          <TextInput value={form.weekLabel} onChange={(e) => set({ weekLabel: e.target.value })} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set({ status: e.target.value as NflGame['status'] })}>
            {['scheduled', 'time_tbd', 'date_tbd', 'postponed', 'rescheduled', 'cancelled', 'completed', 'bye'].map(
              (s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ),
            )}
          </Select>
        </Field>
        <Field label="Notes">
          <TextInput value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={save}>Save Changes</Button>
        {ov && (
          <Button
            variant="ghost"
            onClick={() => {
              actions.clearGameOverride(gameId)
              onClose()
            }}
          >
            Revert to Official
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// --- Load-game confirmation -------------------------------------------------
function LoadConfirm({ game, onClose }: { game: NflGame; onClose: () => void }) {
  const { state, actions } = useDashboard()
  const team = getTeam(game.teamId)
  const opp = game.opponentId ? getTeam(game.opponentId) : null
  const kickoffISO = gameKickoffISO(game)

  // Suggest a template by matchup: night game -> primetime, preseason -> preseason.
  const suggestKind = game.phase === 'preseason' ? 'preseason' : Number(game.time.split(':')[0]) >= 19 ? 'primetime' : 'regular'
  const suggested =
    state.templates.find((t) => t.kind === suggestKind) ?? state.templates[0]
  const [templateId, setTemplateId] = useState(suggested?.id ?? '')

  const eventCount = state.templates.find((t) => t.id === templateId)?.events.length ?? state.activeEvents.length

  const load = () => {
    if (templateId) actions.loadTemplate(templateId)
    const gameInfo: GameInfo = {
      teamId: game.teamId,
      opponentId: game.opponentId,
      opponent: opp ? opp.name : game.opponentName ?? '',
      week: game.weekLabel,
      homeAway: game.homeAway,
      kickoffISO: kickoffISO || state.game.kickoffISO,
      venue: game.venue,
      sourceGameId: game.id,
      originalKickoffISO: state.gameOverrides[game.id]?.originalKickoffISO,
    }
    actions.loadGame(gameInfo)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-navy-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="font-display text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
            Ready for game day?
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold text-white">{team.name}</div>
          <div className="my-1 font-display text-lg font-bold text-slate-400">
            {game.homeAway === 'HOME' ? 'vs' : 'at'}
          </div>
          <div className="font-display text-3xl font-extrabold text-white">
            {opp ? opp.name : game.opponentName}
          </div>
          <div className="mt-3 text-slate-300">
            {fmtDate(game.date)} · <span className="tnum">{fmtTime(game.time)} ET</span>
          </div>
          {game.venue && <div className="text-sm text-slate-500">{game.venue}</div>}
        </div>

        <div className="mt-5">
          <Field label="Pre-game template">
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {state.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.kind === suggestKind ? '(suggested)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-2 flex justify-between text-sm text-slate-400">
            <span>Events: <span className="font-bold text-white">{eventCount}</span></span>
            <span>
              Kickoff: <span className="tnum font-bold text-white">
                {kickoffISO ? formatClock(etWallTimeToEpoch(kickoffISO)) : 'TBD'} ET
              </span>
            </span>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button onClick={load} className="flex-1 py-3 text-base">
            LOAD GAME DAY
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          All connected displays update when you load.
        </p>
      </div>
    </div>
  )
}
