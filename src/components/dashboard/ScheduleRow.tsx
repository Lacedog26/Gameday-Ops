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
  const { event, level, secondsUntil, scheduledAt } = item
  const style = rowStyle(level, colorblind)
  const done = level === 'completed'
  const isGo = level === 'go'
  const isKick = event.isKickoff

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ layout: { duration: 0.4, ease: 'easeInOut' } }}
      onClick={() => isGo && onAcknowledge(event.id)}
      className={`grid min-h-0 flex-1 grid-cols-[130px_92px_1fr_150px_210px] items-center gap-3 overflow-hidden rounded-xl border px-5 py-1 ${style.row} ${
        isGo ? 'cursor-pointer' : ''
      } ${isKick && !done ? 'ring-1 ring-alert-go/40' : ''}`}
    >
      {/* Scheduled clock time */}
      <div className="tnum whitespace-nowrap font-mono text-[27px] font-bold leading-none">
        {formatCardClock(scheduledAt, event.tMinusSeconds)}
      </div>

      {/* T-minus */}
      <div className="whitespace-nowrap font-display text-[22px] font-bold tracking-wide opacity-90">
        {formatTMinus(event.tMinusSeconds)}
      </div>

      {/* Event name */}
      <div className="min-w-0">
        <div
          className={`truncate font-display text-[34px] font-extrabold uppercase leading-none tracking-tight ${
            done ? 'line-through decoration-slate-600/50' : ''
          }`}
        >
          {event.label}
        </div>
        {event.note && (
          <div className="truncate text-[15px] font-medium opacity-70">{event.note}</div>
        )}
      </div>

      {/* Status pill */}
      <div className="flex justify-center">
        {done ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[16px] font-bold tracking-wider ${style.statusPill}`}>
            <CheckIcon /> DONE
          </span>
        ) : (
          <span className={`rounded-full px-4 py-1 text-[17px] font-extrabold tracking-widest ${style.statusPill}`}>
            {style.statusLabel}
          </span>
        )}
      </div>

      {/* Countdown */}
      <div className={`text-right tnum font-mono font-bold leading-none ${style.timer}`}>
        {isKick && !done ? (
          <span className="text-[34px]">{formatCountdown(Math.max(0, secondsUntil))}</span>
        ) : done ? (
          <span className="text-[26px]">—</span>
        ) : isGo ? (
          <span className="text-[38px] font-black tracking-tight">GO&nbsp;NOW</span>
        ) : (
          <span className={level === 'critical' ? 'text-[46px]' : level === 'imminent' ? 'text-[42px]' : 'text-[34px]'}>
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
