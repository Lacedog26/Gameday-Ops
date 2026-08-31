import { useEffect, useRef, useState, type ReactNode } from 'react'

const DESIGN_W = 1920
const DESIGN_H = 1080

/**
 * Renders children on a fixed 1920×1080 "stage" and scales it with a CSS
 * transform to fit any screen while preserving aspect ratio (letterboxed if
 * needed). This is the proven GameDayOps display engine (shared with the NFL
 * board): design once at a known size, then every laptop / TV / stadium screen
 * shows the exact same pixel-perfect layout — no scrolling, no reflow, no
 * per-screen tuning, and it fills the viewport at 100% browser zoom.
 *
 * Recomputes the scale on load, window resize, orientation change, AND
 * fullscreen enter/exit, so entering true browser fullscreen re-fits the board
 * to the now-larger viewport.
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
    document.addEventListener('fullscreenchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      document.removeEventListener('fullscreenchange', onResize)
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [])

  return (
    // Outer bar color fills any letterbox on non-16:9 panels; the stage itself
    // carries the bright brand gradient so the whole board reads as lit. The
    // stage is centered with absolute + translate(-50%,-50%) rather than grid
    // centering, which reliably centers an element LARGER than the viewport
    // (grid place-items-center left the oversized stage pinned to the corner,
    // clipping the board at sub-1920 sizes).
    <div className="fixed inset-0 overflow-hidden bg-[rgb(var(--team-bg-3))]">
      <div
        className="field-bg absolute left-1/2 top-1/2"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  )
}
