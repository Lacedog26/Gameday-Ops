import type { AppState } from '../types'
import { supabase, isCloudMode, BOARD_ID } from './supabaseConfig'

// ---------------------------------------------------------------------------
// Persistence layer.
//
// The app talks to a small async `StorageAdapter` interface, never to a backend
// directly. Two implementations:
//   • LocalStorageAdapter — single device, cross-tab sync (default/offline).
//   • SupabaseAdapter      — cloud database + realtime sync to every TV.
// The active one is chosen at the bottom based on whether Supabase env vars are
// configured, so the same build works before and after the backend is wired up.
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'bills-pregame-dashboard:v1'

export interface StorageAdapter {
  load(): Promise<AppState | null>
  save(state: AppState): Promise<void>
  /** Subscribe to external changes (other TVs/tabs). Returns unsubscribe. */
  subscribe(handler: (state: AppState) => void): () => void
}

/** localStorage-backed adapter with cross-tab sync via the `storage` event. */
export class LocalStorageAdapter implements StorageAdapter {
  private key: string

  constructor(key = STORAGE_KEY) {
    this.key = key
  }

  async load(): Promise<AppState | null> {
    try {
      const raw = localStorage.getItem(this.key)
      if (!raw) return null
      return JSON.parse(raw) as AppState
    } catch (err) {
      console.warn('[storage] failed to load state', err)
      return null
    }
  }

  async save(state: AppState): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(state))
    } catch (err) {
      console.warn('[storage] failed to save state', err)
    }
  }

  subscribe(handler: (state: AppState) => void): () => void {
    const listener = (e: StorageEvent) => {
      if (e.key !== this.key || !e.newValue) return
      try {
        handler(JSON.parse(e.newValue) as AppState)
      } catch {
        /* ignore malformed payloads */
      }
    }
    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
  }
}

/**
 * Supabase-backed adapter. State lives as one JSON row in `public.boards`
 * (see migration 0003). Realtime pushes every change to all connected TVs.
 * A local cache mirrors the last state so the board keeps working offline and
 * survives a cold boot; on failure it falls back to the cache rather than
 * crashing the display.
 */
export class SupabaseAdapter implements StorageAdapter {
  private boardId: string
  private cache = new LocalStorageAdapter()
  // Random per-session id so we can ignore the realtime echo of our own writes.
  private clientId = Math.random().toString(36).slice(2) + Date.now().toString(36)
  private saveTimer: ReturnType<typeof setTimeout> | undefined
  private pending: AppState | null = null

  constructor(boardId = BOARD_ID) {
    this.boardId = boardId
  }

  async load(): Promise<AppState | null> {
    if (!supabase) return this.cache.load()
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('state')
        .eq('id', this.boardId)
        .maybeSingle()
      if (error) throw error
      const state = (data?.state as AppState | undefined) ?? null
      if (state) this.cache.save(state) // refresh offline cache
      return state ?? (await this.cache.load())
    } catch (err) {
      console.warn('[storage] cloud load failed, using cache', err)
      return this.cache.load()
    }
  }

  async save(state: AppState): Promise<void> {
    // Always mirror locally immediately (offline cache + instant same-device).
    this.cache.save(state)
    if (!supabase) return
    // Debounce network writes so rapid admin edits don't spam the database.
    this.pending = state
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flush(), 400)
  }

  private async flush(): Promise<void> {
    if (!supabase || !this.pending) return
    const state = this.pending
    this.pending = null
    try {
      const { error } = await supabase.from('boards').upsert(
        {
          id: this.boardId,
          state,
          updated_by: this.clientId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      if (error) throw error
    } catch (err) {
      console.warn('[storage] cloud save failed (cached locally)', err)
    }
  }

  subscribe(handler: (state: AppState) => void): () => void {
    // Same-device tabs still sync via localStorage.
    const unsubCache = this.cache.subscribe(handler)
    const client = supabase
    if (!client) return unsubCache

    const channel = client
      .channel(`boards:${this.boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${this.boardId}` },
        (payload) => {
          const row = payload.new as { state?: AppState; updated_by?: string } | undefined
          // Ignore the echo of our own write.
          if (!row?.state || row.updated_by === this.clientId) return
          this.cache.save(row.state)
          handler(row.state)
        },
      )
      .subscribe()

    return () => {
      unsubCache()
      client.removeChannel(channel)
    }
  }
}

// Pick the adapter for this deployment. Cloud when configured, else local.
export const storage: StorageAdapter = isCloudMode
  ? new SupabaseAdapter()
  : new LocalStorageAdapter()
