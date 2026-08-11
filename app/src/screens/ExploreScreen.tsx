// ── Explore — browse kindness ideas ──────────────────────────────
//
// A calm, browsable library: category chips on top, warm cards below.
// Deliberately NOT a checklist — no checkboxes, no progress bars, no
// "3 of 40 complete." Each card is an invitation; "I did this" drops
// into the same completion moment as everywhere else.

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, FlatList } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import {
  KINDNESS_ACTIONS,
  EXPLORE_CATEGORIES,
  CATEGORY_META,
  type KindnessAction,
  type KindnessCategory,
} from '../data/kindness';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ExploreScreen({ navigation }: Props) {
  const { styles } = useStyles(stylesheet);
  const [selected, setSelected] = useState<KindnessCategory | 'all'>('all');

  const actions = useMemo<KindnessAction[]>(
    () => (selected === 'all'
      ? KINDNESS_ACTIONS
      : KINDNESS_ACTIONS.filter(a => a.category === selected)),
    [selected],
  );

  const startAct = (act: KindnessAction) => {
    if (act.isCompliment) {
      navigation.navigate('Brief');
    } else {
      navigation.navigate('KindnessDone', { actionId: act.id, source: 'explore' });
    }
  };

  const renderItem = ({ item }: { item: KindnessAction }) => {
    const effortHint = item.minutes <= 2 ? 'takes a minute' : `~${item.minutes} min`;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardMeta}>⏱ {effortHint}</Text>
          <Pressable style={styles.didItBtn} onPress={() => startAct(item)}>
            <Text style={styles.didItText}>
              {item.isCompliment ? '🌻 Write it' : 'I did this'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Ways to be kind</Text>
        <Text style={styles.sub}>
          Pick anything that fits your day. Small counts.
        </Text>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            onPress={() => setSelected('all')}
            style={[styles.chip, selected === 'all' && styles.chipActive]}
          >
            <Text style={[styles.chipText, selected === 'all' && styles.chipTextActive]}>✨ All</Text>
          </Pressable>
          {EXPLORE_CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat];
            const active = selected === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelected(active ? 'all' : cat)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {meta.emoji} {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={actions}
        keyExtractor={a => a.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Pressable
            style={styles.customCard}
            onPress={() => navigation.navigate('KindnessDone', { custom: true, source: 'custom' })}
          >
            <Text style={styles.customEmoji}>✍️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Did something else?</Text>
              <Text style={styles.cardDesc}>Log a kindness in your own words — anything counts.</Text>
            </View>
          </Pressable>
        }
      />
    </View>
  );
}

const stylesheet = createStyleSheet(theme => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  back: {
    color: theme.colors.faint,
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sub: {
    fontSize: 14,
    color: theme.colors.dim,
    lineHeight: 21,
  },
  chipRow: {
    paddingHorizontal: 24,
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: theme.colors.goldCardBg,
    borderColor: theme.colors.goldCardBord,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.dim,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.colors.gold,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    gap: 12,
  },
  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.greenBadgeBg,
    borderWidth: 1,
    borderColor: theme.colors.greenBadgeBord,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  customEmoji: {
    fontSize: 22,
  },
  card: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 21,
  },
  cardDesc: {
    fontSize: 13,
    color: theme.colors.dim,
    lineHeight: 20,
    marginTop: 4,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 11,
    color: theme.colors.faint,
  },
  didItBtn: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: theme.radius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  didItText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.gold,
  },
}));
