// Web Push client helpers — mirror utils/notifications.ts on mobile.
//
// Flow:
//   1. ensureServiceWorker() registers /sw.js (once per origin).
//   2. requestWebPushPermission() asks the browser for Notification.permission.
//   3. subscribeToWebPush() creates a PushSubscription against our VAPID
//      public key, then pushes it onto profiles.web_push_subscriptions.
//   4. unsubscribeFromWebPush() removes the current browser's sub from
//      both the browser and the DB.
//
// VAPID public key comes from VITE_VAPID_PUBLIC_KEY at build time.
// Generate the pair once with `npx web-push generate-vapid-keys`,
// stash the private key in Supabase Edge Function secrets, and the
// public key in this .env.

import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type WebPushSubscriptionJson = {
  endpoint: string
  expirationTime: number | null
  keys: { p256dh: string; auth: string }
}

export type WebPushStatus =
  | 'unsupported'  // no service worker / push API in this browser
  | 'denied'       // permission denied; can't ask again without OS-level reset
  | 'granted'      // permission granted and currently subscribed
  | 'subscribed'   // synonym for granted (back-compat)
  | 'default'      // permission never asked

/** Browser feature detection. Returns false on Safari < 16 (iOS), older
 * Firefox, in-app webviews, etc. — anything where Web Push won't work. */
export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Current high-level state for the toggle UI. */
export async function getWebPushStatus(): Promise<WebPushStatus> {
  if (!isWebPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'default'

  // Permission granted — check if we're actually subscribed.
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return 'default'
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'granted' : 'default'
  } catch {
    return 'default'
  }
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  // Register against the absolute root so the SW controls /history etc.
  // type:'classic' is the default but spelling it out keeps Vite happy.
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

/** Base64-url → Uint8Array. PushManager.subscribe() needs the VAPID public
 * key as a raw Uint8Array, not a base64 string.
 *
 * Return type is pinned to `Uint8Array<ArrayBuffer>` (not the default
 * `Uint8Array<ArrayBufferLike>`) so it's assignable to `BufferSource` at
 * the call site. TypeScript 5.7 tightened this — without the pin, the
 * compiler treats the buffer as possibly a SharedArrayBuffer.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** True when an existing subscription's applicationServerKey equals the
 * configured VAPID public key. A null/missing key on the subscription
 * counts as a mismatch — we can't verify it, so resubscribe. */
function keyMatches(existing: ArrayBuffer | null, expected: Uint8Array): boolean {
  if (!existing) return false
  const a = new Uint8Array(existing)
  if (a.length !== expected.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== expected[i]) return false
  return true
}

/**
 * Asks for permission, registers the SW, subscribes, persists the sub on
 * the user's profile. Idempotent: a second call when already subscribed
 * is a no-op that returns the existing subscription.
 *
 * Returns true on success, false if the user denied permission, no VAPID
 * key is configured, or the platform doesn't support web push.
 */
export async function subscribeToWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) {
    console.warn('[webpush] unsupported in this browser')
    return false
  }
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[webpush] missing VITE_VAPID_PUBLIC_KEY')
    return false
  }

  // Ask permission (chrome and firefox auto-deny if you do this without a
  // user gesture; callers should invoke this from a click handler).
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission()
    if (result !== 'granted') return false
  } else if (Notification.permission !== 'granted') {
    return false
  }

  try {
    const reg = await ensureServiceWorker()
    // Wait until SW is active — `register` resolves before activation in
    // some browsers, and pushManager.subscribe() requires an active worker.
    // Bounded: a worker that goes `redundant` (install error, eviction)
    // never reaches `activated`, and the old unconditional wait hung the
    // toggle forever. 10s timeout, then let subscribe() fail loudly below.
    if (!reg.active) {
      await Promise.race([
        new Promise<void>((resolve) => {
          const w = reg.installing || reg.waiting
          if (!w) { resolve(); return }
          const onChange = () => {
            if (w.state === 'activated' || w.state === 'redundant') {
              w.removeEventListener('statechange', onChange)
              resolve()
            }
          }
          w.addEventListener('statechange', onChange)
        }),
        new Promise<void>((resolve) => { setTimeout(resolve, 10_000) }),
      ])
    }

    const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

    let sub = await reg.pushManager.getSubscription()
    if (sub && !keyMatches(sub.options.applicationServerKey, appServerKey)) {
      // Subscription was created under a previous VAPID key (the pair was
      // rotated 2026-06-12 after the private key leaked into a workspace
      // .env). Pushes signed with the current key would be rejected for
      // it, so drop it — browser and DB — and subscribe fresh below.
      const stale = sub.toJSON() as WebPushSubscriptionJson
      await sub.unsubscribe()
      await removeSubscriptionFromProfile(stale.endpoint)
      sub = null
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      })
    }

    // A subscription that never reaches the DB is a push that never
    // arrives — the server only sends to stored endpoints. Don't report
    // "subscribed" unless the row actually saved.
    const saved = await saveSubscriptionToProfile(sub.toJSON() as WebPushSubscriptionJson)
    if (!saved) {
      console.warn('[webpush] subscription created but NOT saved to profile')
      return false
    }
    return true
  } catch (e) {
    console.warn('[webpush] subscribe failed:', e)
    return false
  }
}

/** Remove the current browser's subscription from both the browser and
 * the user's profile. Other browsers / devices the user has subscribed
 * elsewhere keep working. */
export async function unsubscribeFromWebPush(): Promise<void> {
  if (!isWebPushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const json = sub.toJSON() as WebPushSubscriptionJson
  await sub.unsubscribe()
  await removeSubscriptionFromProfile(json.endpoint)
}

// ── DB helpers ────────────────────────────────────────────────────
// Both go through atomic RPCs (20260618_web_push_subscription_rpcs.sql).
// The old read-filter-write-back roundtrip let two devices subscribing
// near-simultaneously clobber each other's entry — the server now does
// the filter+append inside one UPDATE.

async function saveSubscriptionToProfile(sub: WebPushSubscriptionJson): Promise<boolean> {
  const { error } = await supabase.rpc('add_web_push_subscription', { p_sub: sub })
  if (error) {
    console.warn('[webpush] save subscription failed:', error.message)
    return false
  }
  return true
}

async function removeSubscriptionFromProfile(endpoint: string): Promise<void> {
  const { error } = await supabase.rpc('remove_web_push_subscription', { p_endpoint: endpoint })
  if (error) console.warn('[webpush] remove subscription failed:', error.message)
}

/** Per-user "notify when someone lifts me" flag — same column the mobile
 * Settings toggle uses. Server-side check honors this for all platforms. */
export async function getNotifyOnReceived(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return true
  const { data } = await supabase
    .from('profiles')
    .select('notify_on_received')
    .eq('id', userId)
    .single()
  return (data?.notify_on_received as boolean | undefined) ?? true
}

export async function setNotifyOnReceived(value: boolean): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return false
  const { error } = await supabase
    .from('profiles')
    .update({ notify_on_received: value })
    .eq('id', userId)
  return !error
}
