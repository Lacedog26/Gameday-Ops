import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useSelector, useDispatch } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { RootState, store } from '../store';
import { restoreStreak } from '../store/appSlice';
import { resolveChallenge } from '../data/challenges';
import { todayLocal } from '../utils/dates';
import { loadMyStreak, loadTodayCompletion } from '../utils/supabase';
import { LightbulbIcon, SunIcon } from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function BriefScreen({ navigation }: Props) {
  const { styles } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const { todayChallenge, complimentHistory } = useSelector((s: RootState) => s.app);
  const challenge = resolveChallenge(todayChallenge);
  const isFocused = useIsFocused();

  // Guard: if a COMPLIMENT was already sent today, go back. Since the
  // kindness redesign, lastChallengeDate flips for ANY act of kindness —
  // so it can no longer gate the compliment flow, or a user who logged
  // "helped a neighbor" would be locked out of also sending a compliment
  // (the "give a compliment too" path on Today). complimentHistory is the
  // compliment-specific local signal; the server pre-flight below stays
  // the authoritative cross-device check. Gated on isFocused so a
  // returning-user email verify can't trigger goBack on a covered Brief
  // and pop the modal sheet from underneath the user.
  const complimentedToday = complimentHistory.some(c => c.date === todayLocal());
  useEffect(() => {
    if (isFocused && complimentedToday) {
      navigation.goBack();
    }
  }, [isFocused, complimentedToday]);

  // Server pre-flight: Redux can be stale across devices (user bloomed
  // on web, opens mobile — local lastChallengeDate is yesterday/null).
  // Hit the server on focus to confirm; if today's row exists in
  // `compliments`, that's the authoritative "already bloomed today"
  // signal — sync Redux AND bounce back. We deliberately don't trust
  // user_streaks.last_completed_on alone: if that column is stale or
  // null (which it can be for users whose streaks were merged from an
  // anon account or recovered from a different schema shape), the user
  // would end up in an infinite Landing → Brief → bounce loop, because
  // Landing renders Play (Redux still says "not bloomed"), the user
  // taps, Brief bounces, Landing still renders Play, etc.
  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;
    (async () => {
      const [todayRow, streakRow] = await Promise.all([
        loadTodayCompletion().catch(() => null),
        loadMyStreak().catch(() => null),
      ]);
      if (cancelled) return;
      if (todayRow) {
        // compliments row exists for today — authoritative. Force Redux
        // lastChallengeDate to today even if user_streaks lags. Kindness
        // guard: if a kindness act already advanced the LOCAL streak today
        // (server may not know about it pre-migration/offline), keep the
        // larger number rather than stomping it with the server's.
        const today = todayLocal();
        const s = store.getState().app;
        const kindToday = s.kindnessHistory.some(k => k.date === today);
        const serverStreak = streakRow?.current_streak ?? 0;
        dispatch(restoreStreak({
          streak: kindToday ? Math.max(serverStreak, s.streak) : serverStreak,
          lastChallengeDate: today,
        }));
        navigation.goBack();
        return;
      }
      // No today row → just sync streak (no bounce). Skip the sync when a
      // kindness act already advanced the LOCAL streak today: until the
      // kindness migration is applied server-side, user_streaks lags local
      // state and this dispatch would regress it (and un-set today's
      // done-state on the Today tab).
      const kindnessLoggedToday = store.getState().app.kindnessHistory.some(k => k.date === todayLocal());
      if (streakRow && !kindnessLoggedToday) {
        dispatch(restoreStreak({
          streak: streakRow.current_streak ?? 0,
          lastChallengeDate: streakRow.last_completed_on ?? null,
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [isFocused, dispatch, navigation]);

  // The useEffect above navigates back once bloomedToday flips true, but a
  // tap can fire in the gap before navigation resolves — disable the CTA
  // defensively. We do NOT gate on !todayChallenge: resolveChallenge already
  // provides a valid local fallback, so the prompt is always "available".
  const writeDisabled = complimentedToday;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      <Text style={styles.label}>TODAY'S COMPLIMENT</Text>
      <Text style={styles.prompt}>{challenge.prompt}</Text>

      <View style={styles.divider} />

      <Text style={styles.label}>THE RULE</Text>
      <View style={styles.ruleBox}>
        <Text style={styles.ruleText}>{challenge.rule}</Text>
      </View>

      <View style={styles.exampleCard}>
        <Text style={styles.labelDim}>EXAMPLE</Text>
        <View style={styles.quoteWrap}>
          <Text style={styles.quote}>"{challenge.example}"</Text>
        </View>
        <Text style={styles.quoteNote}>
          This is just one way. Yours will be completely different.
        </Text>
      </View>

      <View style={styles.whyRow}>
        <LightbulbIcon size={20} />
        <Text style={styles.whyText}>{challenge.why}</Text>
      </View>

      <Pressable
        style={[styles.btn, writeDisabled && styles.btnDisabled]}
        onPress={() => navigation.navigate('Write')}
        disabled={writeDisabled}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.btnText}>
            {writeDisabled ? 'Compliment already sent today' : 'I get it — let me write it'}
          </Text>
          {!writeDisabled && <SunIcon size={20} />}
        </View>
      </Pressable>
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 20,
  },
  back: {
    color: theme.colors.faint,
    fontSize: 14,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '600',
  },
  labelDim: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.faint,
    marginBottom: 10,
  },
  prompt: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.bord,
  },
  ruleBox: {
    backgroundColor: theme.colors.ruleBoxBg,
    borderWidth: 1,
    borderColor: theme.colors.ruleBoxBord,
    borderRadius: theme.radius.md,
    padding: 16,
  },
  ruleText: {
    fontSize: 16,
    lineHeight: 27,
    color: theme.colors.text,
  },
  exampleCard: {
    backgroundColor: theme.colors.exampleBg,
    borderWidth: 1,
    borderColor: theme.colors.exampleBord,
    borderRadius: theme.radius.md,
    padding: 16,
  },
  quoteWrap: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(245,200,66,0.35)',
    paddingLeft: 14,
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: theme.colors.dim,
    lineHeight: 26,
  },
  quoteNote: {
    fontSize: 12,
    color: theme.colors.faint,
    marginTop: 10,
  },
  whyRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: theme.colors.whyBg,
    borderRadius: 12,
    padding: 14,
  },
  whyIcon: {
    fontSize: 18,
  },
  whyText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.faint,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  btn: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.45,
  },
}));
