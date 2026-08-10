import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDashboard } from '../../context/DashboardContext'
import type { CultureGraphic, Quote, TransitionStyle } from '../../types'

interface Props {
  /** When true (2-min / GO NOW active), the panel steps aside for the alert. */
  suppressed: boolean
}

// A rotation slide is either an uploaded image or a text quote.
type Slide =
  | { kind: 'image'; id: string; graphic: CultureGraphic; durationSec?: number }
  | { kind: 'quote'; id: string; quote: Quote }

/**
 * Rotating team-culture / motivation panel. Cycles enabled graphics AND text
 * quotes on a timer with fade or slide transitions. Images are object-contain
 * (never distorted) with alpha preserved; quotes render as large typography.
 * Yields to urgent alerts.
 */
export default function CulturePanel({ suppressed }: Props) {
  const { state } = useDashboard()
  const { graphics, quotes, settings } = state

  // Combined rotation: enabled graphics first, then enabled text quotes.
  const slides = useMemo<Slide[]>(() => {
    const g: Slide[] = graphics
      .filter((x) => x.enabled)
      .sort((a, b) => a.order - b.order)
      .map((graphic) => ({ kind: 'image', id: graphic.id, graphic, durationSec: graphic.durationSec }))
    const q: Slide[] = quotes
      .filter((x) => x.enabled)
      .sort((a, b) => a.order - b.order)
      .map((quote) => ({ kind: 'quote', id: quote.id, quote }))
    return [...g, ...q]
  }, [graphics, quotes])

  const [index, setIndex] = useState(0)

  // Keep index valid if the slide list shrinks.
  useEffect(() => {
    if (index >= slides.length) setIndex(0)
  }, [slides.length, index])

  // Rotation timer — paused while suppressed so the same slide resumes after.
  useEffect(() => {
    if (suppressed || slides.length <= 1) return
    const current = slides[index]
    const durationSec =
      (current?.kind === 'image' ? current.durationSec : undefined) ?? settings.cultureRotationSec
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % slides.length),
      Math.max(5, durationSec) * 1000,
    )
    return () => window.clearTimeout(id)
  }, [index, slides, suppressed, settings.cultureRotationSec])

  const current = slides[index]

  return (
    <motion.div
      layout
      animate={{
        opacity: suppressed ? 0.12 : 1,
        height: suppressed ? 64 : 'auto',
        flexGrow: suppressed ? 0 : 1,
      }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl"
    >
      {/* brand corner glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-bills-royal/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-bills-red/15 blur-3xl" />
      <div className="flex items-center justify-between px-6 pt-4">
        <span className="font-display text-[18px] font-extrabold tracking-[0.4em] text-sky-300/80">
          BILLS CULTURE
        </span>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
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
            current.kind === 'image' ? (
              <GraphicSlide
                key={current.id}
                src={current.graphic.src}
                alt={current.graphic.name}
                transition={settings.cultureTransition}
                matte={current.graphic.matte ?? 'none'}
              />
            ) : (
              <QuoteSlide
                key={current.id}
                quote={current.quote}
                transition={settings.cultureTransition}
              />
            )
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center font-display text-[28px] font-bold text-slate-500"
            >
              Add graphics or quotes in Admin
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
  matte,
}: {
  src: string
  alt: string
  transition: TransitionStyle
  matte: 'none' | 'light'
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

  const img = (
    // object-contain guarantees the artwork is never stretched/distorted.
    <img
      src={src}
      alt={alt}
      className="max-h-full max-w-full object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
    />
  )

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className={
        matte === 'light'
          ? 'flex max-h-full max-w-full items-center justify-center rounded-2xl bg-white px-8 py-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)]'
          : 'flex max-h-full max-w-full items-center justify-center'
      }
    >
      {img}
    </motion.div>
  )
}

const QUOTE_ACCENT: Record<NonNullable<Quote['accent']>, string> = {
  royal: 'text-sky-300',
  red: 'text-redbright',
  white: 'text-white',
}

function QuoteSlide({ quote, transition }: { quote: Quote; transition: TransitionStyle }) {
  const variants =
    transition === 'slide'
      ? {
          initial: { opacity: 0, x: 60 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -60 },
        }
      : {
          initial: { opacity: 0, scale: 1.03 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.97 },
        }

  // Scale text down as the quote gets longer so it always fills without clipping.
  const len = quote.text.length
  const sizeClass = len > 48 ? 'text-[40px]' : len > 26 ? 'text-[54px]' : 'text-[72px]'
  const accent = QUOTE_ACCENT[quote.accent ?? 'white']

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="flex max-h-full w-full flex-col items-center justify-center px-6 text-center"
    >
      <span aria-hidden className="mb-2 font-display text-[64px] leading-none text-bills-red/60">
        &ldquo;
      </span>
      <span
        className={`font-display font-black uppercase leading-[0.98] tracking-tight drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)] ${sizeClass} ${accent}`}
      >
        {quote.text}
      </span>
      {quote.author && (
        <span className="mt-4 font-display text-[22px] font-bold uppercase tracking-[0.2em] text-slate-300">
          {quote.author}
        </span>
      )}
    </motion.div>
  )
}
