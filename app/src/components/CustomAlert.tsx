import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

export default function CustomAlert({ visible, title, message, buttons, onDismiss }: Props) {
  const { styles } = useStyles(stylesheet);

  const resolvedButtons: AlertButton[] = buttons && buttons.length > 0
    ? buttons
    : [{ text: 'OK', style: 'default', onPress: onDismiss }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.buttons}>
            {resolvedButtons.map((btn, i) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.btn,
                    isCancel && styles.btnCancel,
                    isDestructive && styles.btnDestructive,
                    !isCancel && !isDestructive && styles.btnDefault,
                  ]}
                  onPress={() => { btn.onPress?.(); onDismiss?.(); }}
                >
                  <Text style={[
                    styles.btnText,
                    isCancel && styles.btnTextCancel,
                    isDestructive && styles.btnTextDestructive,
                  ]}>
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Global alert state for imperative usage
type AlertState = { visible: boolean; title: string; message?: string; buttons?: AlertButton[] };
let _setAlert: ((s: AlertState) => void) | null = null;

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  _setAlert?.({ visible: true, title, message, buttons });
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AlertState>({ visible: false, title: '' });
  _setAlert = setState;

  return (
    <>
      {children}
      <CustomAlert
        visible={state.visible}
        title={state.title}
        message={state.message}
        buttons={state.buttons}
        onDismiss={() => setState(s => ({ ...s, visible: false }))}
      />
    </>
  );
}

const stylesheet = createStyleSheet(theme => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 28,
    gap: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F2EDE4',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: 'rgba(242,237,228,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDefault: {
    backgroundColor: '#F5C842',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  btnDestructive: {
    backgroundColor: 'rgba(255,80,80,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.25)',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C0C0C',
  },
  btnTextCancel: {
    color: '#F2EDE4',
  },
  btnTextDestructive: {
    color: 'rgba(255,100,100,0.9)',
  },
}));
