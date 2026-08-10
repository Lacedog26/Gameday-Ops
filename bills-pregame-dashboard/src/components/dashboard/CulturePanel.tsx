import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDashboard } from '../../context/DashboardContext'
import type { TransitionStyle } from '../../types'

interface Props {
  /** When true (2-min / GO NOW active), the panel steps aside for the alert. */
  suppressed: boolean
}

/**
 * Rotating team-culture / motivation panel. Cycles enabled graphics on a timer
 * with fade or slide transitions, always object-contain (never distorts), on a
 * transparent stage that preserves PNG/SVG/GIF alpha. Yields to urgent alerts.
 */
export default function CulturePanel({ suppressed }: Props) {
  const { state } = useDashboard()
  const { graphics, settings } = state

  const active = useMemo(
    () => graphics.filter((g) => g.enabled).sort((a, b) => a.order - b.order),
    [graphics],
  )

  const [index, setIndex] = useState(0)

  // Keep index valid if the graphics list shrinks.
  useEffect(() => {
    if (index >= active.length) setIndex(0)
  }, [active.length, index])

  // Rotation timer — paused while suppressed so the same graphic resumes after.
  useEffect(() => {
    if (suppressed || active.length <= 1) return
    const current = active[index]
    const durationSec = current?.durationSec ?? settings.cultureRotationSec
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % active.length),
      Math.max(5, durationSec) * 1000,
    )
    return () => window.clearTimeout(id)
  }, [index, active, suppressed, settings.cultureRotationSec])

  const current = active[index]

  return (
    <motion.div
      layout
      animate={{
        opacity: suppressed ? 0.12 : 1,
        height: suppressed ? 64 : 'auto',
        flexGrow: suppressed ? 0 : 1,
      }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-navy-800/80 to-navy-900/90"
    >
      <div className="flex items-center justify-between px-6 pt-4">
        <span className="font-display text-[18px] font-extrabold tracking-[0.4em] text-sky-300/80">
          BILLS CULTURE
        </span>
        <div className="flex gap-1.5">
          {active.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === index ? 'bg-bills-red' : 'bg-white/25'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {current ? (
            <GraphicSlide
              key={current.id}
              src={current.src}
              alt={current.name}
              transition={settings.cultureTransition}
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center font-display text-[28px] font-bold text-slate-500"
            >
              Add culture graphics in Admin
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function GraphicSlide({
  src,
  alt,
  transition,
}: {
  src: string
  alt: string
  transition: TransitionStyle
}) {
  const variants =
    transition === 'slide'
      ? {
          initial: { opacity: 0, x: 60 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -60 },
        }
      : {
          initial: { opacity: 0, scale: 1.02 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.98 },
        }

  return (
    <motion.img
      src={src}
      alt={alt}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      // object-contain guarantees the artwork is never stretched/distorted.
      className="max-h-full max-w-full object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
    />
  )
}
