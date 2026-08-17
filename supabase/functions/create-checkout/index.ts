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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  try {
    const { interval = 'monthly', orgId, email } = await req.json()
    const price = interval === 'annual' ? PRICE.annual : PRICE.monthly
    if (!price) return new Response('Stripe prices not configured', { status: 500 })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      client_reference_id: orgId,
      subscription_data: { trial_period_days: 14, metadata: { orgId } },
      success_url: `${SITE}/#/admin?checkout=success`,
      cancel_url: `${SITE}/#/admin?checkout=cancel`,
    })
    return Response.json({ url: session.url })
  } catch (e) {
    return new Response(`Error: ${e instanceof Error ? e.message : 'unknown'}`, { status: 500 })
  }
})
