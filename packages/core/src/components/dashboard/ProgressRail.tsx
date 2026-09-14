import { motion } from 'framer-motion'
import type { TimedEvent } from '../../types'

interface Props {
  timeline: TimedEvent[]
  currentIndex: number
}

/**
 * Vertical progress indicator for the whole routine.
 *  - Completed events: green
 *  - Current event:    red (pulsing)
 *  - Upcoming events:   Bills blue
 * Lets anyone read "where are we in pre-game" in one glance.
 */
export default function ProgressRail({ timeline, currentIndex }: Props) {
  const total = timeline.length
  const completed = timeline.filter((t) => t.level === 'completed').length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex h-full w-[3.75rem] flex-col items-center">
      <div className="mb-2 font-display text-[0.8125rem] font-bold tracking-[0.2em] text-slate-500">
        {pct}%
      </div>
      <div className="relative flex-1">
        {/* Track */}
        <div className="absolute left-1/2 top-0 h-full w-[0.375rem] -translate-x-1/2 rounded-full bg-white/10" />
        {/* Filled portion */}
        <div
          className="absolute left-1/2 top-0 w-[0.375rem] -translate-x-1/2 rounded-full bg-alert-go/70 transition-[height] duration-700"
          style={{ height: `${pct}%` }}
        />
        {/* Nodes */}
        <div className="relative flex h-full flex-col justify-between py-1">
          {timeline.map((t, i) => {
            const done = t.level === 'completed'
            const current = i === currentIndex
            return (
              <div key={t.event.id} className="relative flex items-center justify-center">
                <motion.div
                  animate={current ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                  transition={{ duration: 1.2, repeat: current ? Infinity : 0 }}
                  className={`z-10 rounded-full border-2 ${
                    current
                      ? 'h-[1.125rem] w-[1.125rem] border-white bg-bills-red shadow-glow-red'
                      : done
                        ? 'h-[0.8125rem] w-[0.8125rem] border-alert-go bg-alert-go'
                        : 'h-[0.8125rem] w-[0.8125rem] border-sky-300/60 bg-bills-royal'
                  }`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
