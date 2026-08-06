import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setCloudGroups } from '../store/appSlice';
import {
  getGroupLeaderboard, getGroupFeed, getGroupStats,
  leaveGroup, loadMyGroups, postGroupCompliment, toggleReaction,
  type GroupMemberInfo, type FeedItem, type GroupStats,
} from '../utils/supabaseGroups';
import { useGroupRealtime } from '../utils/realtimeHooks';
import { todayLocal, localDateString } from '../utils/dates';
import {
  FireIcon, SunflowerIcon, SunIcon, TrophyIcon,
  SparkleIcon, StarIcon, MedalIcon,
} from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

const GROUP_MILESTONES = [
  { days: 10, label: 'First Steps', emoji: '🌱' },
  { days: 50, label: 'Getting Warm', emoji: '☀️' },
  { days: 100, label: 'Century Club', emoji: '💯' },
  { days: 250, label: 'Kindness Squad', emoji: '🌻' },
  { days: 500, label: 'Legendary', emoji: '🌟' },
  { days: 1000, label: 'Hall of Fame', emoji: '🏆' },
];

type Tab = 'feed' | 'leaderboard' | 'members';

export default function GroupDetailScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const params = route.params as { groupId: string; groupName: string };
  const { groupId, groupName } = params;
  const userId = useSelector((s: RootState) => s.app.userId);
  const username = useSelector((s: RootState) => s.app.username);
  const cloudGroups = useSelector((s: RootState) => s.app.cloudGroups ?? []);
  const myGroup = cloudGroups.find(g => g.id === groupId);
  const isAdmin = myGroup?.my_role === 'admin';

  const [tab, setTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [leaderboard, setLeaderboard] = useState<GroupMemberInfo[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [stats, setStats] = useState<GroupStats | null>(null);

  // Compose compliment
  const [showCompose, setShowCompose] = useState(false);
  const [compRecipient, setCompRecipient] = useState('');
  const [compBody, setCompBody] = useState('');
  const [compSending, setCompSending] = useState(false);

  const fetchAll = useCallback(async () => {
    const [lb, fd, st] = await Promise.all([
      getGroupLeaderboard(groupId),
      getGroupFeed(groupId),
      getGroupStats(groupId),
    ]);
    setLeaderboard(lb);
    setFeed(fd);
    setStats(st);
  }, [groupId]);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  // Realtime: any membership/feed/reaction change → refresh immediately.
  // If I was removed from this group, drop my cloudGroups entry and go back.
  useGroupRealtime(
    groupId,
    userId,
    fetchAll,
    async () => {
      const groups = await loadMyGroups();
      dispatch(setCloudGroups(groups));
      showAlert('Removed from group', 'An admin removed you from this group.');
      navigation.goBack();
    },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleLeave = () => {
    showAlert('Leave group?', 'You can rejoin with the invite code.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          const ok = await leaveGroup(groupId);
          if (!ok) {
            // Stay on the screen — navigating back anyway made the user
            // believe they left while their membership row still exists.
            showAlert('Could not leave group', 'Check your connection and try again.');
            return;
          }
          const groups = await loadMyGroups();
          dispatch(setCloudGroups(groups));
          navigation.goBack();
        },
      },
    ]);
  };

  const handleSendCompliment = async () => {
    if (!compRecipient.trim() || !compBody.trim()) {
      showAlert('Fill in both fields');
      return;
    }
    setCompSending(true);
    const ok = await postGroupCompliment(
      groupId, compBody.trim(), compRecipient.trim(), null,
      myGroup?.pinned_challenge ?? null
    );
    setCompSending(false);
    if (ok) {
      setShowCompose(false);
      setCompRecipient('');
      setCompBody('');
      await fetchAll();
    } else {
      showAlert('Error', 'Could not send compliment.');
    }
  };

  const handleComposePress = () => {
    if (!username) {
      showAlert(
        'Username Required',
        'You need a username before you can send compliments.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Username',
            onPress: () => navigation.navigate('SettingsTab', { screen: 'EditProfile' }),
          },
        ]
      );
      return;
    }
    setShowCompose(true);
  };

  const handleReact = async (completionId: string) => {
    await toggleReaction(completionId, '❤️');
    await fetchAll();
  };

  // Combined streak for milestones
  const combinedStreak = stats?.combined_streak ?? 0;
  const achievedMilestones = GROUP_MILESTONES.filter(m => combinedStreak >= m.days);
  const nextMilestone = GROUP_MILESTONES.find(m => m.days > combinedStreak);

  // Compare in LOCAL time on both sides: created_at is a UTC timestamp, so
  // slicing it raw and comparing to a local "today" would drop/keep the
  // wrong rows around local midnight.
  const todayStr = todayLocal();
  const todayFeed = feed.filter(
    f => f.created_at && localDateString(new Date(f.created_at)) === todayStr,
  );
  // MUST be the exact complement of todayFeed. The old EARLIER filter
  // compared the UTC day (created_at.slice(0,10)) against the local
  // todayStr, so an evening item west of UTC passed BOTH filters and
  // rendered twice — once under TODAY and once under EARLIER, with
  // duplicate React keys.
  const earlierFeed = feed.filter(
    f => !(f.created_at && localDateString(new Date(f.created_at)) === todayStr),
  );
  // Pending members joined by code but haven't been approved yet. The
  // backend filters them out of every SELECT except their own row in
  // load_my_groups, so we show a dedicated waiting screen until the
  // admin approves.
  const isPending = myGroup?.my_status === 'pending';

  if (isPending) {
    return (
      <View style={[styles.scroll, { justifyContent: 'center', padding: 32, gap: 20 }]}>
        <Text style={{ fontSize: 44, textAlign: 'center' }}>⏳</Text>
        <Text style={[styles.groupName, { textAlign: 'center' }]}>Waiting for approval</Text>
        <Text style={[styles.subtitle, { textAlign: 'center', lineHeight: 20 }]}>
          You've joined <Text style={{ color: theme.colors.gold }}>{groupName}</Text>. An admin needs
          to approve your membership before you can see the feed, leaderboard, or post compliments.
        </Text>
        <Pressable style={styles.leaveBtn} onPress={handleLeave}>
          <Text style={styles.leaveText}>Cancel & Leave</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { textAlign: 'center' }]}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.subtitle}>
            {stats?.member_count ?? '—'} members · {stats?.today_completions ?? 0} bloomed today
          </Text>
        </View>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      {/* Pinned challenge */}
      {myGroup?.pinned_challenge ? (
        <View style={styles.pinnedCard}>
          <Text style={styles.pinnedLabel}>PINNED CHALLENGE</Text>
          <Text style={styles.pinnedText}>{myGroup.pinned_challenge}</Text>
        </View>
      ) : null}

      {/* Stats row */}
      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <FireIcon size={18} />
          <Text style={styles.statValue}>{combinedStreak}</Text>
          <Text style={styles.statLabel}>combined</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{stats?.total_completions ?? 0}</Text>
          <Text style={styles.statLabel}>total sent</Text>
        </View>
        {nextMilestone && (
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{nextMilestone.emoji}</Text>
            <Text style={styles.statLabel}>{nextMilestone.days - combinedStreak} to go</Text>
          </View>
        )}
      </View>

      {/* Milestones achieved */}
      {achievedMilestones.length > 0 && (
        <View style={styles.milestoneRow}>
          {achievedMilestones.map(m => (
            <View key={m.days} style={styles.milestoneBadge}>
              <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
              <Text style={styles.milestoneLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabRow}>
        {(['feed', 'leaderboard', 'members'] as Tab[]).map(t => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'feed' ? 'Feed' : t === 'leaderboard' ? 'Leaderboard' : 'Members'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={theme.colors.gold} />
        </View>
      )}

      {/* ── Feed Tab ─────────────────────────────────── */}
      {!loading && tab === 'feed' && (
        <>
          <Pressable style={styles.composeBtn} onPress={handleComposePress}>
            <SparkleIcon size={16} color="#0C0C0C" />
            <Text style={styles.composeBtnText}>Send a compliment</Text>
          </Pressable>

          {todayFeed.length === 0 && feed.length === 0 ? (
            <View style={styles.emptyWrap}>
              <SunIcon size={36} />
              <Text style={styles.emptyText}>No compliments yet. Be the first!</Text>
            </View>
          ) : (
            <>
              {todayFeed.length > 0 && (
                <Text style={styles.sectionLabel}>TODAY</Text>
              )}
              {todayFeed.map(f => (
                <FeedCard
                  key={f.id}
                  item={f}
                  userId={userId}
                  onReact={handleReact}
                  styles={styles}
                  theme={theme}
                />
              ))}
              {earlierFeed.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>EARLIER</Text>
                  {earlierFeed.map(f => (
                    <FeedCard
                      key={f.id}
                      item={f}
                      userId={userId}
                      onReact={handleReact}
                      styles={styles}
                      theme={theme}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ── Leaderboard Tab ──────────────────────────── */}
      {!loading && tab === 'leaderboard' && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>STREAK RANKINGS</Text>
          {[...leaderboard]
            .sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))
            .map((m, idx) => {
              const streak = m.streak ?? 0;
              const isTop  = idx < 3 && streak > 0;
              const rankLabel =
                streak <= 0 ? `${idx + 1}.`
                : idx === 0 ? '🥇'
                : idx === 1 ? '🥈'
                : idx === 2 ? '🥉'
                : `${idx + 1}.`;
              return (
                <View key={m.user_id} style={[styles.lbRow, isTop && styles.lbRowTop]}>
                  <Text style={[styles.lbRank, isTop && styles.lbRankTop]}>{rankLabel}</Text>
                  <View style={[styles.lbAvatar, { backgroundColor: m.color }]}>
                    <Text style={styles.lbAvatarText}>{m.display_name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lbName}>{m.display_name}</Text>
                    <Text style={styles.lbMeta}>
                      Best: {m.best_streak}d
                      {m.role === 'admin' ? ' · Admin' : ''}
                    </Text>
                  </View>
                  <View style={styles.lbStreakWrap}>
                    {m.bloomed_today ? <SunflowerIcon size={16} /> : <SunIcon size={16} />}
                    <Text style={styles.lbStreak}>{streak}</Text>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {/* ── Members Tab ──────────────────────────────── */}
      {!loading && tab === 'members' && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>MEMBERS ({leaderboard.length})</Text>
          {leaderboard.map(m => (
            <View key={m.user_id} style={styles.memberRow}>
              <View style={[styles.lbAvatar, { backgroundColor: m.color }]}>
                <Text style={styles.lbAvatarText}>{m.display_name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.display_name}</Text>
                <Text style={styles.memberRole}>
                  {m.role === 'admin' ? 'Admin' : 'Member'}
                  {m.bloomed_today ? ' · Bloomed today' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FireIcon size={14} />
                  <Text style={styles.memberStreak}>{m.streak}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Admin / Leave actions */}
      <View style={styles.actionsSection}>
        {isAdmin && (
          <Pressable
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('GroupSettings', { groupId, groupName })}
          >
            <Text style={styles.settingsBtnText}>Group Settings</Text>
          </Pressable>
        )}
        <Pressable style={styles.leaveBtn} onPress={handleLeave}>
          <Text style={styles.leaveText}>Leave Group</Text>
        </Pressable>
      </View>

      {/* Compose Modal */}
      <Modal visible={showCompose} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.formTitle}>Send a Compliment</Text>
            <Text style={styles.formSubtitle}>
              {myGroup?.pinned_challenge
                ? `Theme: ${myGroup.pinned_challenge}`
                : 'Lift someone up in your group'}
            </Text>

            {/* Recipient picker from members */}
            <View style={styles.inputGroup}>
              <Text style={styles.labelDim}>TO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {leaderboard
                    .filter(m => m.user_id !== userId)
                    .map(m => (
                      <Pressable
                        key={m.user_id}
                        style={[
                          styles.recipientChip,
                          compRecipient === m.display_name && styles.recipientChipActive,
                        ]}
                        onPress={() => setCompRecipient(m.display_name)}
                      >
                        <View style={[styles.chipAvatar, { backgroundColor: m.color }]}>
                          <Text style={styles.chipAvatarText}>{m.display_name?.charAt(0)?.toUpperCase()}</Text>
                        </View>
                        <Text style={[
                          styles.chipName,
                          compRecipient === m.display_name && styles.chipNameActive,
                        ]}>{m.display_name}</Text>
                      </Pressable>
                    ))}
                </View>
              </ScrollView>
              {leaderboard.filter(m => m.user_id !== userId).length === 0 && (
                <Text style={styles.noMembersHint}>No other members in this group yet.</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.labelDim}>YOUR COMPLIMENT</Text>
              <TextInput
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                placeholder="Write something kind..."
                placeholderTextColor={theme.colors.faint}
                value={compBody}
                onChangeText={setCompBody}
                multiline
                maxLength={500}
              />
            </View>

            <View style={styles.formActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => { setShowCompose(false); setCompRecipient(''); setCompBody(''); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.sendBtn, { opacity: compSending ? 0.6 : 1 }]}
                onPress={handleSendCompliment}
                disabled={compSending}
              >
                {compSending ? (
                  <ActivityIndicator size="small" color="#0C0C0C" />
                ) : (
                  <Text style={styles.sendBtnText}>Send</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ── Feed Card Component ─────────────────────────────────────
function FeedCard({
  item, userId, onReact, styles, theme,
}: {
  item: FeedItem;
  userId: string | null;
  onReact: (id: string) => void;
  styles: any;
  theme: any;
}) {
  const reactions = item.reactions ?? [];
  const heartCount = reactions.filter(r => r.emoji === '❤️').length;
  const iReacted = reactions.some(r => r.emoji === '❤️' && r.user_id === userId);
  const time = item.created_at
    ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <View style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <View style={[styles.feedAvatar, { backgroundColor: item.color }]}>
          <Text style={styles.feedAvatarText}>{item.display_name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedName}>
            {item.display_name} <Text style={styles.feedAction}>lifted {item.recipient_name}</Text>
          </Text>
          <Text style={styles.feedTime}>{time}</Text>
        </View>
        <SunflowerIcon size={18} />
      </View>

      {item.prompt ? (
        <Text style={styles.feedPrompt}>{item.prompt}</Text>
      ) : null}

      <View style={styles.feedQuoteWrap}>
        <Text style={styles.feedQuote}>"{item.body}"</Text>
      </View>

      {/* Reaction bar */}
      <View style={styles.reactionRow}>
        <Pressable
          style={[styles.reactionBtn, iReacted && styles.reactionBtnActive]}
          onPress={() => onReact(item.id)}
        >
          <Text style={styles.reactionEmoji}>❤️</Text>
          {heartCount > 0 && <Text style={styles.reactionCount}>{heartCount}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  groupName: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.faint, marginTop: 2 },
  back: { color: theme.colors.faint, fontSize: 14 },

  // Pinned challenge
  pinnedCard: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  pinnedLabel: { fontSize: 10, letterSpacing: 2, color: theme.colors.gold, fontWeight: '600' },
  pinnedText: { fontSize: 14, color: theme.colors.text, fontStyle: 'italic' },

  // Stats
  statRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    flex: 1,
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.md,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.gold },
  statLabel: { fontSize: 10, color: theme.colors.faint },

  // Milestones
  milestoneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  milestoneEmoji: { fontSize: 14 },
  milestoneLabel: { fontSize: 11, color: theme.colors.gold, fontWeight: '600' },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
  },
  tabActive: {
    backgroundColor: theme.colors.goldCardBg,
    borderColor: theme.colors.goldCardBord,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.faint },
  tabTextActive: { color: theme.colors.gold },

  loadingWrap: { paddingVertical: 32, alignItems: 'center' },

  // Feed
  composeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
  },
  composeBtnText: { fontSize: 15, fontWeight: '700', color: '#0C0C0C' },

  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.faint,
    fontWeight: '600',
    marginTop: 4,
  },

  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.faint },

  feedCard: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.md,
    padding: 14,
    gap: 8,
  },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  feedAvatarText: { fontSize: 13, fontWeight: '700', color: '#0D0D0D' },
  feedName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  feedAction: { fontWeight: '400', color: theme.colors.faint },
  feedTime: { fontSize: 11, color: theme.colors.faint },
  feedPrompt: { fontSize: 12, color: theme.colors.faint, fontStyle: 'italic' },
  feedQuoteWrap: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(245,200,66,0.3)',
    paddingLeft: 12,
  },
  feedQuote: { fontSize: 14, color: theme.colors.dim, fontStyle: 'italic', lineHeight: 22 },

  // Reactions
  reactionRow: { flexDirection: 'row', gap: 8 },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(255,100,100,0.12)',
    borderColor: 'rgba(255,100,100,0.3)',
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: theme.colors.dim },

  // Leaderboard
  card: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 12,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    marginVertical: 2,
  },
  lbRowTop: {
    backgroundColor: 'rgba(245,200,66,0.06)',
    borderColor: 'rgba(245,200,66,0.30)',
  },
  lbRank: { fontSize: 14, fontWeight: '700', width: 28, textAlign: 'center', color: theme.colors.faint },
  lbRankTop: { fontSize: 18, color: theme.colors.gold },
  lbAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  lbAvatarText: { fontSize: 14, fontWeight: '700', color: '#0D0D0D' },
  lbName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  lbMeta: { fontSize: 11, color: theme.colors.faint, marginTop: 1 },
  lbStreakWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lbStreak: { fontSize: 18, fontWeight: '700', color: theme.colors.gold },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bord,
  },
  memberName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  memberRole: { fontSize: 11, color: theme.colors.faint, marginTop: 1 },
  memberStreak: { fontSize: 16, fontWeight: '700', color: theme.colors.gold },

  // Actions
  actionsSection: { gap: 10, marginTop: 8 },
  settingsBtn: {
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    backgroundColor: theme.colors.goldCardBg,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  settingsBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.gold },
  leaveBtn: {
    borderWidth: 1,
    borderColor: theme.colors.dangerBord,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  leaveText: { fontSize: 13, color: theme.colors.dangerText },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  formSubtitle: { fontSize: 13, color: theme.colors.faint, marginTop: -8 },
  inputGroup: { gap: 8 },
  labelDim: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: theme.colors.faint },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBord,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  placeholder: { color: theme.colors.faint },

  // Recipient chips
  recipientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  recipientChipActive: {
    borderColor: theme.colors.goldCardBord,
    backgroundColor: theme.colors.goldCardBg,
  },
  chipAvatar: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  chipAvatarText: { fontSize: 10, fontWeight: '700', color: '#0D0D0D' },
  chipName: { fontSize: 12, color: theme.colors.dim },
  chipNameActive: { color: theme.colors.gold },
  noMembersHint: { fontSize: 13, color: theme.colors.faint, fontStyle: 'italic' },

  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, color: theme.colors.dim },
  sendBtn: {
    flex: 2,
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#0C0C0C' },
}));
