import type { AppState } from '../types'
import { supabase, isCloudMode } from './supabaseConfig'
import { productConfig } from '../product'
import { getScope } from './session'

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

// Product-scoped storage so NFL and College never share a board or local cache.
// Each product sets `storageNamespace` in its ProductConfig; when unset (the
// legacy NFL deployment) we keep the original key/board so nothing resets.
function productNamespace(): string | null {
  try {
    return productConfig().storageNamespace ?? null
  } catch {
    return null
  }
}
function scopedStorageKey(): string {
  const ns = productNamespace()
  return ns ? `gamedayops:${ns}:v1` : STORAGE_KEY
}

export interface StorageAdapter {
  load(): Promise<AppState | null>
  save(state: AppState): Promise<void>
  /**
   * Persist NOW and resolve only when the write has actually SUCCEEDED; REJECTS
   * if it failed. Unlike `save` (fire-and-forget, debounced, best-effort), this
   * is what an explicit "Save Changes" button awaits so the UI can show real
   * success or a real error — never a false "saved".
   */
  saveNow(state: AppState): Promise<void>
  /** Subscribe to external changes (other TVs/tabs). Returns unsubscribe. */
  subscribe(handler: (state: AppState) => void): () => void
}

/** localStorage-backed adapter with cross-tab sync via the `storage` event. */
export class LocalStorageAdapter implements StorageAdapter {
  private keyOverride?: string

  constructor(key?: string) {
    this.keyOverride = key
  }

  /** Resolved lazily so it reflects the configured product namespace. */
  private keyName(): string {
    return this.keyOverride ?? scopedStorageKey()
  }

  async load(): Promise<AppState | null> {
    try {
      const raw = localStorage.getItem(this.keyName())
      if (!raw) return null
      return JSON.parse(raw) as AppState
    } catch (err) {
      console.warn('[storage] failed to load state', err)
      return null
    }
  }

  async save(state: AppState): Promise<void> {
    try {
      localStorage.setItem(this.keyName(), JSON.stringify(state))
    } catch (err) {
      console.warn('[storage] failed to save state', err)
    }
  }

  /** Awaited save that surfaces failure (e.g. quota exceeded) to the caller. */
  async saveNow(state: AppState): Promise<void> {
    localStorage.setItem(this.keyName(), JSON.stringify(state))
  }

  subscribe(handler: (state: AppState) => void): () => void {
    const listener = (e: StorageEvent) => {
      if (e.key !== this.keyName() || !e.newValue) return
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
  private boardIdOverride?: string
  // Random per-session id so we can ignore the realtime echo of our own writes.
  private clientId = Math.random().toString(36).slice(2) + Date.now().toString(36)
  private saveTimer: ReturnType<typeof setTimeout> | undefined
  private pending: AppState | null = null

  constructor(boardId?: string) {
    this.boardIdOverride = boardId
  }

  /**
   * The active board row id. When overridden (tests) that wins; otherwise it
   * tracks the live board scope: the public/demo board for anonymous visitors,
   * or `org-<uuid>` once a user signs in (RLS isolates it to that org).
   */
  private boardName(): string {
    return this.boardIdOverride ?? getScope().boardId
  }

  /** The org id for the active board (null for the public/demo board). */
  private orgId(): string | null {
    return this.boardIdOverride ? null : getScope().orgId
  }

  /** The TV display token when running as a kiosk (read-only), else null. */
  private displayToken(): string | null {
    return this.boardIdOverride ? null : getScope().displayToken
  }

  /**
   * Offline cache, scoped so tenants never bleed into one another. The public
   * board keeps the legacy key (unchanged for NFL + the current demo); each org
   * board — and each TV display — gets its own suffix.
   */
  private cache(): LocalStorageAdapter {
    const token = this.displayToken()
    const orgId = this.orgId()
    const base = scopedStorageKey()
    if (token) return new LocalStorageAdapter(`${base}:display-${token}`)
    return new LocalStorageAdapter(orgId ? `${base}:org-${orgId}` : base)
  }

  /**
   * Load a TV display's board through the SECURITY DEFINER `display_board` RPC.
   * Anonymous kiosks have NO direct select on `boards`; the RPC returns only the
   * board of the org that owns the given token, so a TV can never read another
   * org's data even by changing the URL token.
   */
  private async loadViaDisplayToken(token: string): Promise<AppState | null> {
    const cache = this.cache()
    if (!supabase) return cache.load()
    try {
      const { data, error } = await supabase.rpc('display_board', { p_token: token })
      if (error) throw error
      const state = (data as AppState | null) ?? null
      if (state) cache.save(state)
      return state
    } catch (err) {
      console.warn('[storage] display load failed, using cache', err)
      return cache.load()
    }
  }

  async load(): Promise<AppState | null> {
    const token = this.displayToken()
    if (token) return this.loadViaDisplayToken(token)

    const cache = this.cache()
    if (!supabase) return cache.load()
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('state')
        .eq('id', this.boardName())
        .maybeSingle()
      if (error) throw error
      const state = (data?.state as AppState | undefined) ?? null
      if (state) {
        cache.save(state) // refresh offline cache
        return state
      }
      // Empty cloud board. For a fresh org, return null so the provider seeds a
      // clean default (never bleed the public demo into a new customer's board).
      if (this.orgId()) return null
      // Public/demo board: seed it from this device's local state so every TV
      // converges on the same board.
      const cached = await cache.load()
      if (cached) this.save(cached)
      return cached
    } catch (err) {
      console.warn('[storage] cloud load failed, using cache', err)
      return cache.load()
    }
  }

  async save(state: AppState): Promise<void> {
    // A TV display is strictly read-only — never write back to the org's board.
    if (this.displayToken()) return
    // Always mirror locally immediately (offline cache + instant same-device).
    this.cache().save(state)
    if (!supabase) return
    // Debounce network writes so rapid admin edits don't spam the database.
    this.pending = state
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flush(), 400)
  }

  /**
   * Awaited, non-debounced save that REJECTS on failure so the caller can show
   * a truthful result. Used by explicit "Save Changes" actions.
   */
  async saveNow(state: AppState): Promise<void> {
    if (this.displayToken()) {
      throw new Error('This is a read-only TV display and cannot save changes.')
    }
    // Cancel any queued debounced write; this call supersedes it.
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = undefined
    }
    this.pending = null
    this.cache().save(state)
    if (!supabase) return // local-only deployment: cache write above is the save
    const { error } = await supabase.from('boards').upsert(
      {
        id: this.boardName(),
        org_id: this.orgId(),
        state,
        updated_by: this.clientId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    if (error) throw new Error(error.message || 'Database write was rejected.')
  }

  private async flush(): Promise<void> {
    if (!supabase || !this.pending) return
    const state = this.pending
    this.pending = null
    try {
      const { error } = await supabase.from('boards').upsert(
        {
          id: this.boardName(),
          org_id: this.orgId(),
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
    const unsubCache = this.cache().subscribe(handler)
    const client = supabase
    if (!client) return unsubCache

    // TV display (anon): no direct board select and no realtime, so poll the
    // display_board RPC to stay in sync with admin edits.
    const token = this.displayToken()
    if (token) {
      let stopped = false
      const poll = async () => {
        if (stopped) return
        const next = await this.loadViaDisplayToken(token)
        if (!stopped && next) handler(next)
      }
      const timer = setInterval(poll, 5000)
      return () => {
        stopped = true
        clearInterval(timer)
        unsubCache()
      }
    }

    const boardId = this.boardName()
    const channel = client
      .channel(`boards:${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` },
        (payload) => {
          const row = payload.new as { state?: AppState; updated_by?: string } | undefined
          // Ignore the echo of our own write.
          if (!row?.state || row.updated_by === this.clientId) return
          this.cache().save(row.state)
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
