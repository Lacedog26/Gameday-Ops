import { useEffect, useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import type { PregameEvent, ScheduleTemplate, TemplateKind } from '../../types'
import { eventScheduledAt, formatCardClock, formatTMinus, kickoffMs, parseTMinus } from '../../lib/time'
import { uid } from '../../lib/defaults'
import { ANCHOR_PRESETS, routineAnchorSeconds, shiftRoutineToAnchor } from '../../lib/routine'
import { Section, TextInput, Button, IconButton, Select } from './ui'

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * Add / edit / delete / reorder the active game's pre-game timeline.
 *
 * Edits are held in a local DRAFT and only committed when the operator clicks
 * SAVE CHANGES — several changes, saved once, with a clear "unsaved changes"
 * state and a saved confirmation shown ONLY after the write actually succeeds.
 * "Save as Master Template" stores the timeline as a reusable template.
 *
 * The "Routine start (anchor)" control shifts the whole routine to a chosen
 * anchor (T-77 / T-79 / T-80 / custom) preserving spacing AND seconds; the T-0
 * kickoff stays put. Clock times are always derived from kickoff − T-minus.
 */
export default function ScheduleEditorSection() {
  const { state, actions } = useDashboard()
  const { activeEvents, game } = state
  const kickoff = kickoffMs(game)

  const [draft, setDraft] = useState<PregameEvent[]>(activeEvents)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [anchorText, setAnchorText] = useState('')

  // Mirror live state into the draft while there are no unsaved edits (so
  // loading a game / template or a cross-TV sync shows through). Once the
  // operator starts editing, we stop overwriting their in-progress work.
  useEffect(() => {
    if (!dirty) setDraft(activeEvents)
  }, [activeEvents, dirty])

  const edit = (next: PregameEvent[]) => {
    setDraft(next)
    setDirty(true)
    setSavedAt(null)
    setError(null)
  }

  const addEvent = () =>
    edit([...draft, { id: uid('evt'), label: 'NEW EVENT', tMinusSeconds: 15 * 60, acknowledgedAt: null }])
  const updateEvent = (id: string, patch: Partial<PregameEvent>) =>
    edit(draft.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const deleteEvent = (id: string) => edit(draft.filter((e) => e.id !== id))
  const reorder = (from: number, to: number) => edit(move(draft, from, to))
  const sortByTime = () => edit([...draft].sort((a, b) => b.tMinusSeconds - a.tMinusSeconds))

  // Save the edited timeline to the active game. We only clear "dirty" and show
  // the confirmation AFTER the write actually succeeds; on failure the edits stay
  // put and the real error is shown.
  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await actions.commit({ ...state, activeEvents: draft })
      setDirty(false)
      setSavedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed — your changes are kept. Try again.')
    } finally {
      setBusy(false)
    }
  }
  const discard = () => {
    setDraft(activeEvents)
    setDirty(false)
    setSavedAt(null)
    setError(null)
  }

  const [tplName, setTplName] = useState('')
  const [tplKind, setTplKind] = useState<TemplateKind>('regular')
  const saveAsTemplate = async () => {
    const name = tplName.trim() || `Template ${new Date().toLocaleDateString()}`
    const snapshot = draft.map((e) => ({ ...e, acknowledgedAt: null }))
    const tpl: ScheduleTemplate = {
      id: uid('tpl'),
      name,
      kind: tplKind,
      events: snapshot,
      builtIn: false,
      updatedAt: Date.now(),
    }
    setBusy(true)
    setError(null)
    try {
      await actions.commit({ ...state, activeEvents: draft, templates: [...state.templates, tpl] })
      setTplName('')
      setDirty(false)
      setSavedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save template — your changes are kept.')
    } finally {
      setBusy(false)
    }
  }

  const justSaved = savedAt && Date.now() - savedAt < 4000

  // Anchor: the first event (largest T-minus) is the routine's anchor. Changing
  // it shifts the whole routine by the same delta, preserving spacing and
  // seconds; the T-0 kickoff stays put. Edits the draft (Save persists).
  const anchorSec = routineAnchorSeconds(draft)
  const applyAnchor = (sec: number) => {
    if (sec > 0) edit(shiftRoutineToAnchor(draft, sec))
    setAnchorText('')
  }

  return (
    <Section title="Schedule Editor" subtitle="Events run automatically off their T-minus value" accent="red">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button onClick={addEvent}>+ Add Event</Button>
        <Button variant="ghost" onClick={sortByTime}>Sort by T-minus</Button>
        <Button variant="ghost" onClick={actions.clearAcks}>Reset Acknowledgements</Button>
      </div>

      {/* Routine anchor — shift the whole routine while preserving spacing/seconds. */}
      {draft.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-navy-950/50 px-3 py-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Routine start (anchor)
          </span>
          <span className="tnum font-mono text-sm font-bold text-sky-300">{formatTMinus(anchorSec)}</span>
          <span className="mx-1 text-slate-600">·</span>
          {ANCHOR_PRESETS.map((p) => (
            <Button
              key={p.label}
              variant={anchorSec === p.seconds ? 'success' : 'ghost'}
              onClick={() => applyAnchor(p.seconds)}
              className="py-1.5"
            >
              {p.label}
            </Button>
          ))}
          <TextInput
            value={anchorText}
            onChange={(e) => setAnchorText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const s = parseTMinus(anchorText)
                if (s != null && s > 0) applyAnchor(s)
              }
            }}
            placeholder="Custom e.g. 78:30"
            className="w-32 py-1.5"
          />
          <Button
            variant="ghost"
            onClick={() => {
              const s = parseTMinus(anchorText)
              if (s != null && s > 0) applyAnchor(s)
            }}
            className="py-1.5"
          >
            Set
          </Button>
          <span className="basis-full text-[11px] text-slate-500">
            Shifts every event together (T-minus values move, kickoff stays T-0). Clock times recalc from kickoff.
          </span>
        </div>
      )}

      {/* Header row (hidden on mobile) */}
      <div className="hidden gap-2 px-2 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:grid sm:grid-cols-[70px_120px_1fr_1fr_auto]">
        <span>Clock</span>
        <span>T-Minus</span>
        <span>Event Label</span>
        <span>Note (optional)</span>
        <span className="text-right">Order</span>
      </div>

      <div className="flex flex-col gap-2">
        {draft.map((ev, i) => (
          <EventEditRow
            key={ev.id}
            event={ev}
            clock={formatCardClock(eventScheduledAt(kickoff, ev), ev.tMinusSeconds)}
            isFirst={i === 0}
            isLast={i === draft.length - 1}
            onChange={(patch) => updateEvent(ev.id, patch)}
            onDelete={() => deleteEvent(ev.id)}
            onUp={() => reorder(i, i - 1)}
            onDown={() => reorder(i, i + 1)}
          />
        ))}
        {draft.length === 0 && (
          <p className="py-6 text-center text-slate-500">No events. Add one or load a template above.</p>
        )}
      </div>

      {/* Save bar — sticky so it's always reachable while editing a long list. */}
      <div className="sticky bottom-2 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-navy-900/95 p-3 backdrop-blur">
        <Button onClick={save} disabled={!dirty || busy} className="text-base">
          {busy ? 'Saving…' : dirty ? '● Save Changes' : 'Save Changes'}
        </Button>
        {dirty && !busy && (
          <Button variant="ghost" onClick={discard}>Discard</Button>
        )}
        <span
          className={`text-sm font-semibold ${
            error ? 'text-bills-red' : dirty ? 'text-alert-warn' : justSaved ? 'text-alert-go' : 'text-slate-500'
          }`}
        >
          {error
            ? `⚠ ${error}`
            : dirty
              ? 'Unsaved changes'
              : justSaved
                ? '✓ Saved — live on every display'
                : 'All changes saved'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <TextInput
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            placeholder="Master template name"
            className="w-48 py-1.5"
          />
          <Select value={tplKind} onChange={(e) => setTplKind(e.target.value as TemplateKind)} className="py-1.5">
            {(['regular', 'preseason', 'primetime', 'playoffs', 'international', 'custom'] as TemplateKind[]).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </Select>
          <Button variant="ghost" onClick={saveAsTemplate} disabled={busy}>Save as Master Template</Button>
        </div>
      </div>
    </Section>
  )
}

function EventEditRow({
  event,
  clock,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onUp,
  onDown,
}: {
  event: PregameEvent
  clock: string
  isFirst: boolean
  isLast: boolean
  onChange: (patch: Partial<PregameEvent>) => void
  onDelete: () => void
  onUp: () => void
  onDown: () => void
}) {
  const [tText, setTText] = useState(() => formatTMinus(event.tMinusSeconds).replace('T-', ''))
  const [tError, setTError] = useState(false)

  // Keep the field in sync if the underlying value changes (e.g. discard/sort/anchor).
  useEffect(() => {
    setTText(formatTMinus(event.tMinusSeconds).replace('T-', ''))
  }, [event.tMinusSeconds])

  const commitT = () => {
    const parsed = parseTMinus(tText)
    if (parsed == null || parsed < 0) {
      setTError(true)
      return
    }
    setTError(false)
    onChange({ tMinusSeconds: parsed })
    setTText(formatTMinus(parsed).replace('T-', ''))
  }

  return (
    <div className="grid items-center gap-2 rounded-xl border border-white/10 bg-navy-950/50 p-2 sm:grid-cols-[70px_120px_1fr_1fr_auto]">
      <div className="tnum px-1 font-mono text-sm text-sky-300">{clock}</div>

      <div className="flex items-center gap-1">
        <span className="text-slate-500">T-</span>
        <TextInput
          value={tText}
          onChange={(e) => setTText(e.target.value)}
          onBlur={commitT}
          onKeyDown={(e) => e.key === 'Enter' && commitT()}
          className={`py-1.5 ${tError ? 'border-bills-red ring-1 ring-bills-red' : ''}`}
          placeholder="35:30"
        />
      </div>

      <TextInput
        value={event.label}
        onChange={(e) => onChange({ label: e.target.value })}
        className="py-1.5 font-semibold uppercase"
      />

      <TextInput
        value={event.note ?? ''}
        onChange={(e) => onChange({ note: e.target.value })}
        className="py-1.5"
        placeholder="—"
      />

      <div className="flex items-center justify-end gap-1">
        <IconButton title="Move up" disabled={isFirst} onClick={onUp}>↑</IconButton>
        <IconButton title="Move down" disabled={isLast} onClick={onDown}>↓</IconButton>
        <IconButton
          title="Delete event"
          onClick={() => {
            if (confirm(`Delete "${event.label}"?`)) onDelete()
          }}
        >
          🗑
        </IconButton>
      </div>
    </div>
  )
}
