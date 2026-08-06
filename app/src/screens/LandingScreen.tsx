import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Linking, Share } from 'react-native';
import { showAlert } from '../components/CustomAlert';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../store';
import { restoreStreak, setCookieChoice } from '../store/appSlice';
import { resolveChallenge } from '../data/challenges';
import { todayLocal, daysAgoLocal } from '../utils/dates';
import {
  loadTodayCompletion,
  loadMyStreak,
  getStreakFreezeStatus,
  useStreakFreeze as useStreakFreezeRpc,
  type StreakFreezeStatus,
} from '../utils/supabase';
import { SunIcon, SunflowerIcon, FireIcon } from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function LandingScreen({ navigation }: Props) {
  const { styles } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const { streak, lastChallengeDate, todayChallenge, isPro } = useSelector((s: RootState) => s.app);
  const cookieChoice = useSelector((s: RootState) => s.app.cookieChoice);

  // Privacy banner moved off the first onboarding screen per design
  // feedback (2026-05-20): the banner used to live on the first
  // onboarding step but its yellow Accept button competed with the
  // primary CTA. It now surfaces on Landing the first time a returning
  // user lands here without a recorded choice, and its Accept button is
  // styled in the green "lift" palette so it never competes with the
  // gold "Give Today's Compliment" button below.
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(!cookieChoice);
  const bannerTranslateY = useSharedValue(120);
  const bannerOpacity = useSharedValue(0);
  useEffect(() => {
    if (showPrivacyBanner) {
      bannerTranslateY.value = withDelay(
        500,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }),
      );
      bannerOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
    }
  }, [showPrivacyBanner]);
  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bannerTranslateY.value }],
    opacity: bannerOpacity.value,
  }));
  const acceptPrivacy = () => {
    dispatch(setCookieChoice('accepted'));
    setShowPrivacyBanner(false);
  };
  const rejectPrivacy = () => {
    dispatch(setCookieChoice('rejected'));
    setShowPrivacyBanner(false);
  };
  const challenge = resolveChallenge(todayChallenge);
  const today = todayLocal();
  const bloomedToday = lastChallengeDate === today;

  // Today's compliment row from `compliments`. Drives the "SEND IT TO X"
  // card below: when the user lifted someone who isn't on OneCompliment
  // yet, recipientId is null and we surface a share card so the sender
  // can text them the link themselves. Mirrors the card that used to
  // live on the Done screen — per client feedback (2026-05-14) the Send
  // card belongs on Home, not buried in a separate celebration page.
  const [todayCompletion, setTodayCompletion] = useState<{
    id: string;
    body: string;
    recipientName: string;
    recipientId: string | null;
  } | null>(null);

  // Server-backed streak-freeze state (streak_freezes table). Null until
  // the focus-sync below fetches it, or when the RPC is unavailable —
  // the freeze button stays hidden in that case so we never promise a
  // freeze we can't persist.
  const [freezeStatus, setFreezeStatus] = useState<StreakFreezeStatus | null>(null);

  // Cross-platform sync: ALWAYS fetch today's completion + streak on
  // focus and write the result into Redux. Without this, a user who
  // submits on web and then opens mobile sees stale Redux state
  // (lastChallengeDate = yesterday/null), Brief/Write let them try to
  // submit a second time, and only the server-side trigger stops the
  // dupe. Pulling the truth from the server on every focus keeps
  // Brief's bloomed-today guard, Recap's "Sent" count, and the
  // bloomed/not-bloomed UI on Landing itself all correct.
  //
  // We intentionally do NOT auto-navigate to Done when bloomedToday is
  // true. The Done page is a transient celebration shown right after a
  // submit (via BloomScreen → Done); the Home tab should always land on
  // Landing — the "where to send" entry point — so the user can browse
  // their streak, jump to Recap/Groups/etc, or admire today's
  // bloomed-state card without being yanked into a full-screen share
  // sheet on every Home tap.
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [today_row, streakRow, freeze] = await Promise.all([
            loadTodayCompletion().catch(() => null),
            loadMyStreak().catch(() => null),
            getStreakFreezeStatus().catch(() => null),
          ]);
          if (cancelled) return;
          setFreezeStatus(freeze);

          // Sync Redux to server. `today_row` (compliments table) is the
          // authoritative "already bloomed" signal — user_streaks may
          // lag (or be missing for users whose row never got created),
          // so trusting only its `last_completed_on` field can leave
          // Landing showing the Play button even when the server has
          // today's compliment. That mismatch produced an infinite
          // Landing → Brief → bounce loop on the previous version.
          if (today_row) {
            const today = todayLocal();
            dispatch(restoreStreak({
              streak: streakRow?.current_streak ?? 0,
              lastChallengeDate: today,
            }));
          } else if (streakRow) {
            dispatch(restoreStreak({
              streak: streakRow.current_streak ?? 0,
              lastChallengeDate: streakRow.last_completed_on ?? null,
            }));
          }
          // Stash today's row for the SEND IT TO X / SHARE YOUR BLOOM
          // cards. Recipient_id null → unregistered → show send card.
          setTodayCompletion(today_row);
        } catch (err) {
          // Network/RLS/schema-drift — never let it bubble up and tank
          // the whole Landing screen (the offline UX is "Landing still
          // renders, just with stale Redux state").
          console.warn('[Landing focus sync] failed:', err);
        }
      })();
      return () => { cancelled = true; };
    }, [dispatch]),
  );

  // Streak at risk: missed yesterday, haven't bloomed today, streak > 0
  const yesterdayStr = daysAgoLocal(1);
  const streakAtRisk = !bloomedToday && streak > 0 && lastChallengeDate !== null && lastChallengeDate < yesterdayStr;

  // A freeze covers exactly one calendar day, and the weekly limit means
  // gap days can never be covered by two freezes — so a broken streak is
  // rescuable only when precisely one day (yesterday) was missed. The
  // freeze is recorded against that missed day; the user still has to
  // bloom today for the bridge to hold.
  const freezeCanRescue = streakAtRisk && lastChallengeDate === daysAgoLocal(2);
  // The missed day is already frozen (e.g. froze, then reopened the app):
  // reassure instead of re-offering.
  const gapAlreadyFrozen = freezeCanRescue && freezeStatus?.last_used === yesterdayStr;
  const showFreezeButton = !isPro
    ? true // upsell — Pro pitch routes to the paywall
    : freezeCanRescue && !gapAlreadyFrozen && freezeStatus?.available === true;

  // ── Effective streak ────────────────────────────────────────────
  // The stored `streak` is only recomputed server-side when the user
  // completes a prompt, so on a missed day it stays frozen at its old
  // value — the bug behind "the warning says I'll lose my streak but the
  // number never drops." Derive the honest number here, mirroring the
  // server's effective_current_streak (streak_gap_bridged): a full day
  // missed and not covered by a freeze means the streak is gone.
  // gapAlreadyFrozen ⇒ the single missed day is frozen ⇒ it survives.
  const streakBroken = streakAtRisk && !gapAlreadyFrozen;
  // Keep showing the real number while the streak is still rescuable —
  // exactly one day missed and a freeze can still save it (Pro), or the
  // Pro upsell. If freeze status hasn't loaded we err toward rescuable so
  // we never flash a 0 we'd have to take back. Only once the streak is
  // genuinely unrecoverable does the pill drop to 0, finally matching the
  // "you'll lose your streak" warning.
  const streakRescuable =
    freezeCanRescue && (!isPro || freezeStatus === null || freezeStatus.available === true);
  const displayStreak = streakBroken && !streakRescuable ? 0 : streak;
  // The at-risk card only has something to say in the rescuable window
  // (or to reassure when the gap is already frozen). Outside it the streak
  // is simply gone — the pill shows 0 and the normal CTA stands alone.
  const showRiskCard = gapAlreadyFrozen || streakRescuable;

  const handleStreakFreeze = () => {
    if (!isPro) {
      navigation.navigate('Pro');
      return;
    }
    showAlert(
      'Use Streak Freeze?',
      `This freezes yesterday — the day you missed — and protects your ${streak}-day streak. Give today's compliment and the streak keeps going. You get 1 freeze per week.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Freeze My Streak',
          onPress: async () => {
            const result = await useStreakFreezeRpc(yesterdayStr);
            // Re-pull server truth either way — covers the race where a
            // freeze was consumed on another device in the meantime.
            getStreakFreezeStatus().then(setFreezeStatus).catch(() => {});
            if (result.ok) {
              showAlert(
                '❄️ Streak frozen',
                `Yesterday is covered. Give today's compliment to keep your ${streak}-day streak alive.`,
              );
            } else if (result.error === 'weekly_limit') {
              showAlert(
                'Freeze already used',
                `You get 1 freeze per week. Next one available ${result.nextAvailable ?? 'in a few days'}.`,
              );
            } else if (result.error === 'pro_required') {
              navigation.navigate('Pro');
            } else if (result.error === 'not_needed') {
              showAlert('No freeze needed', 'Your streak isn’t missing that day — you’re all set.');
            } else {
              showAlert('Could not freeze', 'Something went wrong — check your connection and try again.');
            }
          },
        },
      ]
    );
  };

  // Bob animation matching website: @keyframes bob{0%,100%{translateY(0)}50%{translateY(-6px)}}
  const bobY = useSharedValue(0);
  useEffect(() => {
    bobY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
  }));

  const dateDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.root}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Nav */}
      <View style={styles.nav}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoTop}>One</Text>
          <View style={styles.logoBotRow}>
            <Text style={styles.logoBot}>C</Text>
            <SunflowerIcon size={14} />
            <Text style={styles.logoBot}>mpliment</Text>
          </View>
        </View>
        <Text style={styles.date}>{dateDisplay}</Text>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Animated.View style={bobStyle}>
          {bloomedToday ? <SunflowerIcon size={80} /> : <SunIcon size={80} />}
        </Animated.View>
        <Text style={styles.heroTitle}>
          {bloomedToday ? 'You bloomed today.' : 'One compliment.\nEvery day.'}
        </Text>
        <Text style={styles.heroSub}>
          {bloomedToday
            ? 'Come back tomorrow for a new topic.'
            : 'A daily topic that makes the people around you feel seen.'}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>1</Text>
          <Text style={styles.statLabel}>topic/day</Text>
        </View>
        <View style={styles.statPill}>
          <View style={styles.bloomFlow}>
            <SunIcon size={20} />
            <Text style={styles.arrow}>→</Text>
            <SunflowerIcon size={20} />
          </View>
          <Text style={styles.statLabel}>your daily bloom</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{displayStreak}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
      </View>

      {/* Streak at risk warning — only while the streak is still rescuable
          (one day missed + a freeze can save it) or already frozen. Once
          it's genuinely lost the pill above shows 0 and no card appears. */}
      {showRiskCard && (
        <View style={styles.streakRiskCard}>
          <View style={styles.streakRiskRow}>
            <FireIcon size={24} />
            <View style={{ flex: 1 }}>
              <Text style={styles.streakRiskTitle}>
                Your {streak}-day streak is at risk!
              </Text>
              <Text style={styles.streakRiskSub}>
                {!isPro
                  ? 'Pro members get 1 streak freeze per week.'
                  : gapAlreadyFrozen
                  ? '❄️ Yesterday is frozen. Give today\'s compliment and your streak keeps going.'
                  : freezeStatus === null
                  ? 'Give today\'s compliment to keep your streak alive.'
                  : 'Use your weekly streak freeze or give today\'s compliment.'}
              </Text>
            </View>
          </View>
          {showFreezeButton && (
            <Pressable style={styles.freezeBtn} onPress={handleStreakFreeze}>
              <Text style={styles.freezeBtnText}>
                {isPro ? '❄️ Use Streak Freeze' : '❄️ Get Pro — Protect Your Streak'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Today's Topic — label + hint copy updated per design feedback
          (the "Tap below to see the full rule…" line was filler and the
          word "challenge" felt heavier than the experience warrants). */}
      <View style={styles.goldCard}>
        <Text style={styles.label}>{bloomedToday ? 'COMPLETED' : "TODAY'S TOPIC"}</Text>
        <Text style={styles.challengePrompt}>{challenge.prompt}</Text>
      </View>

      {/* CTA */}
      {bloomedToday ? (
        <View style={styles.doneCard}>
          <SunflowerIcon size={32} />
          <View style={{ flex: 1 }}>
            <Text style={styles.doneTitle}>You lifted someone today.</Text>
            <Text style={styles.doneSub}>Come back tomorrow for a new topic.</Text>
          </View>
        </View>
      ) : (
        <Pressable style={styles.btn} onPress={() => navigation.navigate('Brief')}>
          <View style={styles.btnRow}>
            <Text style={styles.btnText}>Give Today's Compliment</Text>
            <SunIcon size={20} color="#0C0C0C" />
          </View>
        </Pressable>
      )}

      {/* SEND IT TO X — post-submit share card. Shown for every
          recipient (registered or not) so the sender always has a
          single, consistent share surface on Home after they bloom. */}
      {bloomedToday
        && todayCompletion
        && todayCompletion.id
        && (() => {
          const recipient = todayCompletion.recipientName || 'them';
          const isRegistered = !!todayCompletion.recipientId;
          const publicUrl = `https://onecompliment.app/c/${todayCompletion.id}`;
          // Share message intentionally does NOT include the compliment
          // body — per design feedback, the curiosity hook ("someone
          // wrote you a compliment, tap to see what they said") is the
          // primary driver of sign-ups. Putting the text in the
          // message itself removes that incentive entirely.
          const liftMessage =
            `${recipient}, you've been lifted on OneCompliment 🌻\n\n` +
            `Tap to see what was said — and send one back:\n${publicUrl}`;
          const sendLift = async () => {
            try {
              await Share.share({ message: liftMessage });
            } catch {
              /* dismissed */
            }
          };
          return (
            <View style={styles.liftCard}>
              <Text style={styles.liftLabel}>
                SEND IT TO {recipient.toUpperCase()}
              </Text>
              <Text style={styles.liftTitle}>
                {isRegistered
                  ? `Let ${recipient} see it now.`
                  : `${recipient} isn't on OneCompliment yet — that's OK.`}
              </Text>
              <Text style={styles.liftSub}>
                {isRegistered
                  ? `They'll see it in their app, but you can send the card directly so it lands sooner.`
                  : `Send them this card yourself. When they tap the link they'll see who lifted them and what you said.`}
              </Text>
              <View style={styles.liftPreview}>
                <Text style={styles.liftPreviewText}>{liftMessage}</Text>
              </View>
              <Pressable style={styles.liftBtn} onPress={sendLift}>
                <Text style={styles.btnText}>🌻 Send to {recipient}</Text>
              </Pressable>
            </View>
          );
        })()}

      {/* Footer note + Privacy/Terms links removed per design feedback
          — they were filler below the CTA. The legal links now live in
          Settings and on the Pro paywall, which satisfies the Apple
          subscription disclosure requirement (Guideline 3.1.2(c)). */}
    </ScrollView>

    {/* Privacy banner — floats over Landing on first run only, then
        the user's choice is remembered in Redux/AsyncStorage. The
        Accept CTA uses the green "lift" palette intentionally so it
        does not compete with the gold "Give Today's Compliment"
        button on the page itself. */}
    {showPrivacyBanner && (
      <View style={styles.bannerOverlay} pointerEvents="box-none">
        <Animated.View style={[styles.banner, bannerStyle]}>
          <Text style={styles.bannerTitle}>Your privacy</Text>
          <Text style={styles.bannerCopy}>
            OneCompliment collects only the anonymous, in-app usage data
            we need to improve the app. We do not use tracking cookies,
            advertising identifiers, or third-party data brokers. See our{' '}
            <Text
              style={styles.bannerLink}
              onPress={() => Linking.openURL('https://onecompliment.app/privacy')}
            >
              Privacy Policy
            </Text>
            .
          </Text>
          <View style={styles.bannerActions}>
            <Pressable style={styles.rejectBtn} onPress={rejectPrivacy}>
              <Text style={styles.rejectBtnText}>Not now</Text>
            </Pressable>
            <Pressable style={styles.acceptBtn} onPress={acceptPrivacy}>
              <Text style={styles.acceptBtnText}>Got it</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    )}
    </View>
  );
}

const stylesheet = createStyleSheet(theme => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 24,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoWrap: {},
  logoTop: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 0.4,
  },
  logoBotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBot: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  date: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: theme.colors.faint,
  },
  hero: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  bloomFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrow: {
    fontSize: 14,
    color: theme.colors.gold,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 35,
    color: theme.colors.text,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 16,
    color: theme.colors.dim,
    lineHeight: 27,
    textAlign: 'center',
    maxWidth: 340,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.md,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.faint,
    marginTop: 5,
  },
  goldCard: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: theme.radius.lg,
    padding: 18,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '600',
  },
  challengePrompt: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 26,
    marginTop: 8,
  },
  btn: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: theme.radius.md,
    padding: 16,
  },
  doneTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  doneSub: {
    fontSize: 12,
    color: theme.colors.faint,
    marginTop: 3,
  },
  // (footerNote / legalLinks / privacyLink / privacyDot removed when
  // the legal footer moved off Home → Settings per design feedback.)
  streakRiskCard: {
    backgroundColor: 'rgba(255,107,107,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.18)',
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 12,
  },
  streakRiskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakRiskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  streakRiskSub: {
    fontSize: 12,
    color: theme.colors.faint,
    marginTop: 2,
    lineHeight: 18,
  },
  freezeBtn: {
    backgroundColor: 'rgba(78,205,196,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  freezeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ECDC4',
  },

  // ── Send-to-X (unregistered recipient) share card ──
  // Ported from DoneScreen.styles.lift* so the visual is identical to
  // what the client circled in their feedback. Green palette stays
  // distinct from the gold "today's challenge" card above.
  liftCard: {
    width: '100%',
    backgroundColor: 'rgba(168,230,207,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(168,230,207,0.30)',
    borderRadius: theme.radius.md,
    padding: 18,
    gap: 10,
  },
  liftLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#A8E6CF',
    fontWeight: '600',
    textAlign: 'center',
  },
  liftTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  liftSub: {
    fontSize: 13,
    color: theme.colors.dim,
    lineHeight: 20,
    textAlign: 'center',
  },
  liftPreview: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.sm,
    padding: 14,
    marginTop: 4,
  },
  liftPreviewText: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.dim,
    lineHeight: 20,
  },
  liftBtn: {
    backgroundColor: '#A8E6CF',
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },

  // ── Privacy banner (moved off the first onboarding screen) ──
  bannerOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  banner: {
    backgroundColor: 'rgba(12,12,12,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  bannerCopy: {
    fontSize: 12,
    lineHeight: 19,
    color: theme.colors.dim,
  },
  bannerLink: {
    color: theme.colors.gold,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: theme.colors.dim,
    fontSize: 13,
  },
  // Accept uses the green "lift" palette so the banner CTA never
  // competes with the gold "Give Today's Compliment" button.
  acceptBtn: {
    flex: 1,
    backgroundColor: 'rgba(168,230,207,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168,230,207,0.45)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#A8E6CF',
    fontSize: 13,
    fontWeight: '700',
  },

}));
