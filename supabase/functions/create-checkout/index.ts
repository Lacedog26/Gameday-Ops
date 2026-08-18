// Supabase Edge Function (Deno) — create a Stripe Checkout session.
// Deploy: supabase functions deploy create-checkout
// Env (supabase secrets set ...): STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY,
//   STRIPE_PRICE_ANNUAL, PUBLIC_SITE_URL. Secrets never live in the repo.
import Stripe from 'https://esm.sh/stripe@16?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' })
const PRICE = {
  monthly: Deno.env.get('STRIPE_PRICE_MONTHLY') ?? '',
  annual: Deno.env.get('STRIPE_PRICE_ANNUAL') ?? '',
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
    const { interval = 'monthly', orgId, email } = await req.json()
    const price = interval === 'annual' ? PRICE.annual : PRICE.monthly
    if (!price) return json({ error: 'Stripe prices not configured' }, 500)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      client_reference_id: orgId,
      // Put orgId on the subscription so the webhook can map it back to the org.
      subscription_data: { trial_period_days: 14, metadata: { orgId } },
      allow_promotion_codes: true,
      success_url: `${SITE}/#/admin?checkout=success`,
      cancel_url: `${SITE}/#/admin?checkout=cancel`,
    })
    return json({ url: session.url })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500)
  }
})
