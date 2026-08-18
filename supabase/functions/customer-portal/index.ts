// Supabase Edge Function (Deno) — open the Stripe Customer Billing Portal.
// Lets a customer update payment method, change plan, view invoices, or cancel —
// all handled by Stripe, no billing UI of our own. Deploy:
//   supabase functions deploy customer-portal
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_SITE_URL.
import Stripe from 'https://esm.sh/stripe@16?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' })
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
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
    const { data } = await admin.from('subscriptions').select('stripe_customer_id').eq('org_id', orgId).maybeSingle()
    const customer = data?.stripe_customer_id as string | undefined
    if (!customer) return json({ error: 'No Stripe customer for this org yet — start a subscription first.' }, 400)
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${SITE}/#/admin`,
    })
    return json({ url: session.url })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500)
  }
})
