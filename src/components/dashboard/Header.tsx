import { motion } from 'framer-motion'
import { useDashboard } from '../../context/DashboardContext'
import { formatClock, formatHMS } from '../../lib/time'
import BillsMark from '../common/BillsMark'

interface HeaderProps {
  nowMs: number
  kickoffAt: number
  secondsToKickoff: number
}

/**
 * Top banner: team identity, game info strip, and the giant live kickoff clock.
 */
export default function Header({ nowMs, kickoffAt, secondsToKickoff }: HeaderProps) {
  const { state } = useDashboard()
  const { game, settings } = state

  const preKick = secondsToKickoff > 0
  const kickClock = formatClock(kickoffAt)

  return (
    <header className="relative flex items-stretch gap-6 px-8 pt-6 pb-4">
      {/* Left: identity */}
      <div className="flex items-center gap-5">
        <BillsMark className="h-[92px] w-[92px] shrink-0 drop-shadow-[0_4px_18px_rgba(0,51,141,0.6)]" />
        <div className="leading-none">
          <div className="font-display text-[26px] font-bold tracking-[0.32em] text-sky-300/90">
            BUFFALO BILLS
          </div>
          <div className="font-display text-[46px] font-extrabold uppercase tracking-[0.06em] text-white">
            Pre-Game Operations
          </div>
        </div>
      </div>

      {/* Middle: game info strip */}
      <div className="flex flex-1 items-center justify-center">
        <div className="grid grid-cols-4 divide-x divide-white/10 rounded-2xl border border-white/10 bg-navy-900/60 px-2 py-3">
          <InfoCell label="MATCHUP" value={`${game.homeAway === 'HOME' ? 'vs' : '@'} ${game.opponent}`} />
          <InfoCell label="WEEK" value={game.week} />
          <InfoCell label="KICKOFF" value={kickClock} />
          <InfoCell label="LOCAL TIME" value={formatClock(nowMs, true)} live />
        </div>
      </div>

      {/* Right: giant kickoff countdown */}
      <div className="flex flex-col items-end justify-center">
        <div className="font-display text-[22px] font-bold uppercase tracking-[0.4em] text-bills-red">
          {preKick ? 'Kickoff In' : 'Kickoff'}
        </div>
        <motion.div
          key={preKick ? 'pre' : 'post'}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`tnum font-mono font-bold leading-none ${
            preKick ? 'text-white' : 'text-alert-go'
          } text-[86px]`}
        >
          {preKick ? formatHMS(secondsToKickoff) : 'LIVE'}
        </motion.div>
      </div>

      {settings.colorblindMode && (
        <div className="pointer-events-none absolute right-8 top-2 rounded bg-amber-400/90 px-2 py-0.5 text-[11px] font-bold tracking-widest text-navy-950">
          CB MODE
        </div>
      )}

      {/* Bills red underline accent */}
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-bills-royal via-bills-red to-bills-royal" />
    </header>
  )
}

function InfoCell({
  label,
  value,
  live,
}: {
  label: string
  value: string
  live?: boolean
}) {
  return (
    <div className="flex flex-col items-center px-6">
      <span className="font-display text-[15px] font-semibold tracking-[0.3em] text-slate-400">
        {label}
      </span>
      <span
        className={`mt-1 font-display text-[30px] font-bold leading-none ${
          live ? 'tnum text-sky-200' : 'text-white'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
