import { AnimatePresence, motion } from 'framer-motion'
import type { AlertLevel, TimedEvent } from '../../types'
import { formatCountdown } from '../../lib/time'

interface Props {
  now: TimedEvent | null
  next: TimedEvent | null
  onAcknowledge: (id: string) => void
}

// Background + accent treatment for the big NOW card, escalating with urgency.
function nowSkin(level: AlertLevel): { wrap: string; timer: string; badge: string } {
  switch (level) {
    case 'go':
      return { wrap: 'bg-alert-go text-white animate-flash-go', timer: 'text-white', badge: 'bg-white text-emerald-700' }
    case 'critical':
      return { wrap: 'bg-bills-red text-white animate-flash-red-fast shadow-glow-red', timer: 'text-white', badge: 'bg-white text-bills-red' }
    case 'imminent':
      return { wrap: 'bg-bills-red text-white animate-flash-red shadow-glow-red', timer: 'text-white', badge: 'bg-white text-bills-red' }
    case 'warn':
      return { wrap: 'bg-alert-warn text-navy-950 animate-pulse-soft', timer: 'text-navy-950', badge: 'bg-navy-950 text-alert-warn' }
    default:
      return {
        wrap: 'bg-gradient-to-br from-navy-700/90 via-navy-800/90 to-navy-900 text-white border border-sky-300/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_50px_rgba(0,0,0,0.5)]',
        timer: 'text-sky-200',
        badge: 'bg-bills-royal text-white',
      }
  }
}

/** Always-on "what's happening now / what's next" feature panel. */
export default function FocusPanel({ now, next, onAcknowledge }: Props) {
  const level = now?.level ?? 'upcoming'
  const skin = nowSkin(level)
  const isGo = level === 'go'

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {/* NOW */}
      <motion.div
        layout
        onClick={() => now && isGo && onAcknowledge(now.event.id)}
        className={`relative flex flex-1 flex-col justify-between overflow-hidden rounded-3xl p-6 ${skin.wrap} ${
          isGo ? 'cursor-pointer' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-[26px] font-extrabold tracking-[0.4em] opacity-90">NOW</span>
          {(level === 'imminent' || level === 'critical') && (
            <span className={`rounded-full px-4 py-1 text-[20px] font-black tracking-widest ${skin.badge}`}>
              ON DECK
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={now?.event.id ?? 'none'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="my-2"
          >
            <div className="font-display text-[58px] font-black uppercase leading-[0.95] tracking-tight">
              {now ? now.event.label : 'ALL CLEAR'}
            </div>
            {now?.event.note && <div className="mt-1 text-[20px] font-semibold opacity-80">{now.event.note}</div>}
          </motion.div>
        </AnimatePresence>

        <div>
          <div className="font-display text-[22px] font-bold tracking-[0.3em] opacity-80">
            {now ? (isGo ? 'SEND THEM' : 'GOES OUT IN') : ''}
          </div>
          <div className={`tnum font-mono font-black leading-none ${skin.timer}`}>
            {now ? (
              isGo ? (
                <span className="text-[92px] tracking-tight">GO&nbsp;NOW</span>
              ) : (
                <span className="text-[104px]">{formatCountdown(now.secondsUntil)}</span>
              )
            ) : (
              <span className="text-[70px] text-alert-go">READY</span>
            )}
          </div>
          {isGo && (
            <div className="mt-1 text-[16px] font-bold uppercase tracking-widest opacity-80">
              Tap / press Space to acknowledge
            </div>
          )}
        </div>
      </motion.div>

      {/* NEXT */}
      <div className="glass flex items-center justify-between rounded-2xl px-6 py-4">
        <div className="min-w-0">
          <div className="font-display text-[20px] font-extrabold tracking-[0.4em] text-bills-red">NEXT</div>
          <div className="truncate font-display text-[36px] font-black uppercase leading-none text-white">
            {next ? next.event.label : '—'}
          </div>
        </div>
        <div className="tnum shrink-0 pl-4 font-mono text-[44px] font-bold text-sky-300">
          {next ? formatCountdown(next.secondsUntil) : '--:--'}
        </div>
      </div>
    </div>
  )
}
