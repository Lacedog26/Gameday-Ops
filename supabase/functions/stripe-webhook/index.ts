// Supabase Edge Function (Deno) — Stripe webhook -> update subscriptions.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS to write status).
import Stripe from 'https://esm.sh/stripe@16?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' })
const whSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, whSecret)
  } catch (e) {
    return new Response(`Bad signature: ${e instanceof Error ? e.message : ''}`, { status: 400 })
  }

  const upsert = async (orgId: string, patch: Record<string, unknown>) => {
    await admin.from('subscriptions').update({ ...patch, updated_at: new Date().toISOString() }).eq('org_id', orgId)
  }

  if (event.type.startsWith('customer.subscription')) {
    const sub = event.data.object as Stripe.Subscription
    const orgId = (sub.metadata?.orgId as string) ?? ''
    if (orgId) {
      const statusMap: Record<string, string> = {
        trialing: 'trialing', active: 'active', past_due: 'past_due',
        canceled: 'canceled', unpaid: 'suspended', incomplete_expired: 'expired',
      }
      await upsert(orgId, {
        status: statusMap[sub.status] ?? 'active',
        stripe_customer_id: sub.customer,
        stripe_subscription_id: sub.id,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      })
    }
  }
  return Response.json({ received: true })
})
