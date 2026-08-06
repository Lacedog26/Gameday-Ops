import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput, Keyboard } from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  loadTeamDashboard, moderateCompletion, submitTeamCompletion, loadTeamParticipation,
  loadTeamDailyPrompt,
  TeamDashboard, TeamCompletion, TeamMember, TeamParticipation,
} from '../utils/supabase';
import { useTeamRealtime } from '../utils/realtimeHooks';
import { resolveChallenge } from '../data/challenges';
import { SunflowerIcon, SunIcon, FireIcon } from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

type TabType = 'dashboard' | 'feed' | 'moderation' | 'participation';

export default function TeamDetailScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const teamId = (route.params as any)?.teamId as string;
  const userId = useSelector((s: RootState) => s.app.userId);
  const todayChallenge = useSelector((s: RootState) => s.app.todayChallenge);
  // Team-level approval status comes from load_my_teams (exposed as team_status).
  // get_team_dashboard doesn't include this field, so read it from Redux instead.
  const teamFromList = useSelector((s: RootState) => s.app.teams.find(t => t.id === teamId));
  const teamApprovalStatus = teamFromList?.team_status;
  const teamRejectionReason = teamFromList?.team_rejection_reason ?? null;

  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('dashboard');
  const [participation, setParticipation] = useState<TeamParticipation[]>([]);
  const [teamPrompt, setTeamPrompt] = useState<{ id: string; prompt_text: string } | null>(null);

  // Teacher/admin quick post
  const [showPostForm, setShowPostForm] = useState(false);
  const [postRecipient, setPostRecipient] = useState('');
  const [postBody, setPostBody] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadTeamDashboard(teamId);
    setDashboard(data);
    // Load team-specific prompt
    const prompt = await loadTeamDailyPrompt(teamId);
    setTeamPrompt(prompt);
    setLoading(false);
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh on any team change; bounce out if I was removed.
  useTeamRealtime(
    teamId,
    userId,
    load,
    () => {
      showAlert('Removed from team', 'An admin removed you from this team.');
      navigation.goBack();
    },
  );

  // Load participation when tab switches
  useEffect(() => {
    if (tab === 'participation' && dashboard) {
      loadTeamParticipation(teamId, 7).then(setParticipation);
    }
  }, [tab, teamId]);

  if (!dashboard) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>{loading ? 'Loading...' : 'Team not found'}</Text>
      </View>
    );
  }

  const team = dashboard.team;
  const members = dashboard.members ?? [];
  const feed = dashboard.feed ?? [];
  const pending = dashboard.pending ?? [];
  const stats = dashboard.stats ?? { member_count: 0, today_completions: 0, total_completions: 0, completion_rate: 0, pending_count: 0 };
  const teamStreak = dashboard.team_streak;
  const isAdmin = team.my_role === 'admin' || team.my_role === 'moderator';
  const isSchool = team.team_type === 'school';
  const isOrg = team.team_type === 'organization';
  const showModeration = isAdmin && (isSchool || pending.length > 0);
  // Team-level approval gate: block the whole UI if the team itself
  // hasn't been approved by a super_admin yet.
  if (teamApprovalStatus === 'pending') {
    return (
      <View style={[styles.scroll, { justifyContent: 'center', padding: 32, gap: 20 }]}>
        <Text style={{ fontSize: 44, textAlign: 'center' }}>⏳</Text>
        <Text style={[styles.teamName, { textAlign: 'center' }]}>Team pending approval</Text>
        <Text style={{ fontSize: 14, color: theme.colors.faint, textAlign: 'center', lineHeight: 20 }}>
          <Text style={{ color: theme.colors.gold }}>{team.name}</Text> is waiting for a OneCompliment
          admin to approve it. Once approved, you'll be able to invite members and post.
        </Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { textAlign: 'center' }]}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  if (teamApprovalStatus === 'rejected') {
    return (
      <View style={[styles.scroll, { justifyContent: 'center', padding: 32, gap: 20 }]}>
        <Text style={{ fontSize: 44, textAlign: 'center' }}>🚫</Text>
        <Text style={[styles.teamName, { textAlign: 'center' }]}>Team not approved</Text>
        <Text style={{ fontSize: 14, color: theme.colors.faint, textAlign: 'center', lineHeight: 20 }}>
          {teamRejectionReason
            ? `Reason: ${teamRejectionReason}`
            : 'This team wasn\'t approved. Contact support if you think this is a mistake.'}
        </Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { textAlign: 'center' }]}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  // Pending members joined by code but haven't been approved yet.
  const isPending = team.my_status === 'pending';

  if (isPending) {
    return (
      <View style={[styles.scroll, { justifyContent: 'center', padding: 32, gap: 20 }]}>
        <Text style={{ fontSize: 44, textAlign: 'center' }}>⏳</Text>
        <Text style={[styles.teamName, { textAlign: 'center' }]}>Waiting for approval</Text>
        <Text style={{ fontSize: 14, color: theme.colors.faint, textAlign: 'center', lineHeight: 20 }}>
          You've joined <Text style={{ color: theme.colors.gold }}>{team.name}</Text>. An admin needs
          to approve your membership before you can see the feed or post.
        </Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { textAlign: 'center' }]}>← Back</Text>
        </Pressable>
      </View>
    );
  }
  // A team is "active" only while a paid subscription is current.
  // Members are blocked from posting / joining / accepting invites until
  // an admin subscribes; admins can still configure the team.
  const isTeamActive =
    dashboard.subscription?.status === 'active' &&
    (!dashboard.subscription.current_period_end ||
      new Date(dashboard.subscription.current_period_end).getTime() > Date.now());
  // When inactive, NOBODY can post — not even admins. Admins must first
  // subscribe (Team Settings → Subscription). This is enforced in every
  // write RPC on the server too.
  const canPost = isTeamActive;

  // Resolve the active prompt: team custom > global
  const activePrompt = teamPrompt?.prompt_text ?? resolveChallenge(todayChallenge).prompt;

  const handleModerate = async (id: string, action: 'approve' | 'reject') => {
    try {
      await moderateCompletion(id, action, action === 'reject' ? 'Content not appropriate' : undefined);
      load();
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  const handleTeacherPost = async () => {
    if (!postBody.trim() || !postRecipient.trim()) return;
    Keyboard.dismiss();
    setPosting(true);
    try {
      const result = await submitTeamCompletion(teamId, postBody.trim(), postRecipient.trim(), activePrompt);
      if ('error' in result) {
        showAlert('Error', result.error);
      } else {
        setPostBody('');
        setPostRecipient('');
        setShowPostForm(false);
        load();
      }
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setPosting(false);
    }
  };

  // Build tab list based on team type and role
  const tabs: { key: TabType; label: string }[] = [
    { key: 'dashboard', label: 'Leaderboard' },
    { key: 'feed', label: 'Feed' },
  ];

  // Leaderboard: rank members by current streak descending. Members with no
  // streak still appear at the bottom so the tab also serves as a directory.
  const rankedMembers = [...members].sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0));
  const rankLabel = (idx: number, streak: number) => {
    if (streak <= 0) return `#${idx + 1}`;
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };
  if (showModeration) {
    tabs.push({ key: 'moderation', label: `Review (${pending.length})` });
  }
  if (isAdmin) {
    tabs.push({ key: 'participation', label: 'Insights' });
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.gold} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        {isAdmin && (
          <Pressable onPress={() => navigation.navigate('TeamSettings', { teamId })}>
            <Text style={styles.settingsBtn}>⚙️</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.teamType}>
          {isSchool ? '🏫' : isOrg ? '🏢' : '🏠'}{' '}
          {team.team_type.toUpperCase()}
        </Text>
        <Text style={styles.teamName}>{team.name}</Text>
        {team.description ? <Text style={styles.teamDesc}>{team.description}</Text> : null}
      </View>

      {/* Inactive-team notice — shown to everyone whenever there's no
          active paid subscription. Admins and members are BOTH blocked
          from every write action. Admins get a tappable CTA that deep-
          links to the subscription screen so they can unlock the team. */}
      {!isTeamActive && (
        <Pressable
          style={styles.lockedBanner}
          onPress={() => isAdmin && navigation.navigate('TeamSettings', { teamId })}
          disabled={!isAdmin}
        >
          <Text style={styles.lockedBannerTitle}>
            🔒 This team is inactive
          </Text>
          <Text style={styles.lockedBannerBody}>
            {isAdmin
              ? 'Tap here to activate a plan. No one — including you — can post, invite, approve members, or change settings until a subscription is active.'
              : 'No actions are available until an admin activates a subscription.'}
          </Text>
        </Pressable>
      )}

      {/* Stats — includes team streak */}
      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{stats.member_count}</Text>
          <Text style={styles.statLabel}>members</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{stats.today_completions}</Text>
          <Text style={styles.statLabel}>bloomed today</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{stats.completion_rate}%</Text>
          <Text style={styles.statLabel}>today's rate</Text>
        </View>
      </View>

      {/* Team collective streak */}
      {teamStreak && teamStreak.current_streak > 0 && (
        <View style={styles.teamStreakCard}>
          <FireIcon size={24} />
          <View>
            <Text style={styles.teamStreakValue}>
              {teamStreak.current_streak} day team streak
            </Text>
            <Text style={styles.teamStreakSub}>
              Everyone bloomed {teamStreak.current_streak} day{teamStreak.current_streak !== 1 ? 's' : ''} in a row
              {teamStreak.longest_streak > teamStreak.current_streak ? ` · Best: ${teamStreak.longest_streak}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Daily theme / team prompt */}
      <View style={styles.themeCard}>
        <Text style={styles.themeLabel}>
          {teamPrompt ? 'TEAM CHALLENGE' : team.daily_theme ? "TODAY'S FOCUS" : "TODAY'S COMPLIMENT"}
        </Text>
        <Text style={styles.themeText}>{team.daily_theme || activePrompt}</Text>
      </View>

      {/* Quick post button — any team member can post a compliment.
          Schools with require_approval send non-admin posts to the moderation queue.
          When no active subscription, only admins can post. */}
      {canPost ? (
        <Pressable style={styles.postBtn} onPress={() => setShowPostForm(!showPostForm)}>
          <Text style={styles.postBtnText}>
            {showPostForm
              ? '✕ Cancel'
              : (isAdmin && isSchool) ? '✍️ Post as Teacher' : '✍️ Post a Compliment'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.inactiveBanner}>
          <Text style={styles.inactiveBannerText}>
            This team isn't active yet. Ask an admin to activate a subscription.
          </Text>
        </View>
      )}

      {/* Quick post form */}
      {showPostForm && (
        <View style={styles.postForm}>
          <Text style={styles.recipientLabel}>TO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {members
                .filter(m => m.user_id !== userId)
                .map(m => (
                  <Pressable
                    key={m.user_id}
                    style={[
                      styles.recipientChip,
                      postRecipient === m.display_name && styles.recipientChipActive,
                    ]}
                    onPress={() => setPostRecipient(m.display_name)}
                  >
                    <View style={[styles.chipAvatar, { backgroundColor: m.color }]}>
                      <Text style={styles.chipAvatarText}>{m.display_name?.charAt(0)?.toUpperCase()}</Text>
                    </View>
                    <Text style={[
                      styles.chipName,
                      postRecipient === m.display_name && styles.chipNameActive,
                    ]}>{m.display_name}</Text>
                  </Pressable>
                ))}
            </View>
          </ScrollView>
          {members.filter(m => m.user_id !== userId).length === 0 && (
            <Text style={styles.noMembersHint}>No other members in this team yet.</Text>
          )}
          <TextInput
            style={[styles.postInput, styles.postTextarea]}
            placeholder="Write your compliment..."
            placeholderTextColor={theme.colors.faint}
            value={postBody}
            onChangeText={setPostBody}
            maxLength={280}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.btn, (!postBody.trim() || !postRecipient.trim() || posting) && styles.btnDisabled]}
            onPress={handleTeacherPost}
            disabled={!postBody.trim() || !postRecipient.trim() || posting}
          >
            <Text style={styles.btnText}>{posting ? 'Posting...' : 'Post'}</Text>
          </Pressable>
        </View>
      )}

      {/* Tab selector */}
      <View style={styles.tabs}>
        {tabs.map(t => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Leaderboard tab — members ranked by current streak */}
      {tab === 'dashboard' && (
        <View style={styles.sectionGap}>
          {rankedMembers.map((m: TeamMember, idx: number) => {
            const streak = m.streak ?? 0;
            const isTop  = idx < 3 && streak > 0;
            return (
              <View key={m.user_id} style={[styles.memberRow, isTop && styles.memberRowTop]}>
                <Text style={[styles.rankBadge, isTop && styles.rankBadgeTop]}>
                  {rankLabel(idx, streak)}
                </Text>
                <View style={[styles.avatar, { backgroundColor: m.color }]}>
                  <Text style={styles.avatarText}>{m.display_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{m.display_name}</Text>
                    {m.role === 'admin' && <Text style={styles.roleBadge}>ADMIN</Text>}
                    {m.role === 'moderator' && <Text style={styles.modBadge}>MOD</Text>}
                    {m.muted && <Text style={styles.mutedBadge}>MUTED</Text>}
                  </View>
                  <Text style={styles.memberMeta}>
                    {streak} day streak · {m.bloomed_today ? '🌻 Bloomed' : '☀️ Not yet'}
                  </Text>
                </View>
                {m.bloomed_today ? <SunflowerIcon size={20} /> : <SunIcon size={20} />}
              </View>
            );
          })}
        </View>
      )}

      {/* Feed tab */}
      {tab === 'feed' && (
        <View style={styles.sectionGap}>
          {feed.length === 0 ? (
            <Text style={styles.emptyText}>
              {isSchool && !team.shared_visibility && team.my_role === 'member'
                ? 'Your teacher has not enabled shared visibility yet.'
                : 'No compliments yet today. Be the first!'}
            </Text>
          ) : (
            feed.map((c: TeamCompletion) => (
              <View key={c.id} style={styles.feedCard}>
                <View style={styles.feedHeader}>
                  <View style={[styles.avatarSm, { backgroundColor: c.color }]}>
                    <Text style={styles.avatarSmText}>{c.display_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.feedName}>{c.display_name}</Text>
                  <Text style={styles.feedTime}>
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.feedTo}>To: {c.recipient_name}</Text>
                <Text style={styles.feedBody}>"{c.body}"</Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* Moderation tab */}
      {tab === 'moderation' && isAdmin && (
        <View style={styles.sectionGap}>
          {pending.length === 0 ? (
            <Text style={styles.emptyText}>No pending submissions to review.</Text>
          ) : (
            pending.map((c: TeamCompletion) => (
              <View key={c.id} style={styles.moderationCard}>
                <View style={styles.feedHeader}>
                  <View style={[styles.avatarSm, { backgroundColor: c.color }]}>
                    <Text style={styles.avatarSmText}>{c.display_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.feedName}>{c.display_name}</Text>
                </View>
                <Text style={styles.feedTo}>To: {c.recipient_name}</Text>
                <Text style={styles.feedBody}>"{c.body}"</Text>
                <View style={styles.moderationActions}>
                  <Pressable style={styles.approveBtn} onPress={() => handleModerate(c.id, 'approve')}>
                    <Text style={styles.approveBtnText}>✓ Approve</Text>
                  </Pressable>
                  <Pressable style={styles.rejectBtn} onPress={() => handleModerate(c.id, 'reject')}>
                    <Text style={styles.rejectBtnText}>✕ Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Participation / Insights tab (admin only) */}
      {tab === 'participation' && isAdmin && (
        <View style={styles.sectionGap}>
          <Text style={styles.insightsTitle}>7-Day Participation</Text>
          {participation.length === 0 ? (
            <Text style={styles.emptyText}>Loading participation data...</Text>
          ) : (
            participation.map((p: TeamParticipation) => {
              const rate = Math.round((p.active_days / 7) * 100);
              return (
                <View key={p.user_id} style={styles.participationRow}>
                  <View style={[styles.avatarSm, { backgroundColor: p.color }]}>
                    <Text style={styles.avatarSmText}>{p.display_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{p.display_name}</Text>
                      {p.muted && <Text style={styles.mutedBadge}>MUTED</Text>}
                    </View>
                    <Text style={styles.participationMeta}>
                      {p.active_days}/7 days · {p.recent_completions} submissions · {p.streak} streak
                    </Text>
                  </View>
                  <View style={styles.rateContainer}>
                    <Text style={[styles.rateText, rate >= 70 ? styles.rateGood : rate >= 40 ? styles.rateOk : styles.rateLow]}>
                      {rate}%
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 20 },
  center: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.faint, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: theme.colors.faint, fontSize: 14 },
  settingsBtn: { fontSize: 22 },
  titleRow: { gap: 6 },
  teamType: { fontSize: 11, letterSpacing: 1.5, color: theme.colors.faint },
  teamName: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  teamDesc: { fontSize: 14, color: theme.colors.dim, lineHeight: 22 },
  statRow: { flexDirection: 'row', gap: 10 },
  statPill: {
    flex: 1, backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.gold },
  statLabel: { fontSize: 10, color: theme.colors.faint, marginTop: 4 },
  teamStreakCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,107,107,0.06)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.15)',
    borderRadius: 14, padding: 16,
  },
  teamStreakValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  teamStreakSub: { fontSize: 12, color: theme.colors.faint, marginTop: 2 },
  themeCard: {
    backgroundColor: theme.colors.goldCardBg, borderWidth: 1, borderColor: theme.colors.goldCardBord,
    borderRadius: 14, padding: 16, gap: 6,
  },
  themeLabel: { fontSize: 10, letterSpacing: 2, color: theme.colors.gold, fontWeight: '600' },
  themeText: { fontSize: 16, fontWeight: '700', color: theme.colors.text, lineHeight: 22 },
  postBtn: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  inactiveBanner: {
    backgroundColor: 'rgba(255,179,71,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,179,71,0.25)',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  inactiveBannerText: {
    fontSize: 13, color: theme.colors.dim, lineHeight: 18, textAlign: 'center',
  },
  lockedBanner: {
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.28)',
    borderRadius: 14, padding: 16, gap: 6,
  },
  lockedBannerTitle: {
    fontSize: 14, fontWeight: '700', color: '#FF8B94',
  },
  lockedBannerBody: {
    fontSize: 13, color: theme.colors.dim, lineHeight: 18,
  },
  postBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.dim },
  postForm: { gap: 10 },
  postInput: {
    backgroundColor: theme.colors.inputBg, borderWidth: 1, borderColor: theme.colors.inputBord,
    borderRadius: 12, padding: 14, fontSize: 15, color: theme.colors.text,
  },
  postTextarea: { minHeight: 90, lineHeight: 24 },
  recipientLabel: { fontSize: 10, letterSpacing: 2, color: theme.colors.faint, fontWeight: '600' },
  recipientChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10,
  },
  recipientChipActive: { backgroundColor: theme.colors.goldCardBg, borderColor: theme.colors.goldCardBord },
  chipAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chipAvatarText: { fontSize: 10, fontWeight: '700', color: '#0D0D0D' },
  chipName: { fontSize: 12, color: theme.colors.dim },
  chipNameActive: { color: theme.colors.gold },
  noMembersHint: { fontSize: 13, color: theme.colors.faint, fontStyle: 'italic' },
  btn: { backgroundColor: theme.colors.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.38 },
  btnText: { color: '#0C0C0C', fontSize: 15, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, backgroundColor: theme.colors.surf,
    borderWidth: 1, borderColor: theme.colors.bord,
  },
  tabActive: { backgroundColor: theme.colors.goldCardBg, borderColor: theme.colors.goldCardBord },
  tabText: { fontSize: 12, color: theme.colors.faint, fontWeight: '600' },
  tabTextActive: { color: theme.colors.gold },
  sectionGap: { gap: 12 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 12, padding: 14,
  },
  memberRowTop: {
    backgroundColor: 'rgba(245,200,66,0.06)',
    borderColor: 'rgba(245,200,66,0.30)',
  },
  rankBadge: {
    width: 32, textAlign: 'center',
    fontSize: 14, fontWeight: '700', color: theme.colors.faint,
  },
  rankBadgeTop: {
    fontSize: 18,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#0D0D0D' },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  roleBadge: {
    fontSize: 9, letterSpacing: 1, color: theme.colors.gold,
    backgroundColor: 'rgba(245,200,66,0.12)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  modBadge: {
    fontSize: 9, letterSpacing: 1, color: '#C3B1E1',
    backgroundColor: 'rgba(195,177,225,0.12)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  mutedBadge: {
    fontSize: 9, letterSpacing: 1, color: 'rgba(255,100,100,0.7)',
    backgroundColor: 'rgba(255,100,100,0.10)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  memberMeta: { fontSize: 12, color: theme.colors.faint, marginTop: 2 },
  feedCard: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, padding: 16, gap: 8,
  },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarSm: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { fontSize: 11, fontWeight: '700', color: '#0D0D0D' },
  feedName: { fontSize: 13, fontWeight: '700', color: theme.colors.text, flex: 1 },
  feedTime: { fontSize: 11, color: theme.colors.faint },
  feedTo: { fontSize: 12, color: theme.colors.faint },
  feedBody: { fontSize: 15, fontStyle: 'italic', color: theme.colors.dim, lineHeight: 24 },
  emptyText: { fontSize: 14, color: theme.colors.faint, textAlign: 'center', paddingVertical: 20 },
  moderationCard: {
    backgroundColor: 'rgba(245,200,66,0.06)', borderWidth: 1, borderColor: 'rgba(245,200,66,0.18)',
    borderRadius: 14, padding: 16, gap: 8,
  },
  moderationActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveBtn: {
    flex: 1, backgroundColor: '#A8E6CF', borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#0C0C0C' },
  rejectBtn: {
    flex: 1, backgroundColor: 'rgba(255,100,100,0.15)', borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.25)', borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,100,100,0.8)' },
  insightsTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  participationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 12, padding: 12,
  },
  participationMeta: { fontSize: 11, color: theme.colors.faint, marginTop: 2 },
  rateContainer: { paddingHorizontal: 8 },
  rateText: { fontSize: 16, fontWeight: '700' },
  rateGood: { color: '#4ECDC4' },
  rateOk: { color: '#FFB347' },
  rateLow: { color: '#FF6B6B' },
}));
