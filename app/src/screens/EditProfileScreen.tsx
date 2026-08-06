import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setUsername as setUsernameAction, setUserId, setEmail, setEmailVerified } from '../store/appSlice';
import { checkUsernameAvailable, saveUsername, loadProfileUsername, saveProfilePhone } from '../utils/supabase';
import { showAlert } from '../components/CustomAlert';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = { navigation: NativeStackNavigationProp<any> };

export default function EditProfileScreen({ navigation }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const { username: savedUsername, email: savedEmail } = useSelector((s: RootState) => s.app);

  // profileUsername is the source of truth for hasChanges — loaded from DB on mount.
  // Falls back to Redux until the DB responds (no flicker).
  const [profileUsername, setProfileUsername] = useState(savedUsername ?? '');
  const [usernameInput, setUsernameInput] = useState(savedUsername ?? '');
  // Phone is the second contact-matching key (alongside email): with a
  // number on file, a compliment sent to this phone contact resolves to the
  // account. Editable here; no verification needed — it's a matching key, not
  // an auth factor. Stored on profiles.phone via update_profile_phone.
  const [savedPhone, setSavedPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfileUsername().then(({ username, email, phone }) => {
      if (username) {
        setProfileUsername(username);
        setUsernameInput(username);
        dispatch(setUsernameAction(username));
      }
      if (email) {
        dispatch(setEmail(email));
        dispatch(setEmailVerified(true));
      }
      if (phone != null) {
        setSavedPhone(phone);
        setPhoneInput(phone);
      }
    });
  }, []);

  const usernameChanged = usernameInput.trim().toLowerCase() !== profileUsername;
  const phoneChanged = phoneInput.trim() !== savedPhone;
  const hasChanges = usernameChanged || phoneChanged;

  const handleSave = async () => {
    Keyboard.dismiss();

    // Validate username only when it actually changed — a user who only wants
    // to set a phone number shouldn't be blocked by username rules (and may
    // not have a username at all yet).
    const name = usernameInput.trim().toLowerCase();
    if (usernameChanged && !/^[a-z0-9_]{3,20}$/.test(name)) {
      showAlert('Invalid Username', 'Use 3–20 letters, numbers or _ only.');
      return;
    }

    setSaving(true);

    if (usernameChanged) {
      const available = await checkUsernameAvailable(name);
      if (!available) {
        setSaving(false);
        showAlert('Taken', 'That username is already taken. Try another.');
        return;
      }
      const result = await saveUsername(name);
      if (!result.success) {
        setSaving(false);
        showAlert('Error', result.error ?? 'Failed to save username.');
        return;
      }
      setProfileUsername(name);
      dispatch(setUsernameAction(name));
      if (result.userId) dispatch(setUserId(result.userId));
    }

    if (phoneChanged) {
      const stored = await saveProfilePhone(phoneInput.trim());
      // RPC returns the normalized/blank value it stored; null means the
      // save FAILED. Caching the typed value and saying "Saved" anyway left
      // the user believing their phone was set (and compliments sent to it
      // claimable) when the server never stored it.
      if (stored == null) {
        setSaving(false);
        showAlert('Error', 'Could not save your phone number. Check your connection and try again.');
        return;
      }
      setSavedPhone(stored);
      setPhoneInput(stored);
    }

    setSaving(false);
    showAlert('Saved', 'Your profile has been updated.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
        <Pressable
          style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0C0C0C" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Personal Information</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Username</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={usernameInput}
            onChangeText={(t) => setUsernameInput(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="choose_a_username"
            placeholderTextColor={theme.colors.faint}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.inputIcon}>👤</Text>
        </View>
      </View>

      {savedEmail ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.inputRow}>
            <Text style={styles.emailDisplay}>{savedEmail}</Text>
            <Text style={styles.verifiedBadge}>✓</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Phone</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={phoneInput}
            onChangeText={setPhoneInput}
            placeholder="(555) 123-4567"
            placeholderTextColor={theme.colors.faint}
            keyboardType="phone-pad"
            maxLength={20}
            autoCorrect={false}
          />
          <Text style={styles.inputIcon}>📱</Text>
        </View>
        <Text style={styles.fieldHint}>
          So friends who lift you by phone contact reach your account. Optional.
        </Text>
      </View>
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: theme.colors.faint, fontSize: 14 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  saveBtn: {
    backgroundColor: theme.colors.gold, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  saveBtnDisabled: { opacity: 0.38 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#0C0C0C' },
  sectionTitle: { fontSize: 14, color: theme.colors.faint, letterSpacing: 0.5 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 12, paddingHorizontal: 14,
  },
  input: {
    flex: 1, fontSize: 16, color: theme.colors.text,
    paddingVertical: 14,
  },
  inputIcon: { fontSize: 18, opacity: 0.5 },
  emailDisplay: { flex: 1, fontSize: 16, color: theme.colors.dim, paddingVertical: 14 },
  verifiedBadge: { fontSize: 16, color: '#A8E6CF' },
  fieldHint: { fontSize: 12, color: theme.colors.faint, lineHeight: 17 },
}));
