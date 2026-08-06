import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ── Config ─────────────────────────────────────────────────────
// Set these as Supabase Edge Function secrets:
//   supabase secrets set REVENUECAT_WEBHOOK_AUTH_KEY=your_key
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
const REVENUECAT_WEBHOOK_AUTH_KEY = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Team-tier product IDs — must match TEAM_PRODUCT_IDS in src/utils/revenuecat.ts
const TEAM_PRODUCT_TO_TIER: Record<string, string> = {
  "oc_team_monthly":       "team",
  "oc_growth_monthly":     "growth",
  "oc_enterprise_monthly": "enterprise",
};

// ── RevenueCat event types ─────────────────────────────────────
type RCEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "BILLING_ISSUE"
  | "SUBSCRIBER_ALIAS"
  | "PRODUCT_CHANGE"
  | "EXPIRATION"
  | "TRANSFER"
  | "NON_RENEWING_PURCHASE"
  | "SUBSCRIPTION_PAUSED"
  | "SUBSCRIPTION_EXTENDED"
  | "TEMPORARY_ENTITLEMENT_GRANT";

interface RCEvent {
  type: RCEventType;
  app_user_id: string;
  original_app_user_id: string;
  product_id: string;
  entitlement_ids: string[] | null;
  period_type: string;
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  environment: string;
  store: string;
  is_trial_period?: boolean;
  cancellation_reason?: string;
  price_in_purchased_currency?: number;
  currency?: string;
  subscriber_attributes?: Record<string, { value: string }>;
}

interface RCWebhookPayload {
  api_version: string;
  event: RCEvent;
}

serve(async (req: Request) => {
  // ── Only accept POST ──
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // ── Verify webhook auth ──
  if (REVENUECAT_WEBHOOK_AUTH_KEY) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH_KEY}`) {
      console.error("Unauthorized webhook request");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // ── Parse body ──
  let payload: RCWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = payload.event;
  const userId = event.app_user_id;
  const eventType = event.type;

  console.log(`RevenueCat webhook: ${eventType} for user ${userId}`);

  // ── Supabase admin client (bypasses RLS) ──
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Determine subscription status ──
  const isActive = [
    "INITIAL_PURCHASE",
    "RENEWAL",
    "UNCANCELLATION",
    "SUBSCRIPTION_EXTENDED",
    "NON_RENEWING_PURCHASE",
    "TEMPORARY_ENTITLEMENT_GRANT",
  ].includes(eventType);

  const isInactive = [
    "EXPIRATION",
    "CANCELLATION",
  ].includes(eventType);

  const isBillingIssue = eventType === "BILLING_ISSUE";

  // ── Upsert subscription record ──
  const now = new Date().toISOString();
  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  const subscriptionData = {
    user_id: userId,
    product_id: event.product_id,
    store: event.store,
    environment: event.environment,
    is_active: isActive,
    is_trial: event.is_trial_period ?? false,
    period_type: event.period_type,
    purchased_at: new Date(event.purchased_at_ms).toISOString(),
    expires_at: expiresAt,
    cancellation_reason: event.cancellation_reason ?? null,
    has_billing_issue: isBillingIssue,
    price: event.price_in_purchased_currency ?? null,
    currency: event.currency ?? null,
    last_event_type: eventType,
    updated_at: now,
  };

  // ── Team tier purchase? Route to team_subscriptions instead of profiles ──
  const teamTierId = TEAM_PRODUCT_TO_TIER[event.product_id];
  const teamId = event.subscriber_attributes?.purchasing_team_id?.value;

  if (teamTierId) {
    if (!teamId) {
      console.error(
        `Team product ${event.product_id} purchased but purchasing_team_id attribute is missing for user ${userId}`,
      );
    } else if (isActive) {
      // Activate (or switch) the team's subscription via RPC
      const { error: rpcError } = await supabase.rpc("activate_team_subscription_admin", {
        p_team_id: teamId,
        p_tier_id: teamTierId,
        p_external_id: event.product_id,
      });
      if (rpcError) {
        console.error("Team activation error:", rpcError);
        // Fall back to a direct upsert so we don't lose the purchase
        const { error: upsertErr } = await supabase
          .from("team_subscriptions")
          .upsert(
            {
              team_id: teamId,
              tier_id: teamTierId,
              status: "active",
              external_id: event.product_id,
              current_period_start: now,
              current_period_end: expiresAt ?? now,
              cancel_at_period_end: false,
              updated_at: now,
            },
            { onConflict: "team_id" },
          );
        if (upsertErr) console.error("Team subscription upsert error:", upsertErr);
      }
    } else if (isInactive) {
      const newStatus = eventType === "CANCELLATION" ? "canceled" : "canceled";
      const { error: deactErr } = await supabase
        .from("team_subscriptions")
        .update({
          status: newStatus,
          cancel_at_period_end: true,
          updated_at: now,
        })
        .eq("team_id", teamId);
      if (deactErr) console.error("Team deactivation error:", deactErr);
    } else if (isBillingIssue) {
      const { error: billErr } = await supabase
        .from("team_subscriptions")
        .update({ status: "past_due", updated_at: now })
        .eq("team_id", teamId);
      if (billErr) console.error("Team billing issue update error:", billErr);
    }

    // Log for audit and return — team purchases don't touch profiles.is_pro
    await supabase.from("subscription_events").insert({
      user_id: userId,
      event_type: eventType,
      product_id: event.product_id,
      store: event.store,
      environment: event.environment,
      raw_event: event,
      created_at: now,
    });
    return new Response(JSON.stringify({ received: true, kind: "team", team_id: teamId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Individual Pro subscription path ──
  const { error: subError } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, { onConflict: "user_id" });

  if (subError) {
    console.error("Subscription upsert error:", subError);
    // Don't return 500 — RevenueCat would retry. Log and acknowledge.
  }

  // ── Update profile pro status ──
  if (isActive) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_pro: true, updated_at: now })
      .eq("id", userId);

    if (error) console.error("Profile pro update error:", error);
  } else if (isInactive) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_pro: false, updated_at: now })
      .eq("id", userId);

    if (error) console.error("Profile pro revoke error:", error);
  }

  // ── Log webhook event for audit ──
  const { error: logError } = await supabase
    .from("subscription_events")
    .insert({
      user_id: userId,
      event_type: eventType,
      product_id: event.product_id,
      store: event.store,
      environment: event.environment,
      raw_event: event,
      created_at: now,
    });

  if (logError) console.error("Event log error:", logError);

  // ── Always return 200 to acknowledge ──
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
