import { motion } from 'framer-motion'
import type { TimedEvent } from '../../types'
import { formatCardClock, formatCountdown, formatTMinus } from '../../lib/time'
import { rowStyle } from './alertStyles'

interface Props {
  item: TimedEvent
  colorblind: boolean
  onAcknowledge: (id: string) => void
}

/** A single schedule row on the board. */
export default function ScheduleRow({ item, colorblind, onAcknowledge }: Props) {
  const { event, level, opStatus, secondsUntil, scheduledAt } = item
  const style = rowStyle(opStatus, level, colorblind)
  const done = opStatus === 'complete'
  const isNow = opStatus === 'now'
  const isKick = event.isKickoff

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ layout: { duration: 0.4, ease: 'easeInOut' } }}
      onClick={() => isNow && onAcknowledge(event.id)}
      className={`grid min-h-0 flex-1 grid-cols-[8.125rem_5.75rem_1fr_9.375rem_13.125rem] items-center gap-3 overflow-hidden rounded-xl border px-5 py-1 ${style.row} ${
        isNow ? 'cursor-pointer' : ''
      } ${isKick && !done ? 'ring-1 ring-alert-go/40' : ''}`}
    >
      {/* Scheduled clock time */}
      <div className="tnum whitespace-nowrap font-mono text-[1.6875rem] font-bold leading-none">
        {formatCardClock(scheduledAt, event.tMinusSeconds)}
      </div>

      {/* T-minus */}
      <div className="whitespace-nowrap font-display text-[1.375rem] font-bold tracking-wide opacity-90">
        {formatTMinus(event.tMinusSeconds)}
      </div>

      {/* Event name */}
      <div className="min-w-0">
        <div
          className={`truncate font-display text-[2.125rem] font-extrabold uppercase leading-none tracking-tight ${
            done ? 'line-through decoration-slate-600/50' : ''
          }`}
        >
          {event.label}
        </div>
        {event.note && (
          <div className="truncate text-[0.9375rem] font-medium opacity-70">{event.note}</div>
        )}
      </div>

      {/* Status pill */}
      <div className="flex justify-center">
        {done ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[1rem] font-bold tracking-wider ${style.statusPill}`}>
            <CheckIcon /> COMPLETE
          </span>
        ) : (
          <span className={`rounded-full px-4 py-1 text-[1.0625rem] font-extrabold tracking-widest ${style.statusPill}`}>
            {style.statusLabel}
          </span>
        )}
      </div>

      {/* Countdown */}
      <div className={`text-right tnum font-mono font-bold leading-none ${style.timer}`}>
        {isKick && !done ? (
          <span className="text-[2.125rem]">{formatCountdown(Math.max(0, secondsUntil))}</span>
        ) : done ? (
          <span className="text-[1.625rem]">—</span>
        ) : isNow ? (
          <span className="text-[2.375rem] font-black tracking-tight">GO&nbsp;NOW</span>
        ) : (
          <span className={level === 'critical' ? 'text-[2.875rem]' : level === 'imminent' ? 'text-[2.625rem]' : 'text-[2.125rem]'}>
            {formatCountdown(secondsUntil)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M4 10.5 L8 14.5 L16 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
