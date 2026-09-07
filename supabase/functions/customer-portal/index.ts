// Supabase Edge Function (Deno) — open the Stripe Customer Billing Portal.
// Deploy: supabase functions deploy customer-portal
// Env: STRIPE_SECRET_KEY, PUBLIC_SITE_URL (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// auto-injected). Uses plain fetch for both Stripe and Supabase (no SDK HTTP
// client — the Stripe SDK client fails on the Supabase Edge/Deno runtime).
//
// SECURITY (C6): the caller must present a valid Supabase JWT AND be a member of
// the org whose portal they're opening, so a user can't open another org's
// billing portal by passing a different orgId. Auth helpers are INLINED (not
// imported) so this function is self-contained for dashboard paste-deploy.
const STRIPE_KEY = (Deno.env.get('STRIPE_SECRET_KEY') ?? '').trim()
const SB_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim()
const SB_KEY = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
const SB_ANON = (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim()
const SITE = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://pregameopscfb.app'

/** Resolve the authenticated user from the request's Bearer JWT, or null. */
async function getUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  try {
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SB_ANON || SB_KEY },
    })
    if (!res.ok) return null
    const u = await res.json()
    return u?.id ? { id: u.id as string, email: u.email as string | undefined } : null
  } catch {
    return null
  }
}

/** Is `userId` a member of `orgId`? Checked with the service role via PostgREST. */
async function isOrgMember(userId: string, orgId: string): Promise<boolean> {
  if (!userId || !orgId) return false
  try {
    const url =
      `${SB_URL}/rest/v1/memberships?user_id=eq.${encodeURIComponent(userId)}` +
      `&org_id=eq.${encodeURIComponent(orgId)}&select=user_id&limit=1`
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    })
    if (!res.ok) return false
    const rows = await res.json()
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return false
  }
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const { orgId } = await req.json()
    if (!orgId) return json({ error: 'Missing orgId' }, 400)

    // --- AuthZ: valid JWT + membership of THIS org ---
    const user = await getUser(req)
    if (!user) return json({ error: 'Authentication required' }, 401)
    if (!(await isOrgMember(user.id, orgId))) {
      return json({ error: 'Not authorized for this organization' }, 403)
    }

    // Look up the org's Stripe customer id via PostgREST (service role).
    const q = await fetch(
      `${SB_URL}/rest/v1/subscriptions?org_id=eq.${encodeURIComponent(orgId)}&select=stripe_customer_id`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
    )
    const rows = await q.json()
    const customer = Array.isArray(rows) ? rows[0]?.stripe_customer_id : undefined
    if (!customer) return json({ error: 'No Stripe customer for this org yet — start a subscription first.' }, 400)

    const form = new URLSearchParams()
    form.set('customer', customer)
    form.set('return_url', `${SITE}/#/admin`)
    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message ?? `Stripe HTTP ${res.status}`
      console.error('[customer-portal]', msg)
      return json({ error: msg }, 500)
    }
    return json({ url: data.url })
  } catch (e) {
    console.error('[customer-portal]', e instanceof Error ? e.message : e)
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500)
  }
})
