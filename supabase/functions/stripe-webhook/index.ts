// Supabase Edge Function (Deno) — Stripe webhook -> sync the subscriptions table.
// The webhook is the SOURCE OF TRUTH for subscription state (never the browser
// redirect). Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY are auto-injected).
//
// Uses the Web Fetch HTTP client + SubtleCrypto provider so it runs on the
// Supabase Edge (Deno) runtime; the default Node HTTP/crypto path calls
// unsupported Deno internals (Deno.core.runMicrotasks) and crashes the function.
import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()
const whSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

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
    event = await stripe.webhooks.constructEventAsync(body, sig, whSecret, undefined, cryptoProvider)
  } catch (e) {
    console.error('[stripe-webhook] bad signature', e instanceof Error ? e.message : e)
    return new Response(`Bad signature: ${e instanceof Error ? e.message : ''}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const orgId = (s.client_reference_id as string) ?? (s.metadata?.orgId as string) ?? ''
        if (orgId && s.subscription) {
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
    console.error('[stripe-webhook] handler', e instanceof Error ? e.message : e)
    return new Response(`Handler error: ${e instanceof Error ? e.message : ''}`, { status: 500 })
  }
  return Response.json({ received: true })
})
