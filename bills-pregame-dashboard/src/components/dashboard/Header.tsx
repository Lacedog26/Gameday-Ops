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

  // The big kickoff clock stays clean white, then turns red as kickoff nears —
  // solid red under 5 min, red + pulse under 2 min, green once we're LIVE.
  const kickoffColor = !preKick
    ? 'text-alert-go drop-shadow-[0_4px_24px_rgba(34,197,94,0.5)]'
    : secondsToKickoff <= 120
      ? 'text-redbright animate-pulse-soft drop-shadow-[0_0_30px_rgba(255,31,62,0.9)]'
      : secondsToKickoff <= 300
        ? 'text-redbright drop-shadow-[0_0_26px_rgba(255,31,62,0.75)]'
        : 'text-white drop-shadow-[0_3px_18px_rgba(255,255,255,0.25)]'

  return (
    <header className="relative flex items-stretch gap-6 px-8 pt-6 pb-4">
      {/* Left: identity */}
      <div className="flex items-center gap-5">
        <BillsMark className="h-[92px] w-[92px] shrink-0 drop-shadow-[0_4px_18px_rgba(0,51,141,0.6)]" />
        <div className="leading-none">
          <div className="bg-gradient-to-r from-sky-300 to-bills-red bg-clip-text font-display text-[26px] font-bold tracking-[0.32em] text-transparent">
            BUFFALO BILLS
          </div>
          <div className="font-display text-[46px] font-extrabold uppercase tracking-[0.06em] text-white drop-shadow-[0_2px_16px_rgba(56,140,255,0.25)]">
            Pre-Game Operations
          </div>
        </div>
      </div>

      {/* Middle: game info strip */}
      <div className="flex flex-1 items-center justify-center">
        <div className="glass grid grid-cols-4 divide-x divide-white/10 rounded-2xl px-2 py-3">
          <InfoCell label="MATCHUP" value={`${game.homeAway === 'HOME' ? 'vs' : '@'} ${game.opponent}`} />
          <InfoCell label="WEEK" value={game.week} />
          <InfoCell label="KICKOFF" value={kickClock} />
          <InfoCell label="EASTERN (ET)" value={formatClock(nowMs, true)} live />
        </div>
      </div>

      {/* Right: giant kickoff countdown */}
      <div className="relative flex flex-col items-end justify-center rounded-2xl px-6 py-1">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_80%_20%,rgba(30,92,214,0.22),transparent_70%)]" />
        <div className="relative flex items-center gap-2 font-display text-[22px] font-bold uppercase tracking-[0.4em] text-bills-red">
          <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-bills-red shadow-[0_0_10px_rgba(198,12,48,0.9)]" />
          {preKick ? 'Kickoff In' : 'Kickoff'}
        </div>
        <motion.div
          key={preKick ? 'pre' : 'post'}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`tnum relative font-mono font-bold leading-none text-[92px] ${kickoffColor}`}
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
