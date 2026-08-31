// Supabase Edge Function (Deno) — create a Stripe Checkout session.
// Deploy: supabase functions deploy create-checkout
// Env (secrets): STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL,
//   PUBLIC_SITE_URL. Secrets never live in the repo.
//
// Calls the Stripe REST API directly with the Web fetch API (no Stripe SDK HTTP
// client): the SDK's client hits Deno-incompatible internals / throws
// StripeConnectionError on the Supabase Edge runtime. Plain fetch is bulletproof
// here and surfaces Stripe's real error. The secret key is trimmed so a stray
// newline from copy-paste can't corrupt the Authorization header.
//
// SECURITY (C5): the caller must present a valid Supabase JWT AND be a member of
// the org they're checking out for. orgId from the body is verified against the
// authenticated user's memberships — it can never be swapped to another org.
import { getUser, isOrgMember } from '../_shared/auth.ts'

const STRIPE_KEY = (Deno.env.get('STRIPE_SECRET_KEY') ?? '').trim()
const PRICE = {
  monthly: (Deno.env.get('STRIPE_PRICE_MONTHLY') ?? '').trim(),
  annual: (Deno.env.get('STRIPE_PRICE_ANNUAL') ?? '').trim(),
}
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
    if (!STRIPE_KEY) return json({ error: 'STRIPE_SECRET_KEY not set' }, 500)
    const { interval = 'monthly', orgId } = await req.json()
    if (!orgId) return json({ error: 'Missing orgId' }, 400)

    // --- AuthZ: valid JWT + membership of THIS org (never trust body orgId) ---
    const user = await getUser(req)
    if (!user) return json({ error: 'Authentication required' }, 401)
    if (!(await isOrgMember(user.id, orgId))) {
      return json({ error: 'Not authorized for this organization' }, 403)
    }

    const price = interval === 'annual' ? PRICE.annual : PRICE.monthly
    if (!price) return json({ error: 'Stripe prices not configured' }, 500)

    // Stripe expects form-encoded params (bracket notation for nested fields).
    const form = new URLSearchParams()
    form.set('mode', 'subscription')
    form.set('line_items[0][price]', price)
    form.set('line_items[0][quantity]', '1')
    // Use the verified user's email, not a client-supplied one.
    if (user.email) form.set('customer_email', user.email)
    form.set('client_reference_id', orgId)
    form.set('subscription_data[metadata][orgId]', orgId)
    form.set('subscription_data[trial_period_days]', '14')
    form.set('allow_promotion_codes', 'true')
    form.set('success_url', `${SITE}/#/admin?checkout=success`)
    form.set('cancel_url', `${SITE}/#/admin?checkout=cancel`)

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = data?.error?.message ?? `Stripe HTTP ${res.status}`
      console.error('[create-checkout]', msg)
      return json({ error: msg }, 500)
    }
    return json({ url: data.url })
  } catch (e) {
    console.error('[create-checkout]', e instanceof Error ? e.message : e)
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500)
  }
})
