import { useFullscreen } from '../../hooks/useFullscreen'

/**
 * Discreet "ENTER FULL SCREEN" control for the TV / kiosk display route.
 *
 * A web page cannot silently force browser fullscreen — the Fullscreen API
 * requires a user gesture. So the TV route auto-fits the viewport on its own
 * (see FitScreen + the fluid `board-fit` root), and this button provides the
 * one click needed to hand the whole screen to the board: it calls
 * document.documentElement.requestFullscreen(), which hides the browser tabs,
 * address bar, toolbar, and OS taskbar.
 *
 * The control hides itself while fullscreen is active and reappears on exit.
 * Layout needs no JS recalculation — the board is sized in viewport units, so
 * it reflows automatically when fullscreen changes the viewport (the hook also
 * tracks `fullscreenchange` to toggle this button).
 */
export default function FullscreenButton() {
  const { isFullscreen, enter } = useFullscreen()

  if (isFullscreen) return null

  return (
    <button
      onClick={enter}
      title="Enter full screen"
      className="pointer-events-auto absolute bottom-5 right-6 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-navy-900/70 px-4 py-2 text-[0.9375rem] font-bold uppercase tracking-wider text-slate-200 backdrop-blur transition hover:bg-navy-900/95 hover:text-white"
    >
      <span className="text-[1.125rem] leading-none">⛶</span>
      Full Screen
    </button>
  )
}
