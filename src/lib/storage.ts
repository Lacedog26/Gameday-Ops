import type { AppState } from '../types'

// ---------------------------------------------------------------------------
// Persistence layer.
//
// The rest of the app talks to a small async `StorageAdapter` interface, NOT
// to localStorage directly. Today it's backed by localStorage; swapping in a
// Supabase or Firebase adapter later means implementing this one interface and
// changing a single line in DashboardContext — no component changes required.
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'bills-pregame-dashboard:v1'

export interface StorageAdapter {
  load(): Promise<AppState | null>
  save(state: AppState): Promise<void>
  /** Subscribe to external changes (e.g. another TV/tab). Returns unsubscribe. */
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

// A single shared instance for the app. To migrate backends, replace this with
// e.g. `new SupabaseAdapter(client)` — nothing else needs to change.
export const storage: StorageAdapter = new LocalStorageAdapter()
