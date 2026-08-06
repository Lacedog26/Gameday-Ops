// In-app target for the `/c/:id` share link.
//
// Why this screen exists: iOS associatedDomains (applinks:onecompliment.app)
// makes the OS open EVERY onecompliment.app URL in the app when it's
// installed — including the "tap to see what was said" links we text to
// unregistered recipients. Before this screen, the app had no route for
// `/c/:id`, so the universal link dead-ended on the Home tab and the
// recipient never saw the compliment (the reported "see what was said
// doesn't resolve" bug). Now the link lands here and shows the message.
//
// It also opportunistically claims the compliment: if the signed-in viewer
// is the intended recipient (matched by their account email), the
// claim_pending_compliments RPC attaches it to their feed.

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { loadPublicCompliment, claimPendingCompliments, markComplimentRead, type PublicCompliment } from '../utils/supabase';
import { SunflowerIcon } from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export default function ComplimentViewScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const { id } = (route.params ?? {}) as { id?: string };

  const [loading, setLoading] = useState(true);
  const [compliment, setCompliment] = useState<PublicCompliment | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) {
        if (mounted) setLoading(false);
        return;
      }
      // Best-effort: attach this (and any other) pending compliment to the
      // viewer's account if it was addressed to their email. Fire before the
      // read so a freshly-claimed row is reflected in their feed on return.
      // Never blocks the read and never throws.
      void claimPendingCompliments();
      // Read receipt for the sender — viewing the compliment here counts
      // as reading it (the recipient may never open the Recap tab).
      void markComplimentRead(id);
      const data = await loadPublicCompliment(id);
      if (mounted) {
        setCompliment(data);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const goHome = () => {
    // Land them on their Recap feed so a just-claimed compliment is visible.
    // This screen sits at the ROOT stack (so deep links resolve pre-onboarding),
    // so navigate to the Main tabs explicitly rather than via a tab parent.
    try {
      navigation.navigate('Main', { screen: 'RecapTab' });
    } catch {
      try { navigation.goBack(); } catch { /* nowhere to go (cold deep-link) */ }
    }
  };

  const senderLabel =
    compliment?.senderDisplay?.trim() ||
    (compliment?.senderUsername ? `@${compliment.senderUsername}` : 'Someone');

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Pressable onPress={goHome} hitSlop={8}>
        <Text style={styles.back}>← Home</Text>
      </Pressable>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
        </View>
      ) : compliment ? (
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <SunflowerIcon size={44} />
          </View>
          <Text style={styles.eyebrow}>YOU'VE BEEN LIFTED</Text>
          {compliment.recipientName ? (
            <Text style={styles.recipient}>{compliment.recipientName},</Text>
          ) : null}
          <Text style={styles.body}>“{compliment.body}”</Text>
          <Text style={styles.sender}>— {senderLabel}</Text>

          <Pressable style={styles.btn} onPress={goHome}>
            <Text style={styles.btnText}>Send one back 🌻</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <SunflowerIcon size={44} />
          </View>
          <Text style={styles.eyebrow}>NOTHING HERE</Text>
          <Text style={styles.missing}>
            This lift can't be found — the link may have expired (they last 90 days)
            or it was already removed.
          </Text>
          <Pressable style={styles.btn} onPress={goHome}>
            <Text style={styles.btnText}>Go to OneCompliment</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    padding: 24,
    gap: 24,
    flexGrow: 1,
  },
  back: {
    color: theme.colors.faint,
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: theme.radius.md,
    padding: 24,
    gap: 14,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '700',
  },
  recipient: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  body: {
    fontSize: 20,
    lineHeight: 30,
    color: theme.colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  sender: {
    fontSize: 14,
    color: theme.colors.dim,
  },
  missing: {
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.dim,
    textAlign: 'center',
  },
  btn: {
    marginTop: 10,
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
}));
