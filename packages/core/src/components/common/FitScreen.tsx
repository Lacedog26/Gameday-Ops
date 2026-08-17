import { useEffect, type ReactNode } from 'react'

/**
 * Full-viewport board frame. The dashboard is authored at a 1920×1080 reference
 * in rem units; while this is mounted it adds `board-fit` to <html>, which makes
 * the root font-size track the viewport (see index.css). Every rem-sized element
 * — type and spacing alike — then scales together, and the flex layout fills the
 * screen. Result: the whole board fits at 100% browser zoom on any display, with
 * no CSS transform, no letterbox, and no manual zoom. Sharp text at every size
 * (real font rendering, not a scaled bitmap), and it reflows live on resize.
 */
export default function FitScreen({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('board-fit')
    return () => root.classList.remove('board-fit')
  }, [])

  return (
    <div className="field-bg fixed inset-0 flex flex-col overflow-hidden">
      {children}
    </div>
  )
}
