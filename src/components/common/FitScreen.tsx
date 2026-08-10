import { useEffect, useRef, useState, type ReactNode } from 'react'

const DESIGN_W = 1920
const DESIGN_H = 1080

/**
 * Renders children on a fixed 1920×1080 "stage" and scales it with a CSS
 * transform to fit any TV while preserving aspect ratio (letterboxed if needed).
 *
 * This is the airport-departure-board trick: design once at a known size, and
 * every 55"/65"/85" screen shows the exact same pixel-perfect layout — no
 * scrolling, no reflow, no per-TV tuning. Typography is sized in this space so
 * "readable from 40 feet" holds on every panel.
 */
export default function FitScreen({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1)
  const frame = useRef<number | undefined>(undefined)

  useEffect(() => {
    const recompute = () => {
      const s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
      setScale(s)
    }
    const onResize = () => {
      if (frame.current) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(recompute)
    }
    recompute()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [])

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-navy-950">
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  )
}
