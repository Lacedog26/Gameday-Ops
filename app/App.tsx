import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Provider } from 'react-redux';
import { NavigationContainer, LinkingOptions, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { OneSignal, LogLevel, NotificationWillDisplayEvent, type NotificationClickEvent } from 'react-native-onesignal';
import './src/theme/unistyles';
import { store, loadPersistedState } from './src/store';
import { hydrateState, resetGroupsForNewDay, setUserId, setUsername, setEmail, setEmailVerified, restoreStreak, setCloudGroups, setTeams, setComplimentHistory, setPro, setTodayChallenge, setUnreadReceived } from './src/store/appSlice';
import { ensureSession, loadTodaysPrompt, loadExistingUserData, loadUnreadReceivedCount, loadServerProStatus } from './src/utils/supabase';
import { todayLocal, daysAgoLocal } from './src/utils/dates';
import { initRevenueCat, checkProStatus, combineProStatus } from './src/utils/revenuecat';
import { scheduleDailyReminder, scheduleStreakAtRiskReminder, hasNotificationPermission, registerPushToken } from './src/utils/notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { AlertProvider } from './src/components/CustomAlert';
import { checkAppVersion, type AppVersionStatus } from './src/utils/appVersion';
import UpdateGate from './src/components/UpdateGate';

// OneSignal initialization — runs once at module load so the SDK is ready
// before any screen tries to call requestPermission / login. The App ID
// is public (it's embedded in every built binary anyway) — the secret is
// the REST API Key, which lives only in Supabase Edge Function secrets.
const ONESIGNAL_APP_ID =
  (Constants.expoConfig?.extra as { onesignalAppId?: string } | undefined)?.onesignalAppId ??
  'REPLACE_WITH_ONESIGNAL_APP_ID';
if (__DEV__) OneSignal.Debug.setLogLevel(LogLevel.Verbose);
OneSignal.initialize(ONESIGNAL_APP_ID);

// ── Foreground notification handler ───────────────────────────
// When the device receives a push while the app is in the foreground,
// the SDK fires this event. Without an explicit `.display()` call the
// banner does not appear on iOS during foreground — the symptom the
// user reported ("notifications don't display"). Calling display()
// keeps the standard OS banner UX and still fires the click handler
// when tapped.
OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: NotificationWillDisplayEvent) => {
  try {
    event.getNotification().display();
  } catch (e) {
    console.warn('[notif] foreground display failed:', (e as Error)?.message ?? e);
  }
});

// Navigation ref so the OneSignal click handler (module scope, outside the
// React tree) can route on a notification tap.
export const navigationRef = createNavigationContainerRef<any>();

// ── Notification click handler ────────────────────────────────
// Compliment pushes include { type: 'received_compliment', source } in
// their data payload. Tapping the banner lands the user on the Recap tab,
// where the new compliment shows up (Recap refreshes on focus).
OneSignal.Notifications.addEventListener('click', (event: NotificationClickEvent) => {
  const data = (event.notification.additionalData ?? {}) as {
    type?: string;
    source?: 'personal' | 'team' | 'group';
    completion_id?: string;
  };
  if (data.type !== 'received_compliment') return;
  // Retry briefly: on a cold launch from the push the NavigationContainer
  // isn't mounted yet when this fires, so navigate() would no-op.
  let tries = 0;
  const go = () => {
    if (navigationRef.isReady()) {
      try {
        // Open STRAIGHT to the compliment the push is about (client ask:
        // "it should open straight to the compliment", not dump on the app
        // front). Personal lifts carry the compliment id → route to the
        // Compliment screen, which shows the message and attaches it to the
        // recipient's account. Team/group lifts (or a missing id) fall back
        // to the Recap tab where they're listed.
        if (data.completion_id && (data.source ?? 'personal') === 'personal') {
          navigationRef.navigate('Compliment', { id: data.completion_id });
        } else {
          navigationRef.navigate('Main', { screen: 'RecapTab' });
        }
      } catch (e) {
        console.warn('[notif] click navigate failed:', (e as Error)?.message ?? e);
      }
      return;
    }
    if (tries++ < 20) setTimeout(go, 150); // up to ~3s for cold launch
  };
  go();
});

const linking: LinkingOptions<any> = {
  prefixes: ['onecompliment://', 'https://onecompliment.app'],
  config: {
    screens: {
      // "tap to see what was said" share link. iOS universal links claim the
      // whole onecompliment.app domain, so an installed app receives /c/:id
      // and must route it. Registered at the ROOT (not under Main) so it
      // resolves whether or not the user has onboarded — otherwise a new
      // install tapping a share link dead-ends. Matches the root-level
      // `Compliment` screen in AppNavigator.
      Compliment: 'c/:id',
      Main: {
        screens: {
          TeamsTab: {
            screens: {
              TeamsList: { path: 'join/team/:code' },
            },
          },
          GroupsTab: {
            screens: {
              GroupsList: { path: 'join/group/:code' },
            },
          },
        },
      },
    },
  },
};

function AppLoader() {
  const [ready, setReady] = useState(false);
  // Server-driven "please update" gate (no OTA → store build is the only way
  // to ship client changes). null = no prompt. Fail-open: any check failure
  // leaves this null so a backend hiccup never blocks the app.
  const [update, setUpdate] = useState<AppVersionStatus | null>(null);
  // Local day the currently-loaded daily prompt belongs to. Used to roll the
  // prompt over when the app is foregrounded after crossing local midnight
  // (otherwise an app left open overnight keeps yesterday's prompt text).
  const promptDayRef = useRef<string>(todayLocal());

  useEffect(() => {
    (async () => {
      try {
        // Hydrate persisted state from AsyncStorage. Wrapped so a corrupt
        // payload can't strand the app at the spinner — if hydration
        // throws we still proceed and render with default state.
        const saved = await loadPersistedState();
        if (saved) {
          store.dispatch(hydrateState(saved));
        }
      } catch (e) {
        console.warn('Persisted-state hydration failed:', e);
      }
      try {
        store.dispatch(resetGroupsForNewDay());
      } catch (e) {
        console.warn('resetGroupsForNewDay failed:', e);
      }

      // Connect to Supabase — create anonymous user if none exists
      let userId: string | null = null;
      try {
        userId = await ensureSession();
        if (userId) {
          store.dispatch(setUserId(userId));
        }
      } catch (e) {
        console.warn('Supabase session init failed:', e);
      }

      // Sync user profile from DB — restores username on new device / reinstall
      if (userId) {
        try {
          const userData = await loadExistingUserData();
          if (userData?.username) {
            store.dispatch(setUsername(userData.username));
          }
          if (userData?.email) {
            store.dispatch(setEmail(userData.email));
            store.dispatch(setEmailVerified(true));
          }
          if (userData && userData.streak > 0) {
            const localStreak = store.getState().app.streak;
            if (userData.streak > localStreak) {
              store.dispatch(restoreStreak({
                streak: userData.streak,
                lastChallengeDate: userData.lastChallengeDate,
              }));
            }
          }
          if (userData?.groups && userData.groups.length > 0) {
            store.dispatch(setCloudGroups(userData.groups as any));
          }
          if (userData?.teams && userData.teams.length > 0) {
            store.dispatch(setTeams(userData.teams));
          }
          if (userData?.complimentHistory && userData.complimentHistory.length > 0) {
            const localHistory = store.getState().app.complimentHistory;
            if (userData.complimentHistory.length > localHistory.length) {
              store.dispatch(setComplimentHistory(userData.complimentHistory));
            }
          }
        } catch (e) {
          console.warn('User profile sync failed:', e);
        }

        // Unread received-compliment count → Recap-tab red dot.
        try {
          const unread = await loadUnreadReceivedCount();
          store.dispatch(setUnreadReceived(unread));
        } catch (e) {
          console.warn('Unread count load failed:', e);
        }
      }

      // Load today's challenge from Supabase
      try {
        const challenge = await loadTodaysPrompt();
        if (challenge) {
          store.dispatch(setTodayChallenge(challenge));
        }
        promptDayRef.current = todayLocal();
      } catch (e) {
        console.warn('Daily prompt load failed, using fallback:', e);
      }

      // Initialize RevenueCat and resolve Pro status. Pro can come from the
      // store (RevenueCat) OR the server (profiles.is_pro — set by the Stripe
      // webhook for web purchases and by manual admin grants), so OR the two.
      // Only update Redux on a definitive answer (non-null); null on both
      // sources means network error — keep the cached isPro from AsyncStorage.
      try {
        await initRevenueCat(userId);
        const [rcPro, serverPro] = await Promise.all([
          checkProStatus(),
          loadServerProStatus(),
        ]);
        const effectivePro = combineProStatus(rcPro, serverPro);
        if (effectivePro !== null) {
          store.dispatch(setPro(effectivePro));
        }
      } catch (e) {
        console.warn('RevenueCat init failed:', e);
      }

      // Set up notifications.
      //   - Daily reminder / streak-at-risk: scheduled locally; gated on
      //     the user's "Daily Reminder" toggle in Settings (state.notifEnabled).
      //   - Push token for received-compliment pushes: registered whenever
      //     the OS permission is granted, regardless of the daily-reminder
      //     toggle (they're conceptually different — one nudges the user
      //     to act, the other tells the user someone acted toward them).
      //     Per-user opt-out for compliment pushes is profiles.notify_on_received.
      try {
        const state = store.getState().app;
        // Do NOT cold-prompt at launch (App Store Guideline 5.1.1). The OS
        // permission dialog is requested in-context — onboarding's
        // notifications step and the Settings toggle. At launch we only read
        // the EXISTING decision (no prompt) and register the push subscription
        // when it's already granted.
        const granted = await hasNotificationPermission();
        if (state.notifEnabled && granted) {
          await scheduleDailyReminder(state.notifTime);
          // Only nudge when the streak is genuinely at risk *today*: the
          // user bloomed yesterday and hasn't yet today. Firing on any
          // `lastChallengeDate !== today` also pinged users whose streak
          // was already broken (missed days ago) with a "your N-day streak
          // is at risk" they'd in fact already lost.
          if (state.lastChallengeDate === daysAgoLocal(1) && state.streak >= 3) {
            await scheduleStreakAtRiskReminder(state.streak);
          }
        }
        if (granted) {
          await registerPushToken();
        }
        // Reset the app-icon badge on cold launch too (the foreground
        // listener only fires on background→active transitions).
        try { OneSignal.Notifications.clearAll(); } catch { /* no-op */ }
      } catch (e) {
        console.warn('Notification setup failed:', e);
      }

      // Version gate: ask the server if this build is current. Non-blocking
      // and fail-open — checkAppVersion never throws and returns 'ok' on any
      // error, so this can only ADD a prompt, never strand the user.
      try {
        const status = await checkAppVersion();
        if (status.status !== 'ok') setUpdate(status);
      } catch (e) {
        console.warn('Version check failed:', e);
      }

      setReady(true);
    })().catch((e) => {
      // Last-ditch safety net: if anything inside the IIFE escapes the
      // per-step try/catches, still flip ready=true so the user sees the
      // app instead of an indefinite spinner.
      console.warn('AppLoader init crashed:', e);
      setReady(true);
    });
  }, []);

  // Watchdog: never let the network-bound init chain strand the user on
  // the splash spinner. The per-step try/catches above handle *rejections*,
  // but a stalled socket read never rejects promptly — device logs show
  // "Receive failed … Operation timed out" / "Connection has no local
  // endpoint" hanging far longer than any acceptable splash. After 5s,
  // render the app regardless of where init is blocked. Background init
  // keeps running; its Redux dispatches (incl. setPro from checkProStatus)
  // still land and the UI reacts when they resolve. Mirrors the useFonts
  // timeout in App() below.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // Re-verify Pro status each time the app returns to foreground.
  // (Supabase session auto-refresh is wired at module scope in
  // utils/supabase.ts so it runs globally, not just while ready.)
  //
  // Also roll the daily prompt over at local midnight: if the app comes back
  // to the foreground on a later local day than the loaded prompt, re-pull
  // today's prompt and reset the per-day group state. The bloomed/not-bloomed
  // gates already recompute against todayLocal() on every render, so this is
  // only about refreshing the prompt *content* for a long-lived session.
  useEffect(() => {
    if (!ready) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;

      // Clear delivered notifications + reset the app-icon badge whenever the
      // user opens the app. The compliment push increments the badge
      // (ios_badgeType: 'Increase'); without this it would accumulate forever.
      try { OneSignal.Notifications.clearAll(); } catch { /* no-op */ }

      const today = todayLocal();
      if (today !== promptDayRef.current) {
        promptDayRef.current = today;
        store.dispatch(resetGroupsForNewDay());
        try {
          const challenge = await loadTodaysPrompt();
          if (challenge) store.dispatch(setTodayChallenge(challenge));
        } catch (e) {
          console.warn('Daily prompt refresh failed:', e);
        }
      }

      const [rcPro, serverPro] = await Promise.all([
        checkProStatus(),
        loadServerProStatus(),
      ]);
      const effectivePro = combineProStatus(rcPro, serverPro);
      if (effectivePro !== null) store.dispatch(setPro(effectivePro));

      // Refresh the received-compliment red dot on every foreground — a
      // compliment may have arrived (and pushed) while the app was backgrounded.
      try {
        const unread = await loadUnreadReceivedCount();
        store.dispatch(setUnreadReceived(unread));
      } catch { /* keep current dot state */ }

      // Re-check the version gate so a threshold flipped server-side catches
      // long-lived sessions that rarely cold-launch. Fail-open as on launch.
      try {
        const status = await checkAppVersion();
        setUpdate(status.status !== 'ok' ? status : null);
      } catch { /* keep current gate state */ }
    });
    return () => sub.remove();
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0C0C0C', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F5C842" />
      </View>
    );
  }

  return (
    <>
      <AppNavigator />
      {update && update.status !== 'ok' && (
        <UpdateGate
          status={update.status}
          storeUrl={update.storeUrl}
          onDismiss={() => setUpdate(null)}
        />
      )}
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold });
  const [fontTimedOut, setFontTimedOut] = useState(false);

  // Belt-and-suspenders: if useFonts hangs (seen in production with the
  // new architecture's asset loader), proceed without custom fonts after
  // 5s rather than leaving the user staring at a black screen forever.
  // System font is a fine fallback.
  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const t = setTimeout(() => setFontTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [fontsLoaded, fontError]);

  if (fontError) {
    console.warn('Font load failed, continuing with system font:', fontError);
  }

  if (!fontsLoaded && !fontError && !fontTimedOut) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0C0C0C', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F5C842" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <NavigationContainer ref={navigationRef} linking={linking}>
          <AlertProvider>
            <AppLoader />
          </AlertProvider>
        </NavigationContainer>
      </Provider>
    </SafeAreaProvider>
  );
}
