import { productConfig } from '../product'
import { BOARD_ID } from './supabaseConfig'

// ---------------------------------------------------------------------------
// Board scope — which board the storage layer reads/writes right now.
//
// Anonymous visitors (the public demo + TV displays) use a shared public board,
// exactly as before. Once a user signs in and their org is resolved (OrgProvider),
// the scope flips to that org's private board (`org-<uuid>`), which RLS isolates
// to the org's members. This is a tiny module-level store (not React) because the
// storage adapter is a singleton created at import time and must read the current
// scope lazily on every call.
// ---------------------------------------------------------------------------

/** The shared, public/demo board id for this product (unchanged legacy value). */
export function publicBoardId(): string {
  let ns: string | null = null
  try {
    ns = productConfig().storageNamespace ?? null
  } catch {
    ns = null
  }
  return ns ? `board-${ns}` : BOARD_ID
}

export interface BoardScope {
  /** The active org id, or null for the public/demo board. */
  orgId: string | null
  /** The board row id the storage layer should use. */
  boardId: string
}

let currentOrgId: string | null = null
const listeners = new Set<(scope: BoardScope) => void>()

export function getScope(): BoardScope {
  return {
    orgId: currentOrgId,
    boardId: currentOrgId ? `org-${currentOrgId}` : publicBoardId(),
  }
}

/** Set (or clear) the active org. Notifies subscribers so the board reloads. */
export function setActiveOrg(orgId: string | null): void {
  if (orgId === currentOrgId) return
  currentOrgId = orgId
  const scope = getScope()
  listeners.forEach((fn) => fn(scope))
}

/** Subscribe to scope changes (used by the dashboard to reload the board). */
export function subscribeScope(fn: (scope: BoardScope) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
