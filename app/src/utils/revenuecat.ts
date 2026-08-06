import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// ── Configuration ──────────────────────────────────────────────
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

// Entitlement ID configured in RevenueCat dashboard
export const PRO_ENTITLEMENT = 'pro';

// Wrap a RevenueCat/StoreKit call so a hung network read rejects instead
// of stalling forever. On a flaky or captive network these calls can stall
// indefinitely (device logs: "Receive failed … Operation timed out",
// "Connection has no local endpoint") — and an await that never returns
// freezes whatever gates on it (the app splash via checkProStatus, the
// ProScreen "Loading…" via getOfferings). Every caller already treats a
// rejection as "no definitive answer" and degrades gracefully, so a
// timeout is safe here. Purchases (the StoreKit sheet) is deliberately
// NOT wrapped — that flow is user-driven and can legitimately take long.
const RC_CALL_TIMEOUT_MS = 8000;
function withTimeout<T>(p: Promise<T>, label: string, ms = RC_CALL_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// Offering ID that contains the four team tier packages
export const TEAM_OFFERING = 'teams';

// Package identifiers (must match RevenueCat offering package IDs and team_subscription_tiers.id)
export type TeamTierId = 'team' | 'growth' | 'enterprise';

// RevenueCat product IDs per tier — used by the webhook to detect team purchases.
// These must match the App Store / Play Console product identifiers EXACTLY
// (the RC package identifiers differ — see tierFromPackage below for the
// fallback path).
export const TEAM_PRODUCT_IDS: Record<TeamTierId, string> = {
  team:       'onecompliment_team_monthly',
  growth:     'onecompliment_growth_monthly',
  enterprise: 'onecompliment_enterprise_monthly',
};

// RC package identifiers as configured in the `teams` offering. These are
// what PurchasesPackage.identifier returns; used as a secondary match so
// renaming Play Store product IDs later doesn't break the paywall.
const TEAM_PACKAGE_IDS: Record<TeamTierId, string> = {
  team:       'oc_team_monthly',
  growth:     'oc_growth_monthly',
  enterprise: 'oc_enterprise_monthly',
};

// ── Init ───────────────────────────────────────────────────────
export async function initRevenueCat(userId?: string | null) {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey, appUserID: userId ?? undefined });
}

// ── Identify user (after login / email link) ───────────────────
export async function identifyUser(userId: string) {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (e) {
    console.warn('RevenueCat identify error:', e);
    return null;
  }
}

// ── Check if user has Pro ──────────────────────────────────────
// Returns true/false when RevenueCat responds, null when unreachable.
// Callers must treat null as "keep existing state" — never downgrade on network error.
export async function checkProStatus(): Promise<boolean | null> {
  try {
    const customerInfo = await withTimeout(Purchases.getCustomerInfo(), 'getCustomerInfo');
    return customerInfoIsPro(customerInfo);
  } catch (e) {
    console.warn('RevenueCat check error:', e);
    return null;
  }
}

// ── Pro detection ─────────────────────────────────────────────
// Primary signal: the "pro" entitlement is active in RevenueCat.
// Fallback signal: customerInfo.activeSubscriptions contains an active
// user-Pro product (any SKU that mentions "pro" but isn't part of the
// team/group catalog). This catches the case where the App Store
// reports an active sandbox/production subscription but the RC
// dashboard hasn't (yet) attached that product to the "pro"
// entitlement — without the fallback, Apple's reviewer hits a
// paid-but-not-unlocked dead end and rejects under 2.1(b).
//
// Team/group products are excluded so a team-tier purchase never
// accidentally grants the user-level Pro entitlement.
const TEAM_OR_GROUP_TIER_KEYWORDS = ['team', 'growth', 'enterprise', 'group'];

// Match "pro" only as a delimited token (oc_pro_monthly, onecompliment_pro_annual,
// or bare "pro") — NOT as a substring, so unrelated SKUs like "oc_promo_bundle"
// or "improved_x" can't silently grant the Pro entitlement. Still excludes the
// team/group catalog so a team-tier purchase never grants user Pro.
const PRO_TOKEN = /(^|[_.\-])pro([_.\-]|$)/;

function isUserProProductId(sku: string): boolean {
  const id = sku.toLowerCase();
  if (!PRO_TOKEN.test(id)) return false;
  for (const k of TEAM_OR_GROUP_TIER_KEYWORDS) {
    if (id.includes(k)) return false;
  }
  return true;
}

function customerInfoIsPro(info: CustomerInfo): boolean {
  if (info.entitlements.active[PRO_ENTITLEMENT] !== undefined) return true;
  const active = info.activeSubscriptions ?? [];
  for (const sku of active) {
    if (isUserProProductId(sku)) return true;
  }
  return false;
}

// ── Reconcile RevenueCat + server Pro ──────────────────────────
// RevenueCat only knows about IAP purchases on THIS store account. Pro can
// also come from the website (Stripe → profiles.is_pro) or a manual admin
// grant — neither of which RevenueCat ever sees. So mobile must OR the two
// signals together; reading RevenueCat alone makes a web/admin-granted Pro
// user look Free in the app (paywalls on streak freeze, group creation, and
// Recap history they've already paid for).
//
// Both inputs use the same tri-state contract: true / false / null, where
// null means "couldn't reach this source — no opinion".
//   - either source says true  → Pro (also covers the few seconds after a
//                                 mobile purchase before the RC→webhook→
//                                 is_pro write lands)
//   - either source says false → not Pro (matches the prior RC-only behavior
//                                 of downgrading on a definitive false)
//   - both null                → null, so the caller keeps the cached state
//                                 rather than flipping a paying user to Free
//                                 on a transient network error
export function combineProStatus(
  rc: boolean | null,
  server: boolean | null,
): boolean | null {
  if (rc === true || server === true) return true;
  if (rc === false || server === false) return false;
  return null;
}

// ── Force-refresh customer info from the store ────────────────
// Invalidates the RC client-side cache, then asks RC to fetch
// fresh info. Use after a purchase/restore when the optimistic
// result didn't include the entitlement but the store may still
// be propagating the transaction.
async function refreshCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    await Purchases.invalidateCustomerInfoCache();
  } catch {
    // best-effort — cache invalidation isn't critical
  }
  try {
    return await withTimeout(Purchases.getCustomerInfo(), 'getCustomerInfo(refresh)');
  } catch (e) {
    console.warn('RevenueCat refresh error:', e);
    return null;
  }
}

// ── Get available packages (monthly / annual) ──────────────────
// Retries up to 3× with 400ms / 1.2s backoff. On TestFlight first
// launch the StoreKit handshake isn't always ready by the time the
// user reaches the Pro screen — first call returns no offerings,
// second usually succeeds. Without retry the UX is "Subscriptions
// unavailable" forever until the user kills and reopens the app.
//
// Returns `reason` even on success (set to null) so ProScreen can
// surface the diagnostic in the failure banner without rebuilding.
export async function getOfferings(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
  all: PurchasesPackage[];
  reason: string | null;
}> {
  const delays = [0, 400, 1200];
  let lastReason = 'unknown';

  // Smoke-test the API key first — if Metro didn't inline it (.env
  // missing from the EAS build profile), Purchases.configure runs
  // with empty string and every call fails with no obvious cause.
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  if (!apiKey) {
    return {
      monthly: null,
      annual: null,
      all: [],
      reason: 'no_api_key (EXPO_PUBLIC_REVENUECAT_*_KEY not in build env — check eas.json)',
    };
  }

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
    try {
      const offerings = await withTimeout(Purchases.getOfferings(), 'getOfferings');
      const current = offerings.current;

      if (!current) {
        const allKeys = Object.keys(offerings.all);
        lastReason = allKeys.length === 0
          ? 'no_offerings_returned (RC dashboard has no offerings, or API key is for the wrong project)'
          : `no_current_offering (set one of [${allKeys.join(', ')}] as Current in RC dashboard)`;
        continue;
      }

      const pkgCount = current.availablePackages.length;
      if (!current.monthly && !current.annual) {
        lastReason = pkgCount === 0
          ? `current_offering_empty (offering "${current.identifier}" has no packages — attach $rc_monthly and $rc_annual in RC dashboard)`
          : `no_monthly_or_annual_in_current (offering "${current.identifier}" has ${pkgCount} package(s) but none typed as $rc_monthly or $rc_annual)`;
        continue;
      }

      return {
        monthly: current.monthly,
        annual: current.annual,
        all: current.availablePackages,
        reason: null,
      };
    } catch (e: any) {
      lastReason = `threw: ${e?.message ?? String(e)}`;
    }
  }
  console.warn(`[RevenueCat] offerings unavailable after retries — ${lastReason}`);
  return { monthly: null, annual: null, all: [], reason: lastReason };
}

// ── Purchase a package ─────────────────────────────────────────
// If purchasePackage resolves without throwing but the entitlement
// isn't active yet, force a cache invalidation + refetch before
// reporting failure. This handles two important sandbox scenarios:
//   1. The user re-tapped Subscribe while already subscribed at the
//      App Store level (iOS shows "You're already subscribed"); RC's
//      first customerInfo can come back without the entitlement
//      attached because no new transaction occurred.
//   2. The receipt was made on a different RC app-user-id earlier
//      and needs an explicit cache flush to be picked up.
// Apple's reviewer hit (1) and rejected the build under 2.1(b).
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    if (customerInfoIsPro(customerInfo)) {
      return { success: true, customerInfo };
    }
    const refreshed = await refreshCustomerInfo();
    if (refreshed && customerInfoIsPro(refreshed)) {
      return { success: true, customerInfo: refreshed };
    }
    return { success: false, customerInfo: refreshed ?? customerInfo };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: e.message ?? 'Purchase failed' };
  }
}

// ── Restore purchases ──────────────────────────────────────────
// Apple Review explicitly tests this path. If RC's restore returns
// an info blob without the "pro" entitlement, fall back to an
// invalidate + refetch — the receipt sync sometimes lags by one
// network round-trip in sandbox.
export async function restorePurchases(): Promise<{
  success: boolean;
  isPro: boolean;
  error?: string;
}> {
  try {
    let customerInfo = await Purchases.restorePurchases();
    if (customerInfoIsPro(customerInfo)) {
      return { success: true, isPro: true };
    }
    const refreshed = await refreshCustomerInfo();
    if (refreshed) customerInfo = refreshed;
    return { success: true, isPro: customerInfoIsPro(customerInfo) };
  } catch (e: any) {
    return { success: false, isPro: false, error: e.message ?? 'Restore failed' };
  }
}

// ── Team tier offerings ────────────────────────────────────────
// Returns the team tier packages from the `teams` offering.
export async function getTeamOfferings(): Promise<Record<TeamTierId, PurchasesPackage | null>> {
  const empty: Record<TeamTierId, PurchasesPackage | null> = {
    team: null, growth: null, enterprise: null,
  };
  try {
    const offerings = await Purchases.getOfferings();
    const teamOffering = offerings.all[TEAM_OFFERING];
    if (!teamOffering) return empty;

    const result: Record<TeamTierId, PurchasesPackage | null> = { ...empty };
    for (const pkg of teamOffering.availablePackages) {
      const tier = tierFromPackage(pkg);
      if (tier) result[tier] = pkg;
    }
    return result;
  } catch (e) {
    console.warn('RevenueCat team offerings error:', e);
    return empty;
  }
}

function tierFromPackage(pkg: PurchasesPackage): TeamTierId | null {
  // Primary match — the actual Play/App Store product identifier.
  const pid = pkg.product.identifier;
  const byProduct = (Object.entries(TEAM_PRODUCT_IDS) as Array<[TeamTierId, string]>)
    .find(([, productId]) => productId === pid);
  if (byProduct) return byProduct[0];

  // Fallback — the RC package identifier configured in the `teams` offering
  // (e.g. "oc_team_monthly"). Covers the case where Play product IDs change
  // but the RC package layout stays put.
  const pkgId = pkg.identifier;
  const byPkg = (Object.entries(TEAM_PACKAGE_IDS) as Array<[TeamTierId, string]>)
    .find(([, packageId]) => packageId === pkgId);
  if (byPkg) return byPkg[0];

  // Last-resort bare-name fallback (e.g. "team" / "growth" / "enterprise").
  const bare = pkgId as TeamTierId;
  if (['team', 'growth', 'enterprise'].includes(bare)) return bare;
  return null;
}

// ── Purchase a team tier ───────────────────────────────────────
// Tags the purchase with the team_id so the webhook can attach
// the subscription to the right team.
export async function purchaseTeamTier(
  pkg: PurchasesPackage,
  teamId: string,
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  try {
    // Attach team_id as a subscriber attribute so the webhook can route it.
    // RevenueCat forwards these in the webhook payload under subscriber_attributes.
    await Purchases.setAttributes({
      purchasing_team_id: teamId,
      last_team_purchase_at: new Date().toISOString(),
    });

    const { productIdentifier } = await Purchases.purchasePackage(pkg);
    return { success: true, transactionId: productIdentifier };
  } catch (e: any) {
    if (e.userCancelled) return { success: false, error: 'cancelled' };
    return { success: false, error: e.message ?? 'Purchase failed' };
  }
}

// ── Purchase a group tier ──────────────────────────────────────
// Same tier catalog as teams. Tags the purchase with group_id so the
// webhook can call activate_group_subscription for the right group.
export async function purchaseGroupTier(
  pkg: PurchasesPackage,
  groupId: string,
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  try {
    await Purchases.setAttributes({
      purchasing_group_id: groupId,
      last_group_purchase_at: new Date().toISOString(),
    });

    const { productIdentifier } = await Purchases.purchasePackage(pkg);
    return { success: true, transactionId: productIdentifier };
  } catch (e: any) {
    if (e.userCancelled) return { success: false, error: 'cancelled' };
    return { success: false, error: e.message ?? 'Purchase failed' };
  }
}
