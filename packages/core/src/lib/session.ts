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
  /**
   * A TV display's opaque token when running as a kiosk opened via
   * `/display/<token>`. In this mode the storage layer reads that display's org
   * board through a SECURITY DEFINER RPC (no login, read-only) rather than a
   * direct table select, so a TV shows the correct org's board without exposing
   * any other org's data.
   */
  displayToken: string | null
}

let currentOrgId: string | null = null
let currentDisplayToken: string | null = null
const listeners = new Set<(scope: BoardScope) => void>()

export function getScope(): BoardScope {
  return {
    orgId: currentOrgId,
    boardId: currentDisplayToken
      ? `display-${currentDisplayToken}`
      : currentOrgId
        ? `org-${currentOrgId}`
        : publicBoardId(),
    displayToken: currentDisplayToken,
  }
}

/** Set (or clear) the active org. Notifies subscribers so the board reloads. */
export function setActiveOrg(orgId: string | null): void {
  if (orgId === currentOrgId) return
  currentOrgId = orgId
  const scope = getScope()
  listeners.forEach((fn) => fn(scope))
}

/**
 * Enter (or leave) read-only display mode for a specific TV token. Clears any
 * org scope so a kiosk never reads or writes an authenticated board.
 */
export function setDisplayToken(token: string | null): void {
  if (token === currentDisplayToken) return
  currentDisplayToken = token
  if (token) currentOrgId = null
  const scope = getScope()
  listeners.forEach((fn) => fn(scope))
}

/** Subscribe to scope changes (used by the dashboard to reload the board). */
export function subscribeScope(fn: (scope: BoardScope) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
