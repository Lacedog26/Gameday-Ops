import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Linking, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { showAlert } from '../components/CustomAlert';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setPro } from '../store/appSlice';
import { getOfferings, purchasePackage, restorePurchases } from '../utils/revenuecat';
import { FireIcon, GroupsIcon, RecapIcon, SunflowerIcon, SparkleIcon } from '../components/icons';
import type { PurchasesPackage } from 'react-native-purchases';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const PRO_FEATURES = [
  { iconKey: 'fire', name: 'Streak Freeze', tag: '1 per week', desc: "Life happens. One day a week you can freeze your streak so it doesn't reset." },
  { iconKey: 'groups', name: 'Unlimited Groups', tag: 'vs 8 free', desc: 'Free accounts can join up to 8 groups. Pro lets you join unlimited groups.' },
  { iconKey: 'recap', name: 'Compliment History', tag: '365 days', desc: "Every compliment you've ever written, saved. A full year of kindness." },
];

function FeatureIcon({ iconKey }: { iconKey: string }) {
  switch (iconKey) {
    case 'fire': return <FireIcon size={18} />;
    case 'groups': return <GroupsIcon size={18} />;
    case 'recap': return <RecapIcon size={18} />;
    default: return <SunflowerIcon size={18} />;
  }
}

export default function ProScreen({ navigation }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const isPro = useSelector((s: RootState) => s.app.isPro);

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [selected, setSelected] = useState<'monthly' | 'annual'>('annual');
  // True when getOfferings returned empty/threw — surfaces a retry banner
  // instead of leaving the Subscribe button as a dead tap target. See the
  // tester feedback (2026-05-16) where the button "didn't work" because
  // packages were null and `handlePurchase` silently returned.
  const [offeringsFailed, setOfferingsFailed] = useState(false);
  // The raw reason string from getOfferings — shown in the error banner
  // so the user (developer) can read the diagnostic on-device without
  // needing Xcode/console access. Strings come from revenuecat.ts and
  // already map cleanly to the actionable fix (RC dashboard / App Store).
  const [failureReason, setFailureReason] = useState<string | null>(null);

  const loadOfferings = useCallback(async () => {
    setLoading(true);
    setOfferingsFailed(false);
    setFailureReason(null);
    try {
      const offerings = await getOfferings();
      setMonthly(offerings.monthly);
      setAnnual(offerings.annual);
      if (!offerings.monthly && !offerings.annual) {
        setOfferingsFailed(true);
        setFailureReason(offerings.reason);
      }
    } catch (e: any) {
      setOfferingsFailed(true);
      setFailureReason(`threw: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-retry on every focus. TestFlight's StoreKit ↔ RC handshake is
  // sometimes still warming up the first time the user reaches Pro;
  // re-entering the screen (or backgrounding/foregrounding the app) is
  // the easiest way for a tester to recover without an explicit tap on
  // the retry banner. Cheap call — RC caches offerings client-side.
  useFocusEffect(
    useCallback(() => {
      loadOfferings();
    }, [loadOfferings]),
  );

  // If already Pro, show success state
  if (isPro) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <View style={styles.successWrap}>
            <SunflowerIcon size={64} />
            <Text style={styles.successTitle}>You're Pro!</Text>
            <Text style={styles.successSub}>
              Thank you for supporting OneCompliment. All Pro features are unlocked.
            </Text>
            <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
              <Text style={styles.btnText}>Back to app</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  const selectedPkg = selected === 'annual' ? annual : monthly;

  const handlePurchase = async () => {
    if (!selectedPkg) {
      // Visible failure beats silent failure — without this alert, tapping
      // Subscribe before offerings load (or when RC dashboard is misconfigured)
      // looked like a dead button to testers.
      showAlert(
        'Subscriptions unavailable',
        "We couldn't load subscription options. Check your connection and try again, or come back in a moment."
      );
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchasePackage(selectedPkg);
      if (result.success) {
        dispatch(setPro(true));
      } else if (result.error === 'cancelled') {
        // user dismissed the StoreKit sheet — no message needed
      } else if (result.error) {
        showAlert('Purchase failed', result.error);
      } else {
        // No error, but RevenueCat didn't surface the entitlement either.
        // Possible causes: the user is already subscribed at the App Store
        // level (no new transaction generated), the store is still
        // propagating the receipt, or the receipt is attached to a
        // different RC app-user-id. Rather than *assume* "already
        // subscribed" and bounce the user to a manual Restore that may
        // then contradict us with "No subscription found", attempt the
        // restore silently and report a single, coherent outcome.
        const restore = await restorePurchases();
        if (restore.isPro) {
          dispatch(setPro(true));
        } else {
          showAlert(
            'Purchase not completed',
            "We couldn't confirm a Pro subscription on this account. If you were charged, your subscription may still be processing — try again in a moment. If you subscribed on another device, tap Restore Purchases.",
            [
              { text: 'OK', style: 'cancel' },
              { text: 'Restore Purchases', onPress: handleRestore },
            ],
          );
        }
      }
    } catch {
      showAlert('Purchase failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const result = await restorePurchases();
      if (result.isPro) {
        dispatch(setPro(true));
        showAlert('Restored!', 'Your Pro subscription has been restored.');
      } else {
        showAlert('No subscription found', "We couldn't find an active Pro subscription for this account.");
      }
    } catch {
      showAlert('Something went wrong', 'Could not check your subscription right now. Try again in a moment.');
    } finally {
      setPurchasing(false);
    }
  };

  // No fallback prices — showing "$3.99" / "$29.99" when offerings are null
  // implied the button was functional and was the original "Subscribe doesn't
  // work" tester complaint. An em dash makes the unavailable state explicit.
  const monthlyPrice = monthly?.product.priceString ?? '—';
  const annualPrice = annual?.product.priceString ?? '—';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.proBadge}>
            <View style={styles.proBadgeRow}>
              <SparkleIcon size={12} color={theme.colors.gold} />
              <Text style={styles.proBadgeText}> OneCompliment Pro</Text>
            </View>
          </View>
          <Text style={styles.title}>Take your streak{'\n'}to the next level</Text>
        </View>

        {/* Features */}
        {PRO_FEATURES.map((f, i) => (
          <View key={i} style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <FeatureIcon iconKey={f.iconKey} />
              <Text style={styles.featureName}>{f.name}</Text>
              <View style={styles.featureTag}>
                <Text style={styles.featureTagText}>{f.tag}</Text>
              </View>
            </View>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
        ))}

        {/* Plan selection */}
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.gold} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.plans}>
            {/* Annual */}
            <Pressable
              style={[styles.planCard, selected === 'annual' && styles.planCardSelected]}
              onPress={() => setSelected('annual')}
            >
              <View style={styles.planRow}>
                <View style={[styles.radio, selected === 'annual' && styles.radioSelected]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>Annual</Text>
                  <Text style={styles.planPrice}>{annualPrice}/year</Text>
                </View>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>Save 37%</Text>
                </View>
              </View>
            </Pressable>

            {/* Monthly */}
            <Pressable
              style={[styles.planCard, selected === 'monthly' && styles.planCardSelected]}
              onPress={() => setSelected('monthly')}
            >
              <View style={styles.planRow}>
                <View style={[styles.radio, selected === 'monthly' && styles.radioSelected]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>Monthly</Text>
                  <Text style={styles.planPrice}>{monthlyPrice}/month</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* Offerings-failed banner — visible state when RevenueCat returns
            no packages (dashboard misconfig, network failure, store not
            ready). Gives the tester a retry path instead of a dead button.
            Also surfaces the diagnostic reason so the developer can read
            it on-device — no Xcode console needed to figure out which of
            "RC dashboard / App Store Connect / API key" to fix. */}
        {offeringsFailed && !loading && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>Subscriptions unavailable</Text>
            <Text style={styles.errorBannerText}>
              We couldn't load subscription options. Check your connection and try again.
            </Text>
            {failureReason && (
              <Text style={styles.errorBannerDebug} selectable>
                Reason: {failureReason}
              </Text>
            )}
            <Pressable style={styles.retryBtn} onPress={loadOfferings}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Purchase button */}
        <Pressable
          style={[styles.btn, (purchasing || loading || !selectedPkg) && styles.btnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || loading || !selectedPkg}
        >
          <Text style={styles.btnText}>
            {purchasing
              ? 'Processing...'
              : loading
              ? 'Loading...'
              : !selectedPkg
              ? 'Subscriptions unavailable'
              : `Subscribe — ${selected === 'annual' ? annualPrice + '/year' : monthlyPrice + '/month'}`}
          </Text>
        </Pressable>

        <Text style={styles.legalNote}>
          Subscription auto-renews at the price above until cancelled at least 24 hours before
          the end of the current period.
          {Platform.OS === 'ios'
            ? ' Manage or cancel anytime in your App Store account.'
            : Platform.OS === 'android'
            ? ' Manage or cancel anytime in your Google Play account.'
            : ' Manage or cancel anytime in your store account.'}
        </Text>

        {/* Legal links — required by App Store Review Guideline 3.1.2(c) */}
        <View style={styles.legalLinks}>
          <Pressable
            onPress={() => Linking.openURL('https://onecompliment.app/privacy')}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable
            onPress={() =>
              Linking.openURL(
                'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
              )
            }
            hitSlop={8}
          >
            <Text style={styles.legalLink}>Terms of Use</Text>
          </Pressable>
        </View>

        {/* Restore */}
        <Pressable onPress={handleRestore} disabled={purchasing}>
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const stylesheet = createStyleSheet(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 16,
  },
  back: {
    color: theme.colors.faint,
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  proBadge: {
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.30)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  proBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proBadgeText: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 32,
  },
  featureCard: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  featureTag: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  featureTagText: {
    fontSize: 10,
    color: theme.colors.gold,
  },
  featureDesc: {
    fontSize: 13,
    color: theme.colors.dim,
    lineHeight: 21,
  },
  plans: {
    gap: 10,
    marginTop: 4,
  },
  planCard: {
    borderWidth: 1.5,
    borderColor: theme.colors.bord,
    borderRadius: 14,
    padding: 16,
  },
  planCardSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: 'rgba(245,200,66,0.06)',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.bord,
  },
  radioSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.gold,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  planPrice: {
    fontSize: 13,
    color: theme.colors.dim,
    marginTop: 2,
  },
  saveBadge: {
    backgroundColor: 'rgba(168,230,207,0.15)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  saveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A8E6CF',
  },
  btn: {
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
  legalNote: {
    fontSize: 11,
    color: theme.colors.faint,
    textAlign: 'center',
    lineHeight: 17,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,80,80,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.25)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    alignItems: 'center',
  },
  errorBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,160,160,0.95)',
  },
  errorBannerText: {
    fontSize: 13,
    color: theme.colors.dim,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorBannerDebug: {
    fontSize: 11,
    fontFamily: theme.fonts.mono,
    color: theme.colors.faint,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  retryBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,160,160,0.40)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,180,180,0.95)',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  legalLink: {
    fontSize: 12,
    color: theme.colors.dim,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 12,
    color: theme.colors.faint,
  },
  restoreText: {
    fontSize: 13,
    color: theme.colors.dim,
    textAlign: 'center',
  },
  successWrap: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  successSub: {
    fontSize: 15,
    color: theme.colors.dim,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
}));
