import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, RefreshControl } from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setTeams } from '../store/appSlice';
import { loadMyTeams, joinTeam, loadMyInvitations, acceptInvitation, declineInvitation, Team, Invitation } from '../utils/supabase';
import { useMyMembershipRealtime } from '../utils/realtimeHooks';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = { navigation: NativeStackNavigationProp<any>; route: RouteProp<any> };

const INVITE_BASE_URL = 'https://onecompliment.app/join';

function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').filter(Boolean);
    return parts[parts.length - 1].toUpperCase();
  }
  return trimmed.toUpperCase();
}

const TYPE_ICON: Record<string, string> = { school: '🏫', organization: '🏢', general: '🏠' };

function InviteCard({ inv, username, hasEmail, onLinkEmail, onAccepted, onDeclined, styles, theme: _theme }: {
  inv: Invitation; username: string | null;
  hasEmail: boolean;
  onLinkEmail: () => void;
  onAccepted: () => void; onDeclined: () => void;
  styles: any; theme: any;
}) {
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    if (!username) {
      showAlert('Username required', 'Pick a username first in Settings — that\'s what teammates will see.');
      return;
    }
    if (!hasEmail) {
      // Same gate as create_team / create_group — teammate memberships
      // need a stable identity that survives session loss.
      showAlert(
        'Link an email first',
        'Team memberships have to follow you between devices. Link an email to your account before joining.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Link Email', onPress: onLinkEmail },
        ],
      );
      return;
    }
    setBusy(true);
    try {
      const result = await acceptInvitation(inv.id, username);
      if ('error' in result) showAlert('Error', result.error);
      else onAccepted();
    } catch (e: any) { showAlert('Error', e.message); }
    finally { setBusy(false); }
  };

  const handleDecline = async () => {
    setBusy(true);
    try { await declineInvitation(inv.id); onDeclined(); }
    catch (e: any) { showAlert('Error', e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <Text style={styles.inviteIcon}>{TYPE_ICON[inv.team_type ?? ''] ?? '🏠'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.inviteName}>{inv.entity_name}</Text>
          <Text style={styles.inviteMeta}>Invited by {inv.invited_by_name}</Text>
        </View>
      </View>
      {username ? (
        <Text style={styles.inviteMeta}>You'll appear as @{username}</Text>
      ) : null}
      <View style={styles.inviteActions}>
        <Pressable style={[styles.declineBtn, busy && { opacity: 0.38 }]} onPress={handleDecline} disabled={busy}>
          <Text style={styles.declineBtnText}>Decline</Text>
        </Pressable>
        <Pressable style={[styles.acceptBtn, busy && { opacity: 0.38 }]} onPress={handleAccept} disabled={busy}>
          <Text style={styles.acceptBtnText}>{busy ? '...' : 'Accept'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function TeamsListScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const teams = useSelector((s: RootState) => s.app.teams);
  const username = useSelector((s: RootState) => s.app.username);
  const email = useSelector((s: RootState) => s.app.email);
  const hasEmail = !!(email && email.trim());

  const [loading, setLoading] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [data, invs] = await Promise.all([loadMyTeams(), loadMyInvitations()]);
    dispatch(setTeams(data));
    setInvitations(invs.filter(i => i.entity_type === 'team'));
    setLoading(false);
  }, [dispatch]);

  useEffect(() => { refresh(); }, [refresh]);

  // Refresh list immediately when my own team membership changes anywhere.
  const userId = useSelector((s: RootState) => s.app.userId);
  useMyMembershipRealtime(userId, refresh);

  useEffect(() => {
    const deepCode = (route.params as any)?.code as string | undefined;
    if (!deepCode) return;
    if (!username) {
      showAlert(
        'Set a Username',
        'Choose a username so teammates can recognize you before joining.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Username',
            onPress: () => navigation.navigate('SettingsTab', { screen: 'EditProfile' }),
          },
        ],
      );
      return;
    }
    setJoinCode(deepCode.toUpperCase());
    setShowJoin(true);
  }, [(route.params as any)?.code, username]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    if (!username) {
      showAlert('Username required', 'Pick a username first in Settings.');
      return;
    }
    setJoining(true);
    try {
      const result = await joinTeam(extractInviteCode(joinCode), username);
      if ('error' in result) {
        showAlert('Error', result.error);
      } else {
        setJoinCode('');
        setShowJoin(false);
        refresh();
      }
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setJoining(false);
    }
  };

  const promptLinkEmailToCreate = () => {
    showAlert(
      'Link an email to create a team',
      'Admins need a reachable email so invites can be sent from the team. Link an email in Settings, then create.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Link Email', onPress: () => navigation.navigate('SettingsTab', { screen: 'LinkEmail' }) },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.gold} />}
    >
      <Text style={styles.title}>🏢 Teams</Text>
      <Text style={styles.subtitle}>Structured accountability for schools, orgs, and groups.</Text>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <View style={styles.inviteSection}>
          <Text style={styles.inviteSectionLabel}>PENDING INVITATIONS</Text>
          {invitations.map(inv => (
            <InviteCard
              key={inv.id}
              inv={inv}
              username={username}
              hasEmail={hasEmail}
              onLinkEmail={() => navigation.navigate('SettingsTab', { screen: 'LinkEmail' })}
              onAccepted={refresh}
              onDeclined={refresh}
              styles={styles}
              theme={theme}
            />
          ))}
        </View>
      )}

      {/* Team list */}
      {teams.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏢</Text>
          <Text style={styles.emptyTitle}>No teams yet</Text>
          <Text style={styles.emptySub}>Create a team or join one with an invite link.</Text>
        </View>
      )}

      {teams.map((t: Team) => {
        const awaiting = t.team_status === 'pending';
        const rejected = t.team_status === 'rejected';
        return (
          <Pressable key={t.id} style={styles.teamCard} onPress={() => navigation.navigate('TeamDetail', { teamId: t.id })}>
            <View style={styles.teamHeader}>
              <Text style={styles.teamIcon}>{TYPE_ICON[t.team_type] || '🏠'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>{t.name}</Text>
                <Text style={styles.teamMeta}>
                  {t.team_type} · {t.member_count} member{t.member_count !== 1 ? 's' : ''} · {t.my_role}
                </Text>
              </View>
              {t.pending_count > 0 && !awaiting && !rejected && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>{t.pending_count}</Text>
                </View>
              )}
            </View>

            {awaiting && (
              <View style={styles.approvalPendingBanner}>
                <Text style={styles.approvalPendingTitle}>⏳ Waiting for admin approval</Text>
                <Text style={styles.approvalPendingSub}>
                  Your team will be usable once a OneCompliment admin approves it. We'll notify you.
                </Text>
              </View>
            )}

            {rejected && (
              <View style={styles.approvalRejectedBanner}>
                <Text style={styles.approvalRejectedTitle}>🚫 Team not approved</Text>
                {t.team_rejection_reason ? (
                  <Text style={styles.approvalRejectedSub}>Reason: {t.team_rejection_reason}</Text>
                ) : (
                  <Text style={styles.approvalRejectedSub}>Contact support if you think this is a mistake.</Text>
                )}
              </View>
            )}

            {!awaiting && !rejected && (
              <View style={styles.teamStats}>
                <Text style={styles.teamStat}>
                  🌻 {t.today_completions}/{t.member_count} bloomed today
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Join */}
      {showJoin ? (
        <View style={styles.joinCard}>
          <Text style={styles.label}>JOIN WITH INVITE LINK</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste invite link or code"
            placeholderTextColor={theme.colors.faint}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.joinActions}>
            <Pressable style={styles.cancelBtn} onPress={() => { setShowJoin(false); setJoinCode(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.joinBtn, (!joinCode.trim() || joining) && styles.btnDisabled]}
              onPress={handleJoin}
              disabled={!joinCode.trim() || joining}
            >
              <Text style={styles.joinBtnText}>{joining ? 'Joining...' : 'Join Team'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.ghostBtn} onPress={() => setShowJoin(true)}>
          <Text style={styles.ghostBtnText}>Join a Team with Link</Text>
        </Pressable>
      )}

      {/* Create — routes to unified pricing screen; tier pick happens before naming. */}
      <Pressable
        style={[styles.createBtn, !hasEmail && { opacity: 0.55 }]}
        onPress={() => (hasEmail ? navigation.navigate('ChoosePlan') : promptLinkEmailToCreate())}
      >
        <Text style={styles.createBtnText}>+ Create a Team</Text>
      </Pressable>
      {!hasEmail && (
        <Text style={{ fontSize: 12, color: theme.colors.faint, textAlign: 'center' }}>
          Link an email in Settings to create a team. Joining is available now.
        </Text>
      )}
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.dim, marginTop: -8 },
  label: { fontSize: 10, letterSpacing: 2.5, color: theme.colors.gold, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.dim },
  emptySub: { fontSize: 14, color: theme.colors.faint, textAlign: 'center' },
  teamCard: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 16, padding: 16, gap: 10,
  },
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamIcon: { fontSize: 28 },
  teamName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  teamMeta: { fontSize: 12, color: theme.colors.faint, marginTop: 2 },
  teamStats: { flexDirection: 'row', gap: 12 },
  teamStat: { fontSize: 12, color: theme.colors.dim },
  pendingBadge: {
    backgroundColor: 'rgba(255,100,100,0.15)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pendingText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,100,100,0.8)' },
  joinCard: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 16, padding: 18, gap: 12,
  },
  input: {
    backgroundColor: theme.colors.inputBg, borderWidth: 1, borderColor: theme.colors.inputBord,
    borderRadius: 12, padding: 14, fontSize: 16, color: theme.colors.text,
  },
  joinActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: theme.colors.bord, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: theme.colors.dim },
  joinBtn: { flex: 2, backgroundColor: theme.colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: '#0C0C0C' },
  btnDisabled: { opacity: 0.38 },
  ghostBtn: {
    borderWidth: 1, borderColor: theme.colors.bord, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  ghostBtnText: { fontSize: 14, color: theme.colors.dim },
  createBtn: {
    backgroundColor: theme.colors.gold, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#0C0C0C' },
  inviteSection: { gap: 10 },
  inviteSectionLabel: { fontSize: 10, letterSpacing: 2.5, color: theme.colors.gold, fontWeight: '600' },
  inviteCard: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 16, padding: 16, gap: 10,
  },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteIcon: { fontSize: 24 },
  inviteName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  inviteMeta: { fontSize: 12, color: theme.colors.faint, marginTop: 1 },
  inviteLabel: { fontSize: 10, letterSpacing: 2, color: theme.colors.dim, fontWeight: '600' },
  inviteInput: {
    backgroundColor: theme.colors.inputBg, borderWidth: 1, borderColor: theme.colors.inputBord,
    borderRadius: 12, padding: 12, fontSize: 15, color: theme.colors.text,
  },
  inviteActions: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1, borderWidth: 1, borderColor: theme.colors.bord, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  declineBtnText: { fontSize: 14, color: theme.colors.dim },
  acceptBtn: { flex: 2, backgroundColor: theme.colors.gold, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#0C0C0C' },
  approvalPendingBanner: {
    backgroundColor: 'rgba(255,179,71,0.10)', borderWidth: 1, borderColor: 'rgba(255,179,71,0.35)',
    borderRadius: 12, padding: 12, gap: 4,
  },
  approvalPendingTitle: { fontSize: 13, fontWeight: '700', color: '#FFB347' },
  approvalPendingSub: { fontSize: 12, color: theme.colors.dim, lineHeight: 18 },
  approvalRejectedBanner: {
    backgroundColor: 'rgba(255,107,107,0.10)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.35)',
    borderRadius: 12, padding: 12, gap: 4,
  },
  approvalRejectedTitle: { fontSize: 13, fontWeight: '700', color: '#FF6B6B' },
  approvalRejectedSub: { fontSize: 12, color: theme.colors.dim, lineHeight: 18 },
}));
