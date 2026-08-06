import React from 'react';
import { View, Text, Pressable, ScrollView, Linking, Share } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getNextMilestone, getDayOfYear } from '../data/challenges';
import { SunflowerIcon, FireIcon, SunIcon, SparkleIcon, BuildingIcon } from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export default function DoneScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const { streak, isPro } = useSelector((s: RootState) => s.app);
  const {
    recipient,
    response,
    recipientUserId,
    completionId,
  } = route.params as {
    recipient: string;
    response: string;
    /** When null, the sender typed a free-form name and the recipient
     *  isn't on OneCompliment yet — render the "Send to <name>" card
     *  so the sender can text the link themselves. */
    recipientUserId?: string | null;
    /** Compliment row id from complete_daily_prompt — drives the
     *  public share link `https://onecompliment.app/c/<id>`. */
    completionId?: string | null;
  };
  const nextMs = getNextMilestone(streak);
  const day = getDayOfYear();

  // Wordle-style streak share card. Per design feedback the compliment
  // body has been removed — the curiosity hook ("what did they say?")
  // is what drives someone to follow the link. Showing the text inline
  // burns that.
  const shareText = (
    `OneC🌻mpliment — Day ${day} 🔥\n\n` +
    `🌻 ☀️\n\n` +
    `onecompliment.app — what would you say?`
  );

  // Lift-anyone branch — only when the recipient wasn't on OC.
  const isUnregistered = !recipientUserId;
  const publicUrl = completionId ? `https://onecompliment.app/c/${completionId}` : null;
  // Share message intentionally does NOT include the compliment text.
  // Same reason as shareText above — the recipient should have to tap
  // through to read it. The "Today's Challenge" link title that used
  // to appear in iMessage previews is a web-side OG fix on the /c/<id>
  // page, not a mobile change.
  const liftMessage = publicUrl
    ? `${recipient}, you've been lifted on OneCompliment 🌻\n\nTap to see what was said — and send one back:\n${publicUrl}`
    : '';

  // Native share sheet — iOS shows iMessage / WhatsApp / Mail / etc.
  // and Android shows the system chooser. RN's Share API is the right
  // primitive for "send this lift yourself".
  const sendLift = async () => {
    if (!liftMessage) return;
    try {
      await Share.share({ message: liftMessage });
    } catch (_e) {
      /* dismissed */
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.doneWrap}>
        <SunflowerIcon size={72} />
        <Text style={styles.doneTitle}>You lifted someone today.</Text>
        <Text style={styles.doneSub}>
          {recipient} got a little more light today — that's on you.
        </Text>

        {/* Quote card */}
        <View style={styles.goldCard}>
          <Text style={styles.label}>WHAT YOU SAID</Text>
          <Text style={styles.quoteText}>"{response}"</Text>
          <Text style={styles.quoteTo}>— to {recipient}</Text>
        </View>

        {/* Streak */}
        <View style={styles.streakRow}>
          <FireIcon size={28} />
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>day{streak !== 1 ? 's' : ''} streak</Text>
        </View>

        {/* Next milestone */}
        {nextMs && (
          <View style={styles.peekBox}>
            <SunflowerIcon size={28} />
            <View>
              <Text style={styles.peekTitle}>
                {nextMs.days - streak} more day{nextMs.days - streak !== 1 ? 's' : ''} to {nextMs.badge}
              </Text>
              <View style={styles.peekSubRow}>
                <Text style={styles.peekSub}>Come back tomorrow </Text>
                <SunIcon size={14} />
              </View>
            </View>
          </View>
        )}

        {/* Lift-someone-not-yet-on-the-app share card. Only renders when
            the sender typed a free-form name — the message is personal,
            recipient lands on /c/<id> when they tap the link. */}
        {isUnregistered && publicUrl && (
          <View style={styles.liftCard}>
            <Text style={styles.liftLabel}>SEND IT TO {recipient.toUpperCase()}</Text>
            <Text style={styles.liftTitle}>
              {recipient} isn't on OneCompliment yet — that's OK.
            </Text>
            <Text style={styles.liftSub}>
              Send them this card yourself. When they tap the link they'll see who
              lifted them and what you said.
            </Text>
            <View style={styles.liftPreview}>
              <Text style={styles.liftPreviewText}>{liftMessage}</Text>
            </View>
            <Pressable style={styles.liftBtn} onPress={sendLift}>
              <Text style={styles.btnText}>🌻 Send to {recipient}</Text>
            </Pressable>
          </View>
        )}

        {/* Bloom preview — screenshot-only, no Share button below.
            Per client feedback, the visual share card is meant to be
            screenshotted and posted directly to social — adding a
            copy-text button below was redundant and made the section
            feel like two actions instead of one display element. */}
        <View style={styles.shareSection}>
          <Text style={styles.labelDim}>SHARE YOUR BLOOM</Text>
          <View style={styles.sharePreview}>
            <Text style={styles.sharePreviewText}>{shareText}</Text>
          </View>
        </View>

        {/* Pro Banner — only show if not Pro */}
        {!isPro && (
          <View style={styles.proBanner}>
            <View style={styles.proBadge}>
              <View style={styles.proBadgeRow}>
                <SparkleIcon size={12} color={theme.colors.gold} />
                <Text style={styles.proBadgeText}> OneCompliment Pro</Text>
              </View>
            </View>
            <Text style={styles.proTitle}>Take your streak to the next level</Text>
            <Text style={styles.proDesc}>
              Streak freezes, unlimited groups, compliment history, and more.
            </Text>
            <Pressable style={styles.btn} onPress={() => navigation.navigate('Pro')}>
              <View style={styles.btnRow}>
                <SunflowerIcon size={18} />
                <Text style={styles.btnText}> See Pro Plans</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* For Teams */}
        <View style={styles.teamsCard}>
          <Text style={styles.teamsLabel}>FOR SCHOOLS & ORGANIZATIONS</Text>
          <Text style={styles.teamsTitle}>
            Run this as a challenge with your whole team
          </Text>
          <Text style={styles.teamsSub}>
            Teachers, coaches, HR teams, and churches use OneCompliment to run group kindness challenges.
          </Text>
          <Pressable
            style={styles.teamsBtn}
            onPress={() => Linking.openURL('https://onecompliment.app/onecompliment-org')}
          >
            <View style={styles.teamsBtnRow}>
              <BuildingIcon size={16} color="#0C0C0C" />
              <Text style={styles.teamsBtnText}> Learn more for teams →</Text>
            </View>
          </Pressable>
        </View>

        {/* Back */}
        <Pressable style={styles.btnGhost} onPress={() => navigation.popToTop()}>
          <View style={styles.btnGhostRow}>
            <Text style={styles.btnGhostText}>Back to home </Text>
            <SunIcon size={14} />
          </View>
        </Pressable>

        <Pressable onPress={() => Linking.openURL('https://onecompliment.app/privacy')}>
          <Text style={styles.privacyLink}>Privacy Policy</Text>
        </Pressable>
      </View>
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
    paddingTop: 12,
    paddingBottom: 100,
  },
  doneWrap: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 20,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    color: theme.colors.text,
    textAlign: 'center',
  },
  doneSub: {
    fontSize: 14,
    color: theme.colors.dim,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  goldCard: {
    width: '100%',
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: theme.radius.lg,
    padding: 18,
  },
  // Unregistered-recipient share card. Green palette so it reads as
  // distinct from the streak-share grid below.
  liftCard: {
    width: '100%',
    backgroundColor: 'rgba(168,230,207,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(168,230,207,0.30)',
    borderRadius: theme.radius.lg,
    padding: 18,
    gap: 10,
  },
  liftLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#A8E6CF',
    fontWeight: '600',
    textAlign: 'center',
  },
  liftTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  liftSub: {
    fontSize: 13,
    color: theme.colors.dim,
    lineHeight: 20,
    textAlign: 'center',
  },
  liftPreview: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.md,
    padding: 14,
    marginTop: 4,
  },
  liftPreviewText: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.dim,
    lineHeight: 20,
  },
  liftBtn: {
    backgroundColor: '#A8E6CF',
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '600',
    marginBottom: 10,
  },
  labelDim: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.faint,
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 25,
    color: theme.colors.text,
  },
  quoteTo: {
    fontSize: 12,
    color: theme.colors.faint,
    marginTop: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakNum: {
    fontSize: 46,
    fontWeight: '700',
    color: theme.colors.gold,
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 12,
    color: theme.colors.faint,
  },
  peekBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.ruleBoxBg,
    borderWidth: 1,
    borderColor: theme.colors.ruleBoxBord,
    borderRadius: theme.radius.md,
    padding: 14,
    width: '100%',
  },
  peekTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  peekSub: {
    fontSize: 11,
    color: theme.colors.faint,
    marginTop: 2,
  },
  peekSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  shareSection: {
    width: '100%',
    gap: 10,
  },
  // Centered monospace share card matching the design mock — Wordle-
  // style result block, the 🌻☀️ row visually anchors the middle.
  sharePreview: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  sharePreviewText: {
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 28,
    textAlign: 'center',
  },
  copiedBadge: {
    backgroundColor: '#A8E6CF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  copiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copiedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C0C0C',
  },
  btn: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
  /** Pill rounding for the Share button — matches web Done.tsx styling. */
  shareBtn: {
    borderRadius: 999,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.md,
    padding: 14,
    alignItems: 'center',
  },
  socialBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialBtnText: {
    fontSize: 12,
    color: theme.colors.faint,
  },
  proBanner: {
    width: '100%',
    backgroundColor: theme.colors.proBannerBg,
    borderWidth: 1,
    borderColor: theme.colors.proBannerBord,
    borderRadius: theme.radius.xl,
    padding: 22,
    gap: 14,
    alignItems: 'center',
  },
  proBadge: {
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.30)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  proBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proBadgeText: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.gold,
  },
  proTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 25,
    textAlign: 'center',
  },
  proDesc: {
    fontSize: 14,
    color: theme.colors.dim,
    textAlign: 'center',
    lineHeight: 22,
  },
  teamsCard: {
    width: '100%',
    backgroundColor: 'rgba(168,230,207,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(168,230,207,0.2)',
    borderRadius: 18,
    padding: 20,
    gap: 12,
    alignItems: 'center',
  },
  teamsLabel: {
    fontSize: 13,
    color: theme.colors.faint,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  teamsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 24,
    textAlign: 'center',
  },
  teamsSub: {
    fontSize: 13,
    color: theme.colors.dim,
    lineHeight: 20,
    textAlign: 'center',
  },
  teamsBtn: {
    backgroundColor: '#A8E6CF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  teamsBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C0C0C',
  },
  btnGhost: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnGhostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnGhostText: {
    fontSize: 14,
    color: theme.colors.dim,
  },
  privacyLink: {
    fontSize: 12,
    color: theme.colors.faint,
  },
}));
