// ── Kindness completion moment ───────────────────────────────────
//
// The emotional payoff of the core loop. Reached from Today / Explore /
// Random Act when the user taps "I did it" on a (non-compliment) act.
//
// On mount it LOGS the act — locally first (Redux + AsyncStorage, so it
// can never be lost), then mirrors to Supabase via log_kindness_act,
// which also advances the server streak. The bloom animation plays over
// the top, then the screen settles into the reward state: warm copy,
// the streak, and an optional one-line note for the journal.
//
// No shame, no timers, no confetti overload — one flower, one good
// moment, an easy way back to Today.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, store } from '../store';
import { addKindness, updateKindness, restoreStreak, type KindnessEntry } from '../store/appSlice';
import { getKindnessAction, getCompletionLine, getRandomKindness } from '../data/kindness';
import { logKindnessAct, saveKindnessNote } from '../utils/kindnessApi';
import { todayLocal, daysAgoLocal } from '../utils/dates';
import AnimatedBloom from '../components/AnimatedBloom';
import { SunflowerIcon } from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export default function KindnessDoneScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const { streak, lastChallengeDate } = useSelector((s: RootState) => s.app);

  const params = (route.params ?? {}) as {
    actionId?: string;
    source?: KindnessEntry['source'];
    /** Free-form flow: ask "what did you do?" before logging. */
    custom?: boolean;
  };
  const action = params.actionId ? getKindnessAction(params.actionId) : undefined;
  const libraryTitle = action?.title ?? 'An act of kindness';
  const emoji = action?.emoji ?? '🌻';

  const [phase, setPhase] = useState<'input' | 'blooming' | 'done'>(
    params.custom ? 'input' : 'blooming',
  );
  const [customTitle, setCustomTitle] = useState('');
  const [note, setNote] = useState('');
  const [displayedStreak, setDisplayedStreak] = useState(streak);
  const entryIdRef = useRef<string>(`local_${Date.now()}`);
  const loggedRef = useRef(false);
  const title = params.custom ? (customTitle.trim() || 'An act of kindness') : libraryTitle;
  const loggedTitleRef = useRef(title);

  // ── Log exactly once ── (on mount for library acts; on "Log it" for
  // custom ones). Local-first: journal entry + honest local streak math —
  // consecutive day → +1, first act today after a gap → 1, already
  // counted today → unchanged.
  const doLog = (actualTitle: string) => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    loggedTitleRef.current = actualTitle;

    const today = todayLocal();
    const alreadyCountedToday = lastChallengeDate === today;
    const localStreak = alreadyCountedToday
      ? streak
      : lastChallengeDate === daysAgoLocal(1)
      ? streak + 1
      : 1;

    dispatch(addKindness({
      id: entryIdRef.current,
      date: today,
      actionId: action?.id ?? '',
      title: actualTitle,
      emoji,
      category: action?.category ?? 'small-things',
      createdAt: new Date().toISOString(),
      source: params.source ?? 'custom',
      synced: false,
    }));
    dispatch(restoreStreak({ streak: localStreak, lastChallengeDate: today }));
    setDisplayedStreak(localStreak);

    // Server mirror — best-effort, never blocks the moment.
    (async () => {
      const result = await logKindnessAct({
        actionId: action?.id ?? '',
        title: actualTitle,
        emoji,
        category: action?.category ?? 'small-things',
        source: params.source ?? 'custom',
        date: today,
      });
      if (result) {
        dispatch(updateKindness({
          id: entryIdRef.current,
          changes: { id: result.id, synced: true },
        }));
        entryIdRef.current = result.id;
        // Race repair: if the user typed a note and tapped Done BEFORE this
        // sync resolved, finish() saved it against the local_* id (a no-op
        // server-side). Re-send it now under the real id, otherwise the
        // next server merge would win with note = null and wipe it.
        const syncedEntry = store.getState().app.kindnessHistory.find(k => k.id === result.id);
        if (syncedEntry?.note) {
          saveKindnessNote(result.id, syncedEntry.note);
        }
        if (result.currentStreak !== null) {
          const serverStreak = Math.max(result.currentStreak, localStreak);
          dispatch(restoreStreak({ streak: serverStreak, lastChallengeDate: today }));
          setDisplayedStreak(serverStreak);
        }
      }
    })();
  };

  useEffect(() => {
    if (!params.custom) doLog(libraryTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitCustom = () => {
    const trimmed = customTitle.trim();
    if (trimmed.length < 3) return;
    doLog(trimmed);
    setPhase('blooming');
  };

  const finish = () => {
    const trimmed = note.trim();
    if (trimmed) {
      dispatch(updateKindness({ id: entryIdRef.current, changes: { note: trimmed } }));
      saveKindnessNote(entryIdRef.current, trimmed);
    }
    navigation.popToTop();
  };

  const line = getCompletionLine();

  // ── Custom act: ask what they did before celebrating ──
  if (phase === 'input') {
    const canLog = customTitle.trim().length >= 3;
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Back</Text>
          </Pressable>
          <View style={styles.heroWrap}>
            <SunflowerIcon size={56} />
            <Text style={styles.title}>What did you do?</Text>
            <Text style={styles.sub}>
              Any kindness counts — in your own words, one line is plenty.
            </Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="e.g. Helped my neighbor carry groceries"
            placeholderTextColor={theme.colors.faint}
            value={customTitle}
            onChangeText={setCustomTitle}
            maxLength={120}
            autoFocus
          />
          <Pressable
            style={[styles.btn, !canLog && styles.btnDisabled]}
            onPress={submitCustom}
            disabled={!canLog}
          >
            <Text style={styles.btnText}>Log it 🌻</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (phase === 'blooming') {
    return (
      <View style={styles.bloomContainer}>
        <AnimatedBloom size={160} onComplete={() => setPhase('done')} />
        <Text style={styles.bloomText}>{loggedTitleRef.current}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.heroWrap}>
          <SunflowerIcon size={72} />
          <Text style={styles.title}>{line.title}</Text>
          <Text style={styles.sub}>{line.sub}</Text>
        </View>

        <View style={styles.actCard}>
          <Text style={styles.actEmoji}>{emoji}</Text>
          <Text style={styles.actTitle}>{loggedTitleRef.current}</Text>
        </View>

        {displayedStreak > 1 && (
          <View style={styles.streakRow}>
            <Text style={styles.streakText}>
              🔥 {displayedStreak} days of kindness in a row
            </Text>
          </View>
        )}

        <View style={styles.noteWrap}>
          <Text style={styles.noteLabel}>ADD A NOTE · OPTIONAL</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Who was it for? How did it land?"
            placeholderTextColor={theme.colors.faint}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={280}
          />
          <Text style={styles.noteHint}>
            A line here becomes part of your kindness journal — evidence of
            the kind of person you’re becoming.
          </Text>
        </View>

        <Pressable style={styles.btn} onPress={finish}>
          <Text style={styles.btnText}>Done</Text>
        </Pressable>
        <Pressable
          style={styles.moreLink}
          onPress={() => {
            const next = getRandomKindness([action?.id ?? '']);
            navigation.replace('RandomAct', { initialId: next.id });
          }}
        >
          <Text style={styles.moreLinkText}>Feeling it? Do one more →</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  bloomContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    padding: 24,
  },
  bloomText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    color: theme.colors.text,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 100,
    gap: 22,
  },
  heroWrap: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 34,
  },
  sub: {
    fontSize: 15,
    color: theme.colors.dim,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  actCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: theme.radius.md,
    padding: 16,
  },
  actEmoji: {
    fontSize: 26,
  },
  actTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 21,
  },
  streakRow: {
    alignItems: 'center',
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.dim,
  },
  noteWrap: {
    gap: 8,
  },
  noteLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.faint,
    fontWeight: '600',
  },
  noteInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBord,
    borderRadius: theme.radius.md,
    padding: 14,
    minHeight: 76,
    fontSize: 15,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  noteHint: {
    fontSize: 12,
    color: theme.colors.faint,
    lineHeight: 18,
  },
  backLink: {
    color: theme.colors.faint,
    fontSize: 14,
    marginBottom: 4,
  },
  btn: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
  moreLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  moreLinkText: {
    fontSize: 13,
    color: theme.colors.faint,
    fontWeight: '600',
  },
}));
