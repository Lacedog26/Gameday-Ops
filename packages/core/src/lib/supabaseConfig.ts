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

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || DEFAULT_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || DEFAULT_ANON_KEY

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
