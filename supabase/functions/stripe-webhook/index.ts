// Supabase Edge Function (Deno) — Stripe webhook -> sync the subscriptions table.
// The webhook is the SOURCE OF TRUTH for subscription state (never the browser
// redirect). Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS to write status).
import Stripe from 'https://esm.sh/stripe@16?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' })
const whSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

// Map Stripe subscription status -> our enum.
const STATUS: Record<string, string> = {
  trialing: 'trialing', active: 'active', past_due: 'past_due',
  canceled: 'canceled', unpaid: 'unpaid', incomplete: 'incomplete',
  incomplete_expired: 'expired', paused: 'suspended',
}

async function updateByOrg(orgId: string, patch: Record<string, unknown>) {
  if (!orgId) return
  await admin.from('subscriptions').update({ ...patch, updated_at: new Date().toISOString() }).eq('org_id', orgId)
}

async function syncSubscription(sub: Stripe.Subscription) {
  const orgId = (sub.metadata?.orgId as string) ?? ''
  if (!orgId) return
  const price = sub.items.data[0]?.price
  await updateByOrg(orgId, {
    status: STATUS[sub.status] ?? 'active',
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    stripe_price_id: price?.id ?? null,
    billing_interval: price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
  })
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, whSecret)
  } catch (e) {
    return new Response(`Bad signature: ${e instanceof Error ? e.message : ''}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const orgId = (s.client_reference_id as string) ?? (s.metadata?.orgId as string) ?? ''
        if (orgId && s.subscription) {
          // Pull the full subscription so we sync status/period/price in one place.
          const sub = await stripe.subscriptions.retrieve(s.subscription as string)
          if (!sub.metadata?.orgId) sub.metadata = { ...sub.metadata, orgId }
          await syncSubscription(sub)
          if (typeof s.customer === 'string') await updateByOrg(orgId, { stripe_customer_id: s.customer })
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const orgId = (inv.subscription_details?.metadata?.orgId as string) ?? ''
        if (orgId) await updateByOrg(orgId, { status: 'past_due' })
        break
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice
        const orgId = (inv.subscription_details?.metadata?.orgId as string) ?? ''
        if (orgId) await updateByOrg(orgId, { status: 'active' })
        break
      }
    }
  } catch (e) {
    return new Response(`Handler error: ${e instanceof Error ? e.message : ''}`, { status: 500 })
  }
  return Response.json({ received: true })
})
