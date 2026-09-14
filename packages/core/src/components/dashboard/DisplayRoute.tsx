import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { setDisplayToken } from '../../lib/session'
import Dashboard from './Dashboard'

/**
 * TV kiosk route: `/#/display/<token>` (C7).
 *
 * The token is an opaque, non-guessable per-display secret. Binding it flips the
 * storage layer into read-only display mode, which reads ONLY that display's org
 * board via the `display_board` SECURITY DEFINER RPC — so a TV shows the correct
 * org without any login, and changing the token can never expose another org's
 * data (an unknown token simply resolves to nothing). Cleared on unmount.
 */
export default function DisplayRoute() {
  const { token } = useParams<{ token: string }>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDisplayToken(token ?? null)
    setReady(true)
    return () => setDisplayToken(null)
  }, [token])

  if (!token) {
    return (
      <div className="grid min-h-full place-items-center bg-[#05070f] px-6 text-center text-slate-400">
        Invalid display link.
      </div>
    )
  }
  // Wait until the scope is bound so the first board load uses the token path.
  if (!ready) {
    return <div className="grid min-h-full place-items-center bg-[#05070f] text-slate-400">Loading display…</div>
  }
  return <Dashboard kiosk />
}
