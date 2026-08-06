import React from 'react';
import { View, Text, Pressable, Modal, Linking } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import type { UpdateStatus } from '../utils/appVersion';

interface Props {
  // Only the non-'ok' states render a gate.
  status: Exclude<UpdateStatus, 'ok'>;
  storeUrl: string;
  // Honored only when status === 'suggest'. A 'block' gate has no way out
  // except updating.
  onDismiss: () => void;
}

// Soft + hard update prompt. 'suggest' → dismissible "Update available"
// banner; 'block' → full-screen "Update required" with no escape.
export default function UpdateGate({ status, storeUrl, onDismiss }: Props) {
  const { styles } = useStyles(stylesheet);
  const blocking = status === 'block';

  const openStore = () => {
    if (!storeUrl) return;
    // Bad/unconfigured url or no store app installed — swallow rather than crash.
    Linking.openURL(storeUrl).catch(() => { /* no-op */ });
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      // Android hardware back: swallow it while blocking, dismiss while suggesting.
      onRequestClose={blocking ? () => { /* trapped */ } : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🌻</Text>
          <Text style={styles.title}>{blocking ? 'Update required' : 'Update available'}</Text>
          <Text style={styles.message}>
            {blocking
              ? 'This version of OneCompliment is no longer supported. Update to the latest version to keep going.'
              : 'A new version of OneCompliment is ready — with the latest features and fixes.'}
          </Text>

          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={openStore}>
              <Text style={styles.btnTextPrimary}>Update now</Text>
            </Pressable>
            {!blocking && (
              <Pressable style={[styles.btn, styles.btnCancel]} onPress={onDismiss}>
                <Text style={styles.btnTextCancel}>Later</Text>
              </Pressable>
            )}
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
    gap: 12,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
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
  buttons: {
    width: '100%',
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
    backgroundColor: theme.colors.gold,
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
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
