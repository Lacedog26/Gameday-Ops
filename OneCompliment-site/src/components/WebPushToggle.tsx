// "When someone lifts me" toggle for the web Settings.
//
// Two-axis state:
//   - Browser subscription (this device's PushSubscription) — backed by
//     the service worker registered via subscribeToWebPush()
//   - Per-user preference (profiles.notify_on_received) — server-enforced;
//     shared with the mobile app
//
// We treat the visible switch as ON only when BOTH are true. Flipping it
// on subscribes this browser AND sets the pref; flipping it off does the
// inverse. Other browsers / mobile devices the user has subscribed remain
// subscribed (the pref controls server-side delivery, not subscription
// management).

import { useEffect, useState } from 'react'
import {
  isWebPushSupported,
  getWebPushStatus,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  getNotifyOnReceived,
  setNotifyOnReceived,
  type WebPushStatus,
} from '../lib/webPush'

export function WebPushToggle() {
  const [status, setStatus]     = useState<WebPushStatus>('default')
  const [pref, setPref]         = useState<boolean>(true)
  const [busy, setBusy]         = useState(false)
  const [hint, setHint]         = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [s, p] = await Promise.all([getWebPushStatus(), getNotifyOnReceived()])
      if (cancelled) return
      setStatus(s)
      setPref(p)
    })()
    return () => { cancelled = true }
  }, [])

  // Render switch state: only visually ON when this browser is subscribed
  // AND the user pref is on. Mismatch (e.g. subscribed but pref off, or
  // pref on but unsubscribed in this browser) renders as OFF.
  const isOn = status === 'granted' && pref

  const supported = isWebPushSupported()
  const blockedByOS = status === 'denied'

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    setHint(null)
    try {
      if (!isOn) {
        // Turn ON: subscribe this browser, set pref true.
        const ok = await subscribeToWebPush()
        if (!ok) {
          setHint('Browser blocked the request. Check your site notification settings and try again.')
          return
        }
        await setNotifyOnReceived(true)
        setStatus('granted')
        setPref(true)
      } else {
        // Turn OFF: unsubscribe this browser, set pref false.
        await unsubscribeFromWebPush()
        await setNotifyOnReceived(false)
        setStatus('default')
        setPref(false)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.2em',
          color: 'rgba(242,237,228,0.5)',
          textTransform: 'uppercase',
        }}
      >
        Push Notifications
      </div>

      <div
        className="flex items-center justify-between"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          padding: '14px 16px',
          opacity: supported ? 1 : 0.55,
        }}
      >
        <div style={{ flex: 1, paddingRight: 12 }}>
          <div style={{ fontSize: 14, color: '#F2EDE4' }}>When someone lifts me</div>
          <div
            className="font-mono"
            style={{ fontSize: 11, color: 'rgba(242,237,228,0.5)', marginTop: 3 }}
          >
            {!supported
              ? 'This browser doesn\'t support web push.'
              : blockedByOS
              ? 'Blocked in your browser. Open site notification settings to re-enable.'
              : 'Get a notification when someone sends you a compliment.'}
          </div>
        </div>

        <div
          onClick={supported && !blockedByOS && !busy ? toggle : undefined}
          role="switch"
          aria-checked={isOn}
          style={{
            width: 44,
            height: 26,
            borderRadius: 99,
            background: isOn ? '#F5C842' : 'rgba(255,255,255,0.1)',
            position: 'relative',
            cursor: supported && !blockedByOS && !busy ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 3,
              left: isOn ? 21 : 3,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: isOn ? '#0D0D0D' : 'rgba(255,255,255,0.4)',
              transition: 'left 0.2s',
            }}
          />
        </div>
      </div>

      {hint && (
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            color: '#FF8B94',
            background: 'rgba(255,107,107,.07)',
            border: '1px solid rgba(255,107,107,.2)',
            borderRadius: 10,
            padding: '8px 10px',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
