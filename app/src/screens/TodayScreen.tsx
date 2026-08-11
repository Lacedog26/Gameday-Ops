// ── Today — the daily kindness dashboard ─────────────────────────
//
// The evolution of LandingScreen (One compliment. Every day.) into the
// heart of the "small acts of kindness" product:
//
//   OPEN → GET INSPIRED → DO SOMETHING KIND → LOG IT → SEE YOUR IMPACT
//
// Everything that made Landing work is preserved: the privacy banner,
// the streak + freeze system, the server focus-sync, and the post-
// compliment SEND IT TO X share card. What changed is the center of
// gravity: the primary question is now "What kindness will you do
// today?" — and a compliment is one (great) answer, not the only one.

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Linking, Share } from 'react-native';
import { showAlert } from '../components/CustomAlert';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState, store } from '../store';
import { restoreStreak, setCookieChoice } from '../store/appSlice';
import { resolveChallenge } from '../data/challenges';
import { getDailyKindness, getCompletionLine } from '../data/kindness';
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

export default function TodayScreen({ navigation }: Props) {
  const { styles } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const { streak, lastChallengeDate, todayChallenge, isPro } = useSelector((s: RootState) => s.app);
  const kindnessHistory = useSelector((s: RootState) => s.app.kindnessHistory);
  const complimentHistory = useSelector((s: RootState) => s.app.complimentHistory);
  const cookieChoice = useSelector((s: RootState) => s.app.cookieChoice);

  // ── Privacy banner (ported from Landing, unchanged behavior) ──
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

  const today = todayLocal();
  const challenge = resolveChallenge(todayChallenge);
  const dailyAct = getDailyKindness(today);
  const complimentDay = !!dailyAct.isCompliment;

  // "Done today" has TWO signals now:
  //   - lastChallengeDate === today → a compliment was sent (server-truth)
  //     or a kindness act advanced the streak.
  //   - a kindness journal entry dated today → covers the window where a
  //     server focus-sync (compliments-only until the migration is run)
  //     rolls lastChallengeDate back while a local act exists.
  const kindnessToday = kindnessHistory.filter(k => k.date === today);
  // Compliment-specific signal (NOT lastChallengeDate, which now flips for
  // any kindness act) — gates the share card and "give a compliment too."
  const complimentedToday = complimentHistory.some(c => c.date === today);
  const doneToday = lastChallengeDate === today || complimentedToday || kindnessToday.length > 0;
  const actsToday =
    kindnessToday.length + complimentHistory.filter(c => c.date === today).length;

  // Total impact — the number that matters most.
  const totalActs = kindnessHistory.length + complimentHistory.length;
  const activeDays = new Set([
    ...kindnessHistory.map(k => k.date),
    ...complimentHistory.map(c => c.date),
  ]).size;

  // Today's compliment row (drives the SEND IT TO X share card).
  const [todayCompletion, setTodayCompletion] = useState<{
    id: string;
    body: string;
    recipientName: string;
    recipientId: string | null;
  } | null>(null);

  const [freezeStatus, setFreezeStatus] = useState<StreakFreezeStatus | null>(null);

  // ── Server focus-sync (ported from Landing) ──
  // One added guard: never let a compliments-only server snapshot REGRESS
  // a streak the user just advanced with a kindness act. Until the
  // kindness migration runs server-side, user_streaks doesn't know about
  // kindness acts — so if a local act already logged today, we keep the
  // local streak when the server's number is behind.
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          // Compute the day INSIDE the closure — an app left open across
          // local midnight refocuses with a fresh date, not the render-time
          // one (which would mislabel yesterday's act as today's).
          const today = todayLocal();
          const [today_row, streakRow, freeze] = await Promise.all([
            loadTodayCompletion().catch(() => null),
            loadMyStreak().catch(() => null),
            getStreakFreezeStatus().catch(() => null),
          ]);
          if (cancelled) return;
          setFreezeStatus(freeze);

          // Read CURRENT state from the store (not the render closure) —
          // this callback deliberately has a stable identity, so closed-over
          // values could be stale by the time the fetches resolve.
          const current = store.getState().app;
          const localStreak = current.streak;
          const kindnessLoggedToday = current.kindnessHistory.some(k => k.date === today);

          if (today_row) {
            const serverStreak = streakRow?.current_streak ?? 0;
            dispatch(restoreStreak({
              streak: kindnessLoggedToday ? Math.max(serverStreak, localStreak) : serverStreak,
              lastChallengeDate: today,
            }));
          } else if (streakRow) {
            const serverStreak = streakRow.current_streak ?? 0;
            if (kindnessLoggedToday) {
              // Local kindness already counted today. Only adopt the server
              // number when the server has ACTUALLY seen today's act
              // (last_completed_on === today — i.e. the kindness migration
              // is live and the RPC landed). A merely-bigger stale number
              // is NOT fresher: user_streaks never decays on missed days,
              // so an old broken streak can be numerically ahead of the
              // honest local reset. And never roll lastChallengeDate back
              // before today while a today-dated act exists.
              if (serverStreak > localStreak && streakRow.last_completed_on === today) {
                dispatch(restoreStreak({
                  streak: serverStreak,
                  lastChallengeDate: today,
                }));
              }
            } else {
              dispatch(restoreStreak({
                streak: serverStreak,
                lastChallengeDate: streakRow.last_completed_on ?? null,
              }));
            }
          }
          setTodayCompletion(today_row);
        } catch (err) {
          console.warn('[Today focus sync] failed:', err);
        }
      })();
      return () => { cancelled = true; };
    }, [dispatch, today]),
  );

  // ── Streak-at-risk / freeze logic (ported verbatim from Landing) ──
  const yesterdayStr = daysAgoLocal(1);
  const streakAtRisk = !doneToday && streak > 0 && lastChallengeDate !== null && lastChallengeDate < yesterdayStr;
  const freezeCanRescue = streakAtRisk && lastChallengeDate === daysAgoLocal(2);
  const gapAlreadyFrozen = freezeCanRescue && freezeStatus?.last_used === yesterdayStr;
  const showFreezeButton = !isPro
    ? true
    : freezeCanRescue && !gapAlreadyFrozen && freezeStatus?.available === true;
  const streakBroken = streakAtRisk && !gapAlreadyFrozen;
  const streakRescuable =
    freezeCanRescue && (!isPro || freezeStatus === null || freezeStatus.available === true);
  const displayStreak = streakBroken && !streakRescuable ? 0 : streak;
  const showRiskCard = gapAlreadyFrozen || streakRescuable;

  const handleStreakFreeze = () => {
    if (!isPro) {
      navigation.navigate('Pro');
      return;
    }
    showAlert(
      'Use Streak Freeze?',
      `This freezes yesterday — the day you missed — and protects your ${streak}-day streak. Do one kindness today and the streak keeps going. You get 1 freeze per week.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Freeze My Streak',
          onPress: async () => {
            const result = await useStreakFreezeRpc(yesterdayStr);
            getStreakFreezeStatus().then(setFreezeStatus).catch(() => {});
            if (result.ok) {
              showAlert(
                '❄️ Streak frozen',
                `Yesterday is covered. Do one act of kindness today to keep your ${streak}-day streak alive.`,
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

  // Bob animation (unchanged brand moment).
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

  const completion = getCompletionLine(today);
  const effortHint =
    dailyAct.minutes <= 2 ? 'takes a minute' : `~${dailyAct.minutes} min`;

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
          {doneToday ? <SunflowerIcon size={80} /> : <SunIcon size={80} />}
        </Animated.View>
        <Text style={styles.heroTitle}>
          {doneToday ? completion.title : 'Make someone’s day.'}
        </Text>
        <Text style={styles.heroSub}>
          {doneToday
            ? completion.sub
            : 'One small act of kindness is all it takes.'}
        </Text>
      </View>

      {/* Stats — impact first, streak quiet. Hidden until there's at least
          one act: a brand-new user should meet an invitation, not a row of
          zeros. */}
      {(totalActs > 0 || displayStreak > 0) && (
      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{totalActs}</Text>
          <Text style={styles.statLabel}>{totalActs === 1 ? 'act of kindness' : 'acts of kindness'}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{activeDays}</Text>
          <Text style={styles.statLabel}>{activeDays === 1 ? 'day active' : 'days active'}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{displayStreak}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
      </View>
      )}

      {/* Streak at risk — rescuable window only (ported from Landing). */}
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
                  ? '❄️ Yesterday is frozen. Do one kindness today and your streak keeps going.'
                  : freezeStatus === null
                  ? 'Do one act of kindness today to keep your streak alive.'
                  : 'Use your weekly streak freeze or do one kindness today.'}
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

      {/* ── Today's Kindness ── */}
      {!doneToday && (
        <>
          <View style={styles.goldCard}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.label}>{'🌻 TODAY’S KINDNESS'}</Text>
              <Text style={styles.effortHint}>{effortHint}</Text>
            </View>
            <Text style={styles.challengePrompt}>{dailyAct.title}</Text>
            <Text style={styles.actDescription}>
              {complimentDay
                ? `Today’s topic: ${challenge.prompt}`
                : dailyAct.description}
            </Text>
          </View>

          {complimentDay ? (
            <Pressable style={styles.btn} onPress={() => navigation.navigate('Brief')}>
              <View style={styles.btnRow}>
                <Text style={styles.btnText}>Give Today’s Compliment</Text>
                <SunIcon size={20} color="#0C0C0C" />
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={styles.btn}
              onPress={() => navigation.navigate('KindnessDone', { actionId: dailyAct.id, source: 'daily' })}
            >
              <View style={styles.btnRow}>
                <Text style={styles.btnText}>I did it</Text>
                <SunflowerIcon size={20} />
              </View>
            </Pressable>
          )}

          {/* Quiet alternatives — never compete with the primary CTA. */}
          <View style={styles.altRow}>
            <Pressable style={styles.altBtn} onPress={() => navigation.navigate('RandomAct')}>
              <Text style={styles.altBtnText}>🎲 Different idea</Text>
            </Pressable>
            <Pressable style={styles.altBtn} onPress={() => navigation.navigate('Explore')}>
              <Text style={styles.altBtnText}>🔎 Browse ideas</Text>
            </Pressable>
            {!complimentDay && (
              <Pressable style={styles.altBtn} onPress={() => navigation.navigate('Brief')}>
                <Text style={styles.altBtnText}>🌻 Compliment</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.altBtn}
              onPress={() => navigation.navigate('KindnessDone', { custom: true, source: 'custom' })}
            >
              <Text style={styles.altBtnText}>✍️ I did something else</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* ── Done state ── */}
      {doneToday && (
        <>
          <View style={styles.doneCard}>
            <SunflowerIcon size={32} />
            <View style={{ flex: 1 }}>
              <Text style={styles.doneTitle}>
                {actsToday <= 1 ? '1 act of kindness today' : `${actsToday} acts of kindness today`}
              </Text>
              <Text style={styles.doneSub}>Come back tomorrow for another.</Text>
            </View>
          </View>
          <View style={styles.altRow}>
            <Pressable style={styles.altBtn} onPress={() => navigation.navigate('RandomAct')}>
              <Text style={styles.altBtnText}>🎲 One more idea</Text>
            </Pressable>
            {!complimentedToday && (
              <Pressable style={styles.altBtn} onPress={() => navigation.navigate('Brief')}>
                <Text style={styles.altBtnText}>🌻 Give a compliment too</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.altBtn}
              onPress={() => navigation.navigate('KindnessDone', { custom: true, source: 'custom' })}
            >
              <Text style={styles.altBtnText}>✍️ Log another kindness</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* SEND IT TO X — post-compliment share card (ported from Landing). */}
      {complimentedToday
        && todayCompletion
        && todayCompletion.id
        && (() => {
          const recipient = todayCompletion.recipientName || 'them';
          const isRegistered = !!todayCompletion.recipientId;
          const publicUrl = `https://onecompliment.app/c/${todayCompletion.id}`;
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
    </ScrollView>

    {/* Privacy banner (ported from Landing). */}
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
    textAlign: 'center',
  },
  goldCard: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: theme.radius.lg,
    padding: 18,
    gap: 8,
  },
  cardLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '600',
  },
  effortHint: {
    fontSize: 10,
    color: theme.colors.faint,
    letterSpacing: 0.5,
  },
  challengePrompt: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 26,
  },
  actDescription: {
    fontSize: 14,
    color: theme.colors.dim,
    lineHeight: 22,
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
  altRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  altBtn: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  altBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.dim,
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
