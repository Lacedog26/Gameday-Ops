import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch } from 'react-redux';
import {
  setUsername as setUsernameAction,
  setUserId,
} from '../store/appSlice';
import {
  checkUsernameAvailable,
  saveUsername,
} from '../utils/supabase';

interface Props {
  visible: boolean;
  onCancel: () => void;
  /**
   * Called after the setup completes. Returns the chosen username so
   * the caller can finish navigating into the Write flow. The `email`
   * + `emailSent` fields are kept in the result shape for backwards
   * compatibility with callers (WriteScreen) — they'll always be
   * undefined / false now that the email branch lives in Settings →
   * Link Email instead of this modal.
   */
  onComplete: (result: { username: string; email?: string; emailSent: boolean }) => void;
}

const USERNAME_RULES = /^[a-z0-9_]{3,20}$/;

// Simplified setup modal — single username field per design feedback
// (2026-05-21). The previous version asked for an email AND a username
// in the same step, and the "which do I choose?" friction was costing
// us users right before their first compliment. Email link / verify is
// still available, just one tap deeper in Settings → Link Email so it's
// no longer in the critical path.
export default function UsernameRequiredModal({ visible, onCancel, onComplete }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUsername('');
    setError('');
    setSaving(false);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleContinue = async () => {
    // Outer try/catch is load-bearing: every supabase call below can
    // throw at the fetch layer on network failure. An uncaught
    // rejection in an onPress handler triggers RN's RCTFatal abort in
    // release builds.
    try {
      const name = username.trim().toLowerCase();

      if (!USERNAME_RULES.test(name)) {
        setError('Username must be 3–20 letters, numbers, or _');
        return;
      }

      Keyboard.dismiss();
      setSaving(true);
      setError('');

      const available = await checkUsernameAvailable(name);
      if (!available) {
        setSaving(false);
        setError('That username is taken. Try another.');
        return;
      }

      const result = await saveUsername(name);
      if (!result.success) {
        setSaving(false);
        setError(result.error ?? 'Could not save username. Please try again.');
        return;
      }

      dispatch(setUsernameAction(name));
      if (result.userId) dispatch(setUserId(result.userId));

      setSaving(false);
      onComplete({ username: name, email: undefined, emailSent: false });
      reset();
    } catch {
      setSaving(false);
      setError('Something went wrong. Check your connection and try again.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Pick a username</Text>
          <Text style={styles.message}>
            That's all we need to get you sending compliments. You can link an
            email later in Settings to sync across devices.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>USERNAME</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={(t) => {
                setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                setError('');
              }}
              placeholder="choose_a_username"
              placeholderTextColor={theme.colors.faint}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.buttons}>
            <Pressable
              style={[styles.btn, styles.btnPrimary, saving && styles.btnDisabled]}
              onPress={handleContinue}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#0C0C0C" />
              ) : (
                <Text style={styles.btnTextPrimary}>{saving ? 'Saving…' : 'Continue'}</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnCancel]}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.btnTextCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const stylesheet = createStyleSheet(theme => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F2EDE4',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: 'rgba(242,237,228,0.65)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#F2EDE4',
  },
  error: {
    fontSize: 13,
    color: 'rgba(255,120,120,0.9)',
    textAlign: 'center',
  },
  buttons: {
    gap: 10,
    marginTop: 6,
  },
  btn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#F5C842',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C0C0C',
  },
  btnTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F2EDE4',
  },
}));
