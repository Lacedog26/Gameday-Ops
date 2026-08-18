import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Supabase configuration. Reads from Vite env vars set in Vercel:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  (and optional VITE_BOARD_ID)
//
// When BOTH url + anon key are present, the app runs in "cloud" mode: state is
// stored in Supabase and synced live to every TV. When they're absent, the app
// falls back to local storage (single-device) — so the same build works before
// and after the backend is connected, and nothing breaks if env vars are unset.
// ---------------------------------------------------------------------------

// Interim single-tenant defaults for the Buffalo Bills deployment so the board
// works without configuring Vercel env vars. The Supabase anon key is public by
// design (it ships in the client bundle regardless) and is protected by RLS;
// the commercial/white-label build overrides these via env vars per tenant and
// moves writes behind Supabase Auth (Phase 5). To point at a different project,
// set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in Vercel — they win over these.
const DEFAULT_URL = 'https://aefrrchhrwjepaiimwju.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZnJyY2hocndqZXBhaWltd2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NDUzMDEsImV4cCI6MjEwMjAyMTMwMX0.RVMr8DzTaOH7QCyQMyLiz4VHRkpFGDNVzuJJqjJE88g'

// Normalize a Supabase URL so a slightly-off env value (missing scheme, a
// trailing slash, stray whitespace, or an accidental /rest|/auth path) can't
// turn every auth/data request into a "Failed to fetch" against a bad host.
function normalizeUrl(raw?: string): string | undefined {
  let s = raw?.trim()
  if (!s) return undefined
  if (!/^https?:\/\//i.test(s)) s = `https://${s}` // tolerate a missing scheme
  try {
    // Keep only scheme + host (Supabase base URL); drop any path/query/trailing slash.
    return new URL(s).origin
  } catch {
    return undefined // unparseable → treat as unset (falls back to local mode)
  }
}

const envUrl = normalizeUrl(import.meta.env.VITE_SUPABASE_URL)
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// The baked Bills defaults are a MATCHED pair (same project). Use them only when
// a deployment sets neither var (the legacy single-tenant NFL/Bills build). If a
// deployment sets one, it must set both: never pair a custom URL with the default
// key (or vice-versa) — that mismatch is a guaranteed 401 "Invalid API key". A
// deployment that supplies only one falls back to local mode instead of talking
// to the wrong project. (This keeps the NFL build identical — it sets neither.)
const url = envUrl || (envKey ? undefined : DEFAULT_URL)
const anonKey = envKey || (envUrl ? undefined : DEFAULT_ANON_KEY)

export const BOARD_ID = import.meta.env.VITE_BOARD_ID?.trim() || 'default'

/** The effective Supabase base URL this build targets (for diagnostics). */
export const supabaseUrl = url

/** True when a Supabase backend is configured for this deployment. */
export const isCloudMode = Boolean(url && anonKey)

// One-time, non-sensitive diagnostic so the target project is visible in the
// browser console (the host is public; the key is never logged). Makes a
// "Failed to fetch" trivial to trace: it shows exactly which host is called.
if (typeof console !== 'undefined') {
  console.info(
    isCloudMode ? `[GameDayOps] Supabase cloud mode → ${url}` : '[GameDayOps] local mode (no Supabase configured)',
  )
}

/** The shared client, or null in local mode. Created once. */
export const supabase: SupabaseClient | null = isCloudMode
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null
