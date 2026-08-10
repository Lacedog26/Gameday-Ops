import { useState } from 'react'
import { useDashboard } from '../../context/DashboardContext'
import type { PregameEvent } from '../../types'
import { eventScheduledAt, formatCardClock, formatTMinus, kickoffMs, parseTMinus } from '../../lib/time'
import { Section, TextInput, Button, IconButton } from './ui'

/** Add / edit / delete / reorder the active schedule's events. */
export default function ScheduleEditorSection() {
  const { state, actions } = useDashboard()
  const { activeEvents, game } = state
  const kickoff = kickoffMs(game)

  const addEvent = () => {
    actions.addEvent({ label: 'NEW EVENT', tMinusSeconds: 15 * 60, acknowledgedAt: null })
  }

  const sortByTime = () => {
    const sorted = [...activeEvents].sort((a, b) => b.tMinusSeconds - a.tMinusSeconds)
    actions.setEvents(sorted)
  }

  return (
    <Section title="Schedule Editor" subtitle="Events run automatically off their T-minus value" accent="red">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button onClick={addEvent}>+ Add Event</Button>
        <Button variant="ghost" onClick={sortByTime}>
          Sort by T-minus
        </Button>
        <Button variant="ghost" onClick={actions.clearAcks}>
          Reset Acknowledgements
        </Button>
      </div>

      {/* Header row (hidden on mobile) */}
      <div className="hidden gap-2 px-2 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:grid sm:grid-cols-[70px_120px_1fr_1fr_auto]">
        <span>Clock</span>
        <span>T-Minus</span>
        <span>Event Label</span>
        <span>Note (optional)</span>
        <span className="text-right">Order</span>
      </div>

      <div className="flex flex-col gap-2">
        {activeEvents.map((ev, i) => (
          <EventEditRow
            key={ev.id}
            event={ev}
            clock={formatCardClock(eventScheduledAt(kickoff, ev), ev.tMinusSeconds)}
            isFirst={i === 0}
            isLast={i === activeEvents.length - 1}
            onChange={(patch) => actions.updateEvent(ev.id, patch)}
            onDelete={() => actions.deleteEvent(ev.id)}
            onUp={() => actions.reorderEvents(i, i - 1)}
            onDown={() => actions.reorderEvents(i, i + 1)}
          />
        ))}
        {activeEvents.length === 0 && (
          <p className="py-6 text-center text-slate-500">No events. Add one or load a template above.</p>
        )}
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
        <IconButton title="Move up" disabled={isFirst} onClick={onUp}>
          ↑
        </IconButton>
        <IconButton title="Move down" disabled={isLast} onClick={onDown}>
          ↓
        </IconButton>
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
