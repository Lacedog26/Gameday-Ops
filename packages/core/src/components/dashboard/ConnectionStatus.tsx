import { useEffect, useState } from 'react'
import { isCloudMode } from '../../lib/supabaseConfig'

/**
 * Subtle live connection indicator for TV mode.
 *   ● CONNECTED (green)  — online
 *   ● OFFLINE  (amber)   — network lost; the board keeps counting from cache
 *
 * Uses the browser online/offline signal today; when the Supabase realtime
 * channel is added, its subscription state feeds the same indicator.
 */
export default function ConnectionStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return (
    <div className="pointer-events-none absolute bottom-4 left-6 z-40 flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 backdrop-blur">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          online ? 'bg-alert-go shadow-[0_0_10px_rgba(34,197,94,0.9)]' : 'bg-amber-400 animate-pulse'
        }`}
      />
      <span className="font-display text-[0.8125rem] font-bold tracking-[0.25em] text-white/70">
        {online ? (isCloudMode ? 'LIVE SYNC' : 'CONNECTED') : 'OFFLINE'}
      </span>
    </div>
  )
}
