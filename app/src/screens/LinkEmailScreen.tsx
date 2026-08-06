import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  setUsername as setUsernameAction,
  setEmail as setEmailAction,
  setEmailVerified,
  restoreStreak,
  setUserId,
  setCloudGroups,
  setTeams,
  setComplimentHistory,
  setPro,
} from '../store/appSlice';
import { sendEmailOtp, verifyEmailOtp, loadExistingUserData, saveUsername, saveProfileEmail, loadServerProStatus } from '../utils/supabase';
import { registerPushToken } from '../utils/notifications';
import { identifyUser, combineProStatus } from '../utils/revenuecat';
import { showAlert } from '../components/CustomAlert';
import { CheckIcon, LightbulbIcon } from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Optional route params let other screens (e.g. WriteScreen's setup modal)
// hand off an email that's already been sent an OTP, dropping the user
// directly on the verify step with the address pre-filled.
type Props = {
  navigation: NativeStackNavigationProp<any>;
  route?: { params?: { email?: string; autoVerify?: boolean } };
};

export default function LinkEmailScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const { email: savedEmail, emailVerified, username: localUsername, streak: localStreak } = useSelector((s: RootState) => s.app);

  const handedOffEmail = route?.params?.email;
  const autoVerify = route?.params?.autoVerify === true;

  const [emailInput, setEmailInput] = useState(handedOffEmail ?? '');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'input' | 'verify' | 'done'>(
    savedEmail && emailVerified ? 'done'
      : autoVerify && handedOffEmail ? 'verify'
      : 'input'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(autoVerify ? 60 : 0);


  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // When we land in verify step from a hand-off, focus the OTP input so the
  // user can paste / type immediately without an extra tap.
  useEffect(() => {
    if (autoVerify && handedOffEmail && step === 'verify') {
      const t = setTimeout(() => hiddenRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, []);

  const handleSendOtp = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await sendEmailOtp(email);
      if (result.success) {
        setStep('verify');
        setResendTimer(60);
        setTimeout(() => hiddenRef.current?.focus(), 300);
      } else {
        setError(result.error ?? 'Failed to send code');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError('');
    try {
      const result = await sendEmailOtp(emailInput.trim().toLowerCase());
      if (result.success) {
        setResendTimer(60);
        setDigits(['', '', '', '', '', '']);
        hiddenRef.current?.focus();
      } else {
        setError(result.error ?? 'Failed to resend');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Single hidden input handles all typing — visual boxes are just display
  const hiddenRef = useRef<TextInput>(null);

  const handleCodeChange = (value: string) => {
    // Only allow digits, max 6
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < cleaned.length; i++) {
      newDigits[i] = cleaned[i];
    }
    setDigits(newDigits);
    setError('');
  };

  const otpCode = digits.join('');

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      setError('Enter all 6 digits');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const email = emailInput.trim().toLowerCase();
      const result = await verifyEmailOtp(email, otpCode);

      if (!result.success) {
        setError(result.error ?? 'Invalid code');
        return;
      }

      if (result.userId) {
        dispatch(setUserId(result.userId));
        // Re-point push at the new identity. The merge switches auth.uid()
        // from the anon id to the email user's id, so OneSignal's external_id
        // must be re-linked now — otherwise recipient pushes keep targeting
        // the old (deleted) id until the next cold launch. Fire-and-forget.
        void registerPushToken();
        // Link this identity to RevenueCat, then resolve Pro from BOTH the
        // store entitlement and the server flag (profiles.is_pro). Linking an
        // email is exactly when a user who bought Pro on the website shows up
        // on mobile — without the server read they'd still look Free here.
        // Isolated so any error never aborts the username / email restoration
        // flow below.
        try {
          const customerInfo = await identifyUser(result.userId);
          const rcPro = customerInfo
            ? customerInfo.entitlements.active['pro'] !== undefined
            : null;
          const serverPro = await loadServerProStatus();
          const effectivePro = combineProStatus(rcPro, serverPro);
          if (effectivePro !== null) dispatch(setPro(effectivePro));
        } catch { /* non-critical — Pro status will re-check on next startup */ }
      }

      await saveProfileEmail(email);

      const userData = await loadExistingUserData();

      // Prefer the server's post-merge username, then the pre-OTP anon username
      // (captured before the session switched), then local Redux as final fallback.
      const serverUsername = userData?.username;
      const resolvedUsername = serverUsername || result.anonUsername || localUsername;
      const resolvedStreak = Math.max(userData?.streak ?? 0, localStreak);

      if (resolvedStreak > 0) dispatch(restoreStreak({
        streak: resolvedStreak,
        lastChallengeDate: userData?.lastChallengeDate ?? null,
      }));
      if (resolvedUsername) dispatch(setUsernameAction(resolvedUsername));
      if (userData?.groups && userData.groups.length > 0) dispatch(setCloudGroups(userData.groups as any));
      if (userData?.teams && userData.teams.length > 0) dispatch(setTeams(userData.teams));
      if (userData?.complimentHistory && userData.complimentHistory.length > 0) dispatch(setComplimentHistory(userData.complimentHistory));

      if (!serverUsername && localUsername) {
        try {
          await saveUsername(localUsername);
        } catch { /* best effort */ }
      }

      const parts: string[] = [];
      if (resolvedUsername) parts.push(`@${resolvedUsername}`);
      if (resolvedStreak > 0) parts.push(`${resolvedStreak}-day streak`);
      if (userData?.groups && userData.groups.length > 0) parts.push(`${userData.groups.length} group${userData.groups.length > 1 ? 's' : ''}`);
      if (userData?.teams && userData.teams.length > 0) parts.push(`${userData.teams.length} team${userData.teams.length > 1 ? 's' : ''}`);
      if (userData?.complimentHistory && userData.complimentHistory.length > 0) parts.push(`${userData.complimentHistory.length} compliments`);

      dispatch(setEmailAction(email));
      dispatch(setEmailVerified(true));

      // Auto-verify entry path (from the setup modal in HomeStack): pop all
      // the way to Landing so the returning user lands on their home screen
      // with restored streak visible, instead of getting bounced through the
      // Brief/Write cascade by their `lastChallengeDate === today` guards.
      // Manual entry (from SettingsStack) keeps the 'done' confirmation.
      //
      // We deliberately do NOT call showAlert() at the same time as
      // popToTop(): presenting a transparent RN <Modal> while the LinkEmail
      // RNSScreen is mid-dismiss triggers iOS's
      //   "Attempt to present … which is already presenting …"
      // warning. iOS drops the present but the AlertProvider state still
      // thinks the modal is visible — leaving an invisible touch layer on
      // top of Landing that makes the whole screen unresponsive.
      // The restored Landing screen itself shows streak/groups/compliments,
      // which is the confirmation the user needs. Manual-path users get the
      // 'done' confirmation screen + the alert (no popToTop, no conflict).
      if (autoVerify) {
        navigation.popToTop();
      } else {
        if (parts.length > 0) {
          showAlert('Welcome back!', `We restored your data: ${parts.join(', ')}.`);
        }
        setStep('done');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (step === 'verify' && otpCode.length === 6 && !loading) {
      handleVerifyOtp();
    }
  }, [otpCode]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => {
        if (step === 'verify') { setStep('input'); setDigits(['', '', '', '', '', '']); setError(''); }
        else navigation.goBack();
      }}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      {/* ── DONE ── */}
      {step === 'done' && (
        <View style={styles.doneWrap}>
          <CheckIcon size={48} color="#A8E6CF" />
          <Text style={styles.doneTitle}>Email Verified</Text>
          <Text style={styles.doneEmail}>{savedEmail}</Text>
          <Text style={styles.doneHint}>Your data syncs across devices.</Text>
          {/* Explicit dismiss — without this, the user lands on a dead-end
              screen after verify: the "← Back" link at the top is small and
              easy to miss, which made the flow feel "stuck". */}
          <Pressable
            style={[styles.btn, { alignSelf: 'stretch', marginTop: 12, paddingHorizontal: 32 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnText}>Continue</Text>
          </Pressable>
        </View>
      )}

      {/* ── EMAIL INPUT ── */}
      {step === 'input' && (
        <>
          <Text style={styles.title}>Link Email</Text>
          <Text style={styles.subtitle}>Recover your streak and data on any device.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="you@email.com"
              placeholderTextColor={theme.colors.faint}
              value={emailInput}
              onChangeText={(t) => { setEmailInput(t); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={120}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#0C0C0C" /> : <Text style={styles.btnText}>Send Verification Code</Text>}
            </Pressable>
          </View>
        </>
      )}

      {/* ── VERIFY OTP ── */}
      {step === 'verify' && (
        <>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to{'\n'}
            <Text style={{ color: theme.colors.gold }}>{emailInput}</Text>.
          </Text>

          <Text style={styles.digitLabel}>Enter verification code</Text>

          {/* 6 digit boxes — tap anywhere to focus the hidden input */}
          <Pressable style={styles.digitRow} onPress={() => hiddenRef.current?.focus()}>
            {digits.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.digitBox,
                  d ? styles.digitBoxFilled : null,
                  !d && otpCode.length === i ? styles.digitBoxCursor : null,
                ]}
              >
                <Text style={styles.digitText}>{d}</Text>
              </View>
            ))}
          </Pressable>
          {/* Hidden input that captures all keyboard input */}
          <TextInput
            ref={hiddenRef}
            value={otpCode}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            style={styles.hiddenInput}
            caretHidden
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Verify button */}
          <Pressable
            style={[styles.btn, (loading || otpCode.length < 6) && styles.btnDisabled]}
            onPress={handleVerifyOtp}
            disabled={loading || otpCode.length < 6}
          >
            {loading ? <ActivityIndicator color="#0C0C0C" /> : <Text style={styles.btnText}>Verify</Text>}
          </Pressable>

          {/* Resend */}
          <View style={styles.resendWrap}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            <Pressable onPress={handleResend} disabled={resendTimer > 0}>
              <Text style={[styles.resendLink, resendTimer > 0 && styles.resendDisabled]}>
                {resendTimer > 0 ? `Resend in ${resendTimer} s` : 'Resend code'}
              </Text>
            </Pressable>
          </View>

          {/* Wrong email */}
          <View style={styles.wrongEmailWrap}>
            <Text style={styles.resendLabel}>Wrong email address?</Text>
            <Pressable onPress={() => { setStep('input'); setDigits(['', '', '', '', '', '']); setError(''); }}>
              <Text style={styles.resendLink}>Back to Email</Text>
            </Pressable>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <LightbulbIcon size={20} color={theme.colors.gold} />
              <Text style={styles.tipsTitle}>Tips</Text>
            </View>
            <Text style={styles.tipItem}>  ·  Check your spam or junk folder</Text>
            <Text style={styles.tipItem}>  ·  Code expires in 10 minutes</Text>
            <Text style={styles.tipItem}>  ·  Make sure you entered the correct email</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 20 },
  back: { color: theme.colors.faint, fontSize: 14 },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: theme.colors.dim, textAlign: 'center', lineHeight: 22, marginTop: -8 },

  /* Email input step */
  card: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 16, padding: 20, gap: 14,
  },
  label: { fontSize: 10, letterSpacing: 2.5, color: theme.colors.gold, fontWeight: '600' },
  emailInput: {
    backgroundColor: theme.colors.inputBg, borderWidth: 1, borderColor: theme.colors.inputBord,
    borderRadius: 12, padding: 14, fontSize: 16, color: theme.colors.text,
  },
  errorText: { fontSize: 13, color: 'rgba(255,100,100,0.8)', textAlign: 'center' },
  btn: { backgroundColor: theme.colors.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.38 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#0C0C0C' },

  /* OTP digit boxes */
  digitLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text, textAlign: 'center', marginTop: 8 },
  digitRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  digitBox: {
    width: 46, height: 56, borderRadius: 12,
    backgroundColor: theme.colors.surf,
    borderWidth: 1.5, borderColor: theme.colors.bord,
    alignItems: 'center', justifyContent: 'center',
  },
  digitBoxFilled: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldCardBg,
  },
  digitBoxCursor: {
    borderColor: theme.colors.gold,
  },
  digitText: {
    fontSize: 24, fontWeight: '700', color: theme.colors.text,
  },
  hiddenInput: {
    position: 'absolute', width: 1, height: 1, opacity: 0,
  },

  /* Resend */
  resendWrap: { alignItems: 'center', gap: 4 },
  resendLabel: { fontSize: 13, color: theme.colors.faint },
  resendLink: { fontSize: 14, fontWeight: '700', color: theme.colors.gold },
  resendDisabled: { color: theme.colors.faint, fontWeight: '400' },

  /* Wrong email */
  wrongEmailWrap: { alignItems: 'center', gap: 4 },

  /* Tips */
  tipsCard: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 16, padding: 18, gap: 8, marginTop: 8,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tipsTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  tipItem: { fontSize: 14, color: theme.colors.dim, lineHeight: 22 },

  /* Done */
  doneWrap: { alignItems: 'center', paddingTop: 40, gap: 16 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: '#A8E6CF' },
  doneEmail: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  doneHint: { fontSize: 14, color: theme.colors.faint, textAlign: 'center' },
}));
