import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Platform, Image, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  setNotifEnabled,
  setNotifTime,
  setRating,
  setFeedbackSubmitted,
  resetOnboarding,
  hydrateState,
  setPro,
} from '../store/appSlice';
import { restorePurchases } from '../utils/revenuecat';
import { submitFeedback, deleteMyAccount } from '../utils/supabase';
import {
  requestNotificationPermissions, scheduleDailyReminder, cancelAllReminders,
  registerPushToken, getNotifyOnReceived, setNotifyOnReceived,
} from '../utils/notifications';
import { showAlert } from '../components/CustomAlert';
import { SunflowerIcon, StarIcon, SparkleIcon } from '../components/icons';

function parseTime(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 9, m || 0, 0, 0);
  return d;
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function SettingsRow({ icon, label, sub, onPress, rightText, danger }: {
  icon: string; label: string; sub?: string; onPress: () => void; rightText?: string; danger?: boolean;
}) {
  const { styles } = useStyles(stylesheet);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {rightText ? (
        <Text style={styles.rowRight}>{rightText}</Text>
      ) : (
        <Text style={styles.rowChevron}>›</Text>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const {
    notifEnabled, notifTime, currentRating, feedbackSubmitted,
    username: savedUsername, email: savedEmail, emailVerified, isPro,
  } = useSelector((s: RootState) => s.app);

  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
  const [comment, setComment] = useState('');

  // Per-user push-on-received toggle. Stored on profiles.notify_on_received
  // so the server-side Edge Function honors it without an app rebuild.
  const [notifyOnReceived, setNotifyOnReceivedState] = useState(true);
  React.useEffect(() => {
    getNotifyOnReceived().then(setNotifyOnReceivedState);
  }, []);

  const toggleNotifyOnReceived = async () => {
    const next = !notifyOnReceived;
    if (next) {
      // Turning ON: make sure the OS permission is granted AND that a push
      // token is on file. Without both, the server-side push will no-op.
      const granted = await requestNotificationPermissions();
      if (!granted) {
        showAlert(
          'Permissions Required',
          'Enable notifications in your device settings to get a heads-up when someone lifts you.',
        );
        return;
      }
      await registerPushToken();
    }
    const ok = await setNotifyOnReceived(next);
    if (ok) setNotifyOnReceivedState(next);
  };

  const toggleNotif = async () => {
    const newValue = !notifEnabled;
    if (newValue) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        showAlert('Permissions Required', 'Enable notifications in your device settings to get daily reminders.');
        return;
      }
      await scheduleDailyReminder(notifTime);
    } else {
      await cancelAllReminders();
    }
    dispatch(setNotifEnabled(newValue));
  };

  const handleRating = (val: number) => dispatch(setRating(val));
  const handleSubmitFeedback = async () => {
    if (currentRating === 0 && comment.trim().length === 0) return;
    dispatch(setFeedbackSubmitted());
    submitFeedback(currentRating, comment, savedUsername ?? null);
  };
  const ready = currentRating > 0 || comment.trim().length > 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Settings</Text>

      {/* Profile card */}
      {/* <Pressable style={styles.profileCard} onPress={() => navigation.navigate('EditProfile')}>
        <View style={styles.profileAvatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImage} />
          ) : (
            <Text style={styles.profileAvatarText}>
              {(savedUsername || '?').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>
            {savedUsername ? `@${savedUsername}` : 'Set up your profile'}
          </Text>
          <Text style={styles.profileEmail}>
            {savedEmail || 'No email linked'}
          </Text>
        </View>
        <Text style={styles.profileChevron}>›</Text>
      </Pressable> */}

      {/* Account section */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.rowGroup}>
        <SettingsRow
          icon="👤"
          label="Edit Profile"
          sub="Update your username and phone"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <View style={styles.rowDivider} />
        <SettingsRow
          icon="✉️"
          label="Link Email"
          sub={savedEmail && emailVerified ? savedEmail : 'Sync your data across devices'}
          onPress={() => navigation.navigate('LinkEmail')}
          rightText={emailVerified ? '✓' : undefined}
        />
      </View>

      {/* Subscription */}
      <Text style={styles.sectionLabel}>Subscription</Text>
      <View style={styles.rowGroup}>
        {isPro ? (
          <>
            <View style={styles.proRow}>
              <SparkleIcon size={18} color={theme.colors.gold} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.proTitle}>Pro Active</Text>
                <Text style={styles.proSub}>
                  {Platform.OS === 'ios'
                    ? 'Manage in App Store settings'
                    : Platform.OS === 'android'
                    ? 'Manage in Google Play settings'
                    : 'Manage in store settings'}
                </Text>
              </View>
            </View>
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="⚙️"
              label="Manage Subscription"
              sub={
                Platform.OS === 'ios'
                  ? 'Open App Store subscription settings'
                  : Platform.OS === 'android'
                  ? 'Open Google Play subscription settings'
                  : 'Open store subscription settings'
              }
              onPress={() => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('https://apps.apple.com/account/subscriptions');
                } else if (Platform.OS === 'android') {
                  Linking.openURL(
                    'https://play.google.com/store/account/subscriptions',
                  );
                }
              }}
            />
          </>
        ) : (
          <>
            <SettingsRow
              icon="✦"
              label="Upgrade to Pro"
              sub="Streak freezes, unlimited groups, and more"
              onPress={() => navigation.navigate('HomeTab', { screen: 'Pro' })}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="🔄"
              label="Restore Purchases"
              sub="Already subscribed? Restore here"
              onPress={async () => {
                try {
                  const result = await restorePurchases();
                  if (result.isPro) {
                    dispatch(setPro(true));
                    showAlert('Restored!', 'Your Pro subscription has been restored.');
                  } else if (result.error) {
                    showAlert('Something went wrong', result.error);
                  } else {
                    showAlert(
                      'No active subscription',
                      "We couldn't find an active Pro subscription on this Apple ID. If you just purchased, wait a moment and try again.",
                    );
                  }
                } catch {
                  showAlert('Something went wrong', 'Could not check your subscription right now. Try again in a moment.');
                }
              }}
            />
          </>
        )}
      </View>

      {/* Local leaderboard */}
      <Text style={styles.sectionLabel}>Local Leaderboard</Text>
      <View style={styles.rowGroup}>
        <SettingsRow
          icon="📍"
          label="Local Leaderboard"
          sub="Top streaks near you"
          onPress={() => navigation.navigate('GeoLeaderboard')}
        />
      </View>

      {/* Push notifications — sender-triggered. Independent of the daily
          reminder above (different intent: nudge me vs. tell me someone
          acted toward me). */}
      <Text style={styles.sectionLabel}>Push Notifications</Text>
      <View style={styles.rowGroup}>
        <View style={styles.notifRow}>
          <View style={styles.rowIcon}><Text style={styles.rowIconText}>🌻</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>When someone lifts me</Text>
            <Text style={styles.rowSub}>Get a notification when you receive a compliment.</Text>
          </View>
          <Pressable
            style={[styles.toggle, notifyOnReceived && styles.toggleActive]}
            onPress={toggleNotifyOnReceived}
          >
            <View style={[styles.knob, notifyOnReceived && styles.knobActive]} />
          </Pressable>
        </View>
      </View>

      {/* Notifications */}
      <Text style={styles.sectionLabel}>Daily Reminder</Text>
      <View style={styles.rowGroup}>
        <View style={styles.notifRow}>
          <View style={styles.rowIcon}><Text style={styles.rowIconText}>🔔</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Remind me daily</Text>
            <Text style={styles.rowSub}>One nudge. That's it.</Text>
          </View>
          <Pressable style={[styles.toggle, notifEnabled && styles.toggleActive]} onPress={toggleNotif}>
            <View style={[styles.knob, notifEnabled && styles.knobActive]} />
          </Pressable>
        </View>
        {notifEnabled && (
          <>
            <View style={styles.rowDivider} />
            <View style={styles.notifRow}>
              <View style={styles.rowIcon}><Text style={styles.rowIconText}>⏰</Text></View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Remind me at</Text>
              {Platform.OS === 'android' && (
                <Pressable style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.timeButtonText}>{notifTime}</Text>
                </Pressable>
              )}
            </View>
            {showTimePicker && (
              <DateTimePicker
                value={parseTime(notifTime)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minuteInterval={5}
                themeVariant="dark"
                accentColor={theme.colors.gold}
                onChange={(_event: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS === 'android') setShowTimePicker(false);
                  if (date) {
                    const time = formatTime(date);
                    dispatch(setNotifTime(time));
                    scheduleDailyReminder(time);
                  }
                }}
              />
            )}
          </>
        )}
      </View>

      {/* Feedback */}
      <Text style={styles.sectionLabel}>Feedback</Text>
      {feedbackSubmitted ? (
        <View style={styles.thankYou}>
          <SunflowerIcon size={28} />
          <Text style={styles.thankTitle}>Thank you!</Text>
          <Text style={styles.thankSub}>Your feedback helps us grow.</Text>
        </View>
      ) : (
        <View style={styles.feedbackCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={styles.feedbackLabel}>How would you rate OneC</Text>
            <SunflowerIcon size={13} />
            <Text style={styles.feedbackLabel}>mpliment?</Text>
          </View>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(v => (
              <Pressable key={v} onPress={() => handleRating(v)} style={v <= currentRating ? styles.starActive : styles.starDim}>
                <StarIcon size={28} color="#F5C842" />
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Tell us what you think..."
            placeholderTextColor={theme.colors.faint}
            value={comment}
            onChangeText={setComment}
            maxLength={500}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.feedbackBtn, ready && styles.feedbackBtnReady]}
            onPress={handleSubmitFeedback}
            disabled={!ready}
          >
            <Text style={[styles.feedbackBtnText, ready && styles.feedbackBtnTextReady]}>Send Feedback</Text>
          </Pressable>
        </View>
      )}

      {/* Legal — moved off Home per design feedback. Still also present
          on the Pro paywall, which is what the Apple subscription
          disclosure requirement actually cares about. */}
      <Text style={styles.sectionLabel}>Legal</Text>
      <View style={styles.rowGroup}>
        <SettingsRow
          icon="🔒"
          label="Privacy Policy"
          sub="How we handle your data"
          onPress={() => Linking.openURL('https://onecompliment.app/privacy')}
        />
        <View style={styles.rowDivider} />
        <SettingsRow
          icon="📄"
          label="Terms of Use"
          sub="Apple Standard EULA"
          onPress={() =>
            Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')
          }
        />
      </View>

      {/* Danger zone */}
      <Text style={styles.sectionLabel}>Other</Text>
      <View style={styles.rowGroup}>
        <SettingsRow
          icon="🔄"
          label="Replay Onboarding"
          sub="See the intro again"
          onPress={() => dispatch(resetOnboarding())}
        />
        <View style={styles.rowDivider} />
        <SettingsRow
          icon="🗑️"
          label="Clear All Data"
          sub="Reset streak, groups, and settings"
          danger
          onPress={() => {
            showAlert('Are you sure?', 'This will reset all your data. This cannot be undone.', [
              { text: 'Yes', style: 'destructive', onPress: async () => {
                await AsyncStorage.clear();
                dispatch(hydrateState({
                  onboarded: false, streak: 0, lastChallengeDate: null, groups: [],
                  notifEnabled: false, notifTime: '09:00', currentRating: 0,
                  feedbackSubmitted: false, cookieChoice: null, userId: null,
                  username: null, email: null, emailVerified: false,
                  complimentHistory: [], isPro: false,
                }));
              }},
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
        />
        <View style={styles.rowDivider} />
        <SettingsRow
          icon="⚠️"
          label="Delete Account"
          sub="Permanently remove your account and data"
          danger
          onPress={() => {
            showAlert(
              'Delete your account?',
              'This permanently deletes your profile, compliments, streaks, group/team memberships, and invitations. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    const result = await deleteMyAccount();
                    if (!result.ok) {
                      showAlert('Could not delete account', result.error);
                      return;
                    }
                    // Wipe local cache so the UI doesn't keep showing stale data.
                    await AsyncStorage.clear();
                    dispatch(hydrateState({
                      onboarded: false, streak: 0, lastChallengeDate: null, groups: [],
                      notifEnabled: false, notifTime: '09:00', currentRating: 0,
                      feedbackSubmitted: false, cookieChoice: null, userId: null,
                      username: null, email: null, emailVerified: false,
                      complimentHistory: [], isPro: false,
                    }));
                    showAlert('Account deleted', 'Your data has been removed. Thanks for trying OneCompliment.');
                  },
                },
              ]
            );
          }}
        />
      </View>

      {/* App version */}
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.footerText}>OneC</Text>
          <SunflowerIcon size={12} />
          <Text style={styles.footerText}>mpliment</Text>
        </View>
        <Text style={styles.footerVersion}>Version 1.0{isPro ? ' · Pro' : ''}</Text>
      </View>
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },

  /* Profile card */
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 16, padding: 16,
  },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.colors.gold,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  profileAvatarImage: { width: 48, height: 48 },
  profileAvatarText: { fontSize: 20, fontWeight: '700', color: '#0C0C0C' },
  profileName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  profileEmail: { fontSize: 13, color: theme.colors.faint, marginTop: 2 },
  profileChevron: { fontSize: 22, color: theme.colors.faint },

  /* Section */
  sectionLabel: { fontSize: 13, color: theme.colors.faint, marginTop: 8, marginBottom: -4 },

  /* Row group */
  rowGroup: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(245,200,66,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: 'rgba(255,80,80,0.10)' },
  rowIconText: { fontSize: 18 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  rowLabelDanger: { color: 'rgba(255,100,100,0.8)' },
  rowSub: { fontSize: 12, color: theme.colors.faint, marginTop: 1 },
  rowRight: { fontSize: 16, color: '#A8E6CF', fontWeight: '700' },
  rowChevron: { fontSize: 22, color: theme.colors.faint },
  rowDivider: { height: 1, backgroundColor: theme.colors.bord, marginLeft: 62 },

  /* Notification inline */
  notifRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  toggle: {
    width: 44, height: 26, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: theme.colors.gold },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)' },
  knobActive: { backgroundColor: '#0D0D0D', alignSelf: 'flex-end' },
  timeButton: {
    backgroundColor: theme.colors.inputBg, borderWidth: 1, borderColor: theme.colors.inputBord,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16,
  },
  timeButtonText: { fontSize: 15, color: theme.colors.text },

  /* Pro */
  proRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  proTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.gold },
  proSub: { fontSize: 12, color: theme.colors.faint, marginTop: 1 },

  /* Feedback */
  thankYou: {
    backgroundColor: 'rgba(168,230,207,0.08)', borderWidth: 1, borderColor: 'rgba(168,230,207,0.20)',
    borderRadius: 14, padding: 20, alignItems: 'center', gap: 8,
  },
  thankTitle: { fontSize: 15, fontWeight: '700', color: '#A8E6CF' },
  thankSub: { fontSize: 13, color: theme.colors.faint },
  feedbackCard: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, padding: 16, gap: 12,
  },
  feedbackLabel: { fontSize: 13, color: theme.colors.dim },
  stars: { flexDirection: 'row', gap: 6 },
  starActive: { opacity: 1 },
  starDim: { opacity: 0.25 },
  feedbackInput: {
    backgroundColor: theme.colors.inputBg, borderWidth: 1, borderColor: theme.colors.inputBord,
    borderRadius: 12, padding: 12, fontSize: 14, color: theme.colors.text, minHeight: 80, lineHeight: 20,
  },
  feedbackBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  feedbackBtnReady: { backgroundColor: theme.colors.gold },
  feedbackBtnText: { fontSize: 15, fontWeight: '700', color: 'rgba(245,240,232,0.3)' },
  feedbackBtnTextReady: { color: '#0C0C0C' },

  /* Footer */
  footer: { alignItems: 'center', gap: 4, paddingVertical: 12 },
  footerText: { fontSize: 12, fontWeight: '700', color: theme.colors.faint },
  footerVersion: { fontSize: 11, color: theme.colors.faint },
}));
