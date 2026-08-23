// Supabase Edge Function (Deno) — open the Stripe Customer Billing Portal.
// Deploy: supabase functions deploy customer-portal
// Env: STRIPE_SECRET_KEY, PUBLIC_SITE_URL (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// auto-injected). Uses plain fetch for both Stripe and Supabase (no SDK HTTP
// client — the Stripe SDK client fails on the Supabase Edge/Deno runtime).
const STRIPE_KEY = (Deno.env.get('STRIPE_SECRET_KEY') ?? '').trim()
const SB_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim()
const SB_KEY = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()
const SITE = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://pregameopscfb.app'

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
