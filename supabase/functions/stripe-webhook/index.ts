// Supabase Edge Function (Deno) — Stripe webhook -> sync the subscriptions table.
// The webhook is the SOURCE OF TRUTH for subscription state (never the browser
// redirect). Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Env: STRIPE_WEBHOOK_SECRET (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY auto-injected).
//
// No Stripe SDK: verifies the signature with Web SubtleCrypto (HMAC-SHA256) and
// syncs straight from the event payload (subscription events carry the full
// object), then writes to Supabase via PostgREST with plain fetch — so it can't
// hit the SDK's Deno-incompatible HTTP client.
const WH_SECRET = (Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '').trim()
const SB_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim()
const SB_KEY = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim()

const STATUS: Record<string, string> = {
  trialing: 'trialing', active: 'active', past_due: 'past_due',
  canceled: 'canceled', unpaid: 'unpaid', incomplete: 'incomplete',
  incomplete_expired: 'expired', paused: 'suspended',
}

const enc = new TextEncoder()
function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Verify a Stripe "t=…,v1=…" signature header against the raw body. */
async function verify(body: string, header: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]))
  const t = parts['t']
  const v1 = parts['v1']
  if (!t || !v1 || !WH_SECRET) return false
  const key = await crypto.subtle.importKey('raw', enc.encode(WH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = toHex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`)))
  // constant-time-ish compare
  if (mac.length !== v1.length) return false
  let diff = 0
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ v1.charCodeAt(i)
  return diff === 0
}

async function updateByOrg(orgId: string, patch: Record<string, unknown>) {
  if (!orgId) return
  // A real DB failure (HTTP error) must throw so the handler returns 500 and
  // Stripe RETRIES — never silently ack an event whose DB write failed (H4).
  const res = await fetch(
    `${SB_URL}/rest/v1/subscriptions?org_id=eq.${encodeURIComponent(orgId)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
  )
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`subscriptions update failed (HTTP ${res.status}) ${detail}`)
  }
}

// deno-lint-ignore no-explicit-any
async function syncSubscription(sub: any) {
  const orgId = sub?.metadata?.orgId ?? ''
  if (!orgId) return
  const price = sub?.items?.data?.[0]?.price
  await updateByOrg(orgId, {
    status: STATUS[sub.status] ?? 'active',
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    stripe_subscription_id: sub.id,
    stripe_price_id: price?.id ?? null,
    billing_interval: price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
  })
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()
  if (!(await verify(body, sig))) {
    console.error('[stripe-webhook] bad signature')
    return new Response('Bad signature', { status: 400 })
  }

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(body)
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  try {
    const obj = event.data.object as Record<string, unknown>
    switch (event.type) {
      case 'checkout.session.completed': {
        const orgId = (obj.client_reference_id as string) ?? ((obj.metadata as Record<string, string>)?.orgId) ?? ''
        if (orgId && typeof obj.customer === 'string') await updateByOrg(orgId, { stripe_customer_id: obj.customer })
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(obj)
        break
      case 'invoice.payment_failed': {
        const orgId = ((obj.subscription_details as Record<string, unknown>)?.metadata as Record<string, string>)?.orgId ?? ''
        if (orgId) await updateByOrg(orgId, { status: 'past_due' })
        break
      }
      case 'invoice.paid': {
        const orgId = ((obj.subscription_details as Record<string, unknown>)?.metadata as Record<string, string>)?.orgId ?? ''
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
