import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { setOnboarded, setNotifEnabled } from '../store/appSlice';
import { RootState } from '../store';
import { ONBOARD_STEPS } from '../data/challenges';
import { SunriseIcon, SunIcon, SunflowerIcon } from '../components/icons';
import { requestNotificationPermissions, scheduleDailyReminder, registerPushToken } from '../utils/notifications';
import { showAlert } from '../components/CustomAlert';

// Visual icon per step. The notifications step uses an emoji rendered
// in the same icon-sized slot so the bob animation and vertical
// rhythm stay identical across all four screens.
const STEP_VISUAL: Record<string, React.ReactNode> = {
  intro: <SunriseIcon size={80} />,
  challenge: <SunIcon size={80} />,
  people: <SunflowerIcon size={80} />,
  notifications: <Text style={{ fontSize: 64 }}>🔔</Text>,
};

export default function OnboardingScreen() {
  const { styles } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const notifTime = useSelector((s: RootState) => s.app.notifTime);

  const current = ONBOARD_STEPS[step];
  const isLast = step === ONBOARD_STEPS.length - 1;

  // Bob animation for the step visual.
  const bobY = useSharedValue(0);
  useEffect(() => {
    bobY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500 }),
        withTiming(0, { duration: 1500 }),
      ),
      -1,
      true,
    );
  }, []);
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
  }));

  const advance = () => {
    if (isLast) {
      dispatch(setOnboarded());
    } else {
      setStep(step + 1);
    }
  };

  // Notifications step — ask permission, schedule, advance. Declining
  // OS permission shows an alert with a Settings deep-link but the
  // user can still advance via Skip.
  const enableNotifications = async () => {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      showAlert(
        'Permission needed',
        'Enable notifications in Settings to get a once-a-day nudge. You can change this anytime from the Settings tab.',
        [
          { text: 'Skip', style: 'cancel', onPress: advance },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    try {
      // Link the OneSignal push subscription to this user's external_id
      // BEFORE the daily-reminder schedule call so that received-compliment
      // pushes work even if the schedule write fails. Without this, users
      // who finished onboarding without backgrounding the app would have
      // their first push-eligible window be the next cold start.
      await registerPushToken();
      await scheduleDailyReminder(notifTime);
      dispatch(setNotifEnabled(true));
    } catch (e: any) {
      console.warn('[onboarding notifications] schedule failed:', e?.message ?? e);
    }
    advance();
  };

  // Per-step body content under the headline/sub. Only the
  // notifications step has body content today.
  let body: React.ReactNode = null;
  if (current.key === 'notifications') {
    body = (
      <View style={styles.bodyArea}>
        <Text style={styles.notifTime}>Default time: {notifTime}</Text>
        <Text style={styles.notifSubtle}>You can change the time anytime in Settings.</Text>
      </View>
    );
  }

  const onPressCta = () => {
    if (current.key === 'notifications') {
      enableNotifications();
    } else {
      advance();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Dots */}
        <View style={styles.dots}>
          {ONBOARD_STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {/* Icon — fixed-height slot keeps the rhythm consistent across
            steps even when an emoji is used in place of a vector icon. */}
        <View style={styles.iconSlot}>
          <Animated.View style={bobStyle}>{STEP_VISUAL[current.key]}</Animated.View>
        </View>

        {/* Text — fixed-height slot so the CTA stays at the same Y
            position regardless of how many lines the headline/sub
            wrap to. This is the spacing fix flagged in the
            design feedback (2026-05-20). */}
        <View style={styles.textSlot}>
          <Text style={styles.headline}>{current.headline}</Text>
          <Text style={styles.sub}>{current.sub}</Text>
        </View>

        {/* Per-step body. Fixed-height slot even when empty so the CTA
            stays anchored. */}
        <View style={styles.bodySlot}>{body}</View>

        {/* CTA */}
        <Pressable style={styles.btn} onPress={onPressCta}>
          <Text style={styles.btnText}>{current.cta} →</Text>
        </Pressable>

        {/* Skip slot kept at fixed height so layout doesn't shift, but
            the "Skip intro" button is removed per design feedback —
            the onboarding is short enough that everyone should see it.
            On the final notifications step we still offer "Not now"
            since that's an opt-out for a permission prompt, not a
            content skip. */}
        <View style={styles.skipSlot}>
          {isLast && current.key === 'notifications' && (
            <Pressable onPress={advance}>
              <Text style={styles.skip}>Not now</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const stylesheet = createStyleSheet(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 99,
  },
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.gold,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Fixed-height slots — spacing fix called out in design feedback.
  // Each step's icon/text/body sits in a slot that does not change
  // height from step to step, so the CTA never jumps vertically as
  // the user advances.
  iconSlot: {
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textSlot: {
    minHeight: 132,
    gap: 14,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  bodySlot: {
    minHeight: 64,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  bodyArea: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  skipSlot: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headline: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    color: theme.colors.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: 16,
    color: theme.colors.dim,
    lineHeight: 28,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
  skip: {
    color: theme.colors.faint,
    fontSize: 13,
  },

  notifTime: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  notifSubtle: {
    fontSize: 12,
    color: theme.colors.faint,
    textAlign: 'center',
  },
}));
