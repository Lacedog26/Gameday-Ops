import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setStreak, markGroupsBloomed, addCompliment } from '../store/appSlice';
import { submitCompliment, loadMyStreak, loadTodayCompletion } from '../utils/supabase';
import { loadMyGroups, postGroupCompliment } from '../utils/supabaseGroups';
import { resolveChallenge } from '../data/challenges';
import { todayLocal } from '../utils/dates';
import AnimatedBloom from '../components/AnimatedBloom';
import { showAlert } from '../components/CustomAlert';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export default function BloomScreen({ navigation, route }: Props) {
  const { styles } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const todayChallenge = useSelector((s: RootState) => s.app.todayChallenge);
  const { recipient, response, recipientUserId, recipientEmail, recipientPhone } = route.params as {
    recipient: string;
    response: string;
    /** Null when the sender typed a free-form name — DoneScreen
     *  branches its share UX on this. */
    recipientUserId?: string | null;
    /** Contact identifiers when the recipient was picked from the phone
     *  book — the server matches by email / stores them for claiming. */
    recipientEmail?: string | null;
    recipientPhone?: string | null;
  };
  // Captured async by submitCompliment and handed to Done so the share
  // card can build `https://onecompliment.app/c/<id>`.
  const completionIdRef = useRef<string | null>(null);

  // The Bloom screen has two parallel jobs: a ~2.6 s animation, and the
  // server submit. The post-animation navigation has to wait for BOTH —
  // not just the animation — otherwise on slow networks (iOS first
  // request is the reliable offender; Android tends to finish in <1 s)
  // we pop to Landing while submit is still in flight, Landing fetches
  // today's row and gets back null, and the SEND IT TO X card never
  // renders. That was the iOS-only "submit appears to work but no card"
  // bug.
  const submitOkRef = useRef<boolean | null>(null);
  const submitErrorRef = useRef<string | null>(null);
  const animationDoneRef = useRef(false);
  const submitDoneRef = useRef(false);
  const finalizedRef = useRef(false);

  const finalize = useCallback(() => {
    if (finalizedRef.current) return;
    if (!animationDoneRef.current || !submitDoneRef.current) return;
    finalizedRef.current = true;

    // Defer a frame so reanimated's withRepeat updates don't apply to a
    // view that's about to unmount — the new arch is reproducibly
    // crash-y on iOS when reanimated and native-stack unmount in the
    // same frame.
    requestAnimationFrame(() => {
      try {
        if (submitOkRef.current === false) {
          showAlert(
            "Couldn't save your compliment",
            submitErrorRef.current
              ?? "Something went wrong on our end. Your text is still in the form — try again.",
          );
          // popToTop from Bloom would land on Landing, not Write.
          // navigate('Write') keeps the user's typed text intact — the
          // native stack preserved Write's local state while Bloom was
          // on top of it.
          if (navigation.isFocused()) navigation.navigate('Write');
          return;
        }
        if (navigation.isFocused()) navigation.popToTop();
      } catch (err) {
        console.warn('[Bloom] post-animation navigation failed:', err);
      }
    });
  }, [navigation]);

  useEffect(() => {
    // Hard timeout — if submit hasn't resolved in 15 s the request is
    // stuck (dead network, RPC unresponsive). Surface a clear error
    // rather than leaving the user staring at a frozen bloom.
    const stuckTimer = setTimeout(() => {
      if (submitDoneRef.current) return;
      console.warn('[Bloom] submit timed out after 15s');
      submitOkRef.current = false;
      submitErrorRef.current =
        "We couldn't reach the server. Check your connection and try again.";
      submitDoneRef.current = true;
      finalize();
    }, 15000);

    (async () => {
      const challenge = resolveChallenge(todayChallenge);
      try {
        const { completionId } = await submitCompliment(
          response,
          null,
          recipient,
          recipientUserId ?? null,
          recipientEmail ?? null,
          recipientPhone ?? null,
        );
        completionIdRef.current = completionId;
        const streakData = await loadMyStreak();
        if (streakData) {
          dispatch(setStreak(streakData.current_streak));
        }
        submitOkRef.current = true;
      } catch (e) {
        const msg = (e as { message?: string } | null)?.message ?? String(e);
        // Cross-device dup: user already submitted today on another
        // device. The DB trigger raises "You already completed today's
        // challenge." (20260513_enforce_one_per_day.sql). Treat as
        // success — fetch the existing completion id so the SEND IT TO X
        // card on Landing can build the public share link.
        if (/already completed.*today/i.test(msg) || /compliments_one_per_day/i.test(msg)) {
          const existing = await loadTodayCompletion();
          if (existing) completionIdRef.current = existing.id;
          const streakData = await loadMyStreak();
          if (streakData) dispatch(setStreak(streakData.current_streak));
          submitOkRef.current = true;
        } else {
          // Real failure (network, RLS, FK violation, schema drift, …).
          // Keep submitOkRef false so finalize() surfaces the alert and
          // bounces back to Write. Do NOT dispatch incrementStreak —
          // pretending success when nothing was saved is the exact bug
          // we're fixing.
          console.error('[Bloom] submitCompliment failed:', e);
          submitOkRef.current = false;
          submitErrorRef.current =
            /compliments_sender_id_fkey|violates foreign key/i.test(msg)
              ? "We couldn't link this compliment to your profile. Pick a username from Settings, then try again."
              : msg;
        }
      }

      // Success path only: persist to local history with the real id
      // (so a later Recap → addCompliment dedupe doesn't keep an orphan
      // local_<ts> entry alongside the server row), mark groups, and
      // fan out to cloud groups.
      if (submitOkRef.current === true) {
        dispatch(addCompliment({
          id: completionIdRef.current ?? `local_${Date.now()}`,
          date: todayLocal(),
          prompt: challenge.prompt,
          recipient,
          body: response,
          createdAt: new Date().toISOString(),
        }));
        dispatch(markGroupsBloomed({ compliment: response, recipient }));

        try {
          const groups = await loadMyGroups();
          await Promise.all(
            groups.map(g =>
              postGroupCompliment(g.id, response, recipient, null, g.pinned_challenge)
            )
          );
        } catch (_) { /* offline — skip group fan-out, personal already saved */ }
      }

      clearTimeout(stuckTimer);
      submitDoneRef.current = true;
      finalize();
    })();

    return () => clearTimeout(stuckTimer);
  }, []);

  return (
    <View style={styles.container}>
      <AnimatedBloom
        size={160}
        onComplete={() => {
          // Hand off to finalize() — it gates on BOTH submitDoneRef and
          // animationDoneRef so a slow iOS first-request doesn't pop to
          // Landing while submitCompliment is still in flight (the
          // symptom that left Home/Recap empty even though the row
          // landed in the DB moments later).
          animationDoneRef.current = true;
          finalize();
        }}
      />
      <Text style={styles.message}>Take a breath.{'\n'}Write something real.</Text>
    </View>
  );
}

const stylesheet = createStyleSheet(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    padding: 24,
  },
  message: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    color: theme.colors.text,
  },
}));
