import { AnimatePresence } from 'framer-motion'
import type { TimedEvent } from '../../types'
import ScheduleRow from './ScheduleRow'

interface Props {
  timeline: TimedEvent[]
  colorblind: boolean
  onAcknowledge: (id: string) => void
}

/** The main chronological schedule board. */
export default function ScheduleTable({ timeline, colorblind, onAcknowledge }: Props) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* Column headings */}
      <div className="grid grid-cols-[130px_92px_1fr_150px_210px] gap-3 px-5 pb-2">
        <Head>CLOCK</Head>
        <Head>T-MINUS</Head>
        <Head>EVENT</Head>
        <Head className="text-center">STATUS</Head>
        <Head className="text-right">COUNTDOWN</Head>
      </div>

      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden pr-1">
        <AnimatePresence initial={false}>
          {timeline.map((item) => (
            <ScheduleRow
              key={item.event.id}
              item={item}
              colorblind={colorblind}
              onAcknowledge={onAcknowledge}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

function Head({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-display text-[16px] font-bold tracking-[0.3em] text-slate-500 ${className}`}>
      {children}
    </div>
  )
}
