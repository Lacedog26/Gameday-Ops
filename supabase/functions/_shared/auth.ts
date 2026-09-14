// Shared auth helpers for edge functions (Deno). Verify the caller's Supabase
// JWT and that they belong to the org they're acting on — so orgId from the
// request body can NEVER be used to reach another org's Stripe data (C5/C6).
//
// Uses plain fetch against Supabase's auth + PostgREST endpoints (no SDK — the
// Stripe SDK's HTTP client is incompatible with this runtime, and fetch keeps
// every function consistent). SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY are auto-injected by the platform.

const SB_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim()
const SB_ANON = (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim()
const SB_SERVICE = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()

export interface AuthedUser {
  id: string
  email?: string
}

/** Resolve the authenticated user from the request's Bearer JWT, or null. */
export async function getUser(req: Request): Promise<AuthedUser | null> {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  try {
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SB_ANON || SB_SERVICE },
    })
    if (!res.ok) return null
    const u = await res.json()
    return u?.id ? { id: u.id as string, email: u.email as string | undefined } : null
  } catch {
    return null
  }
}

/** Is `userId` a member of `orgId`? Checked with the service role via PostgREST. */
export async function isOrgMember(userId: string, orgId: string): Promise<boolean> {
  if (!userId || !orgId) return false
  try {
    const url =
      `${SB_URL}/rest/v1/memberships?user_id=eq.${encodeURIComponent(userId)}` +
      `&org_id=eq.${encodeURIComponent(orgId)}&select=user_id&limit=1`
    const res = await fetch(url, {
      headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` },
    })
    if (!res.ok) return false
    const rows = await res.json()
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return false
  }
}
