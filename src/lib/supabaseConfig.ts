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

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const BOARD_ID = import.meta.env.VITE_BOARD_ID?.trim() || 'default'

/** True when a Supabase backend is configured for this deployment. */
export const isCloudMode = Boolean(url && anonKey)

/** The shared client, or null in local mode. Created once. */
export const supabase: SupabaseClient | null = isCloudMode
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null
