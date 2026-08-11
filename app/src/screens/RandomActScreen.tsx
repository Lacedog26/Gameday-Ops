// ── Random Act — "Give me an idea" ───────────────────────────────
//
// The zero-friction inspiration surface: one idea at a time, a big
// "Another one" button, and an "I did this" that drops straight into
// the completion moment. Compliment ideas route into the existing
// Brief → Write → Bloom flow instead.

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { getKindnessAction, getRandomKindness, CATEGORY_META, type KindnessAction } from '../data/kindness';
import { SunflowerIcon } from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export default function RandomActScreen({ navigation, route }: Props) {
  const { styles } = useStyles(stylesheet);
  const params = (route.params ?? {}) as { initialId?: string };

  const initial = useMemo<KindnessAction>(() => {
    if (params.initialId) {
      const fromParam = getKindnessAction(params.initialId);
      if (fromParam) return fromParam;
    }
    return getRandomKindness();
  }, [params.initialId]);

  const [act, setAct] = useState<KindnessAction>(initial);
  // Track recently shown ideas so "Another one" doesn't repeat until the
  // pool runs dry. Keeps the button feeling generous, not glitchy.
  const seenRef = useRef<string[]>([initial.id]);
  // Key bump re-triggers the entrance animation on each new idea.
  const [ideaKey, setIdeaKey] = useState(0);

  const anotherOne = () => {
    const next = getRandomKindness(seenRef.current);
    seenRef.current = [...seenRef.current, next.id].slice(-Math.max(4, seenRef.current.length + 1));
    setAct(next);
    setIdeaKey(k => k + 1);
  };

  const doIt = () => {
    if (act.isCompliment) {
      navigation.replace('Brief');
      return;
    }
    navigation.replace('KindnessDone', { actionId: act.id, source: 'random' });
  };

  const cat = CATEGORY_META[act.category];
  const effortHint = act.minutes <= 2 ? 'takes a minute' : `~${act.minutes} min`;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backWrap}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      <View style={styles.centerWrap}>
        <Text style={styles.kicker}>SOMEONE OUT THERE COULD USE THIS</Text>
        <Animated.View key={ideaKey} entering={FadeInDown.duration(300)} style={styles.ideaCard}>
          <Text style={styles.ideaEmoji}>{act.emoji}</Text>
          <Text style={styles.ideaTitle}>{act.title}</Text>
          <Text style={styles.ideaDescription}>{act.description}</Text>
          <View style={styles.metaRow}>
            {cat && <Text style={styles.metaChip}>{cat.emoji} {cat.label}</Text>}
            <Text style={styles.metaChip}>⏱ {effortHint}</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={doIt}>
          <View style={styles.btnRow}>
            <Text style={styles.primaryBtnText}>
              {act.isCompliment ? 'Give the compliment' : 'I did this'}
            </Text>
            <SunflowerIcon size={18} />
          </View>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={anotherOne}>
          <Text style={styles.secondaryBtnText}>🎲 Another one</Text>
        </Pressable>
      </View>
    </View>
  );
}

const stylesheet = createStyleSheet(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: 24,
    paddingTop: 12,
  },
  backWrap: {
    paddingVertical: 4,
  },
  back: {
    color: theme.colors.faint,
    fontSize: 14,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: theme.colors.faint,
    fontWeight: '600',
    textAlign: 'center',
  },
  ideaCard: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: theme.radius.xl,
    padding: 26,
    alignItems: 'center',
    gap: 14,
  },
  ideaEmoji: {
    fontSize: 44,
  },
  ideaTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 30,
  },
  ideaDescription: {
    fontSize: 15,
    color: theme.colors.dim,
    textAlign: 'center',
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    fontSize: 11,
    color: theme.colors.faint,
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
}));
