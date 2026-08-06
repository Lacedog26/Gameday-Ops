import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setCloudGroups } from '../store/appSlice';
import { GroupsIcon, LockIcon, ShieldIcon, ClipboardIcon, SparkleIcon, FireIcon } from '../components/icons';
import { loadMyGroups, createGroup, joinGroup } from '../utils/supabaseGroups';
import { loadMyInvitations, acceptInvitation, declineInvitation, Invitation } from '../utils/supabase';
import { useMyMembershipRealtime } from '../utils/realtimeHooks';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

const INVITE_BASE_URL = 'https://onecompliment.app/join';

function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').filter(Boolean);
    return parts[parts.length - 1].toUpperCase();
  }
  return trimmed.toUpperCase();
}

function GroupInviteCard({ inv, username, hasEmail, onLinkEmail, onDone, styles, theme: _theme }: {
  inv: Invitation; username: string | null;
  hasEmail: boolean;
  onLinkEmail: () => void;
  onDone: () => void; styles: any; theme: any;
}) {
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    if (!username) {
      showAlert('Username required', 'Pick a username first in Settings — that\'s what members will see.');
      return;
    }
    if (!hasEmail) {
      // Memberships are tied to the user's account, so accepting on an
      // anonymous session would orphan the row when cookies clear.
      // Same gate the create_group RPC enforces server-side.
      showAlert(
        'Link an email first',
        'Group memberships have to follow you between devices. Link an email to your account before joining.',
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
      else onDone();
    } catch (e: any) { showAlert('Error', e.message); }
    finally { setBusy(false); }
  };

  const handleDecline = async () => {
    setBusy(true);
    try { await declineInvitation(inv.id); onDone(); }
    catch (e: any) { showAlert('Error', e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <Text style={styles.inviteIcon}>🏠</Text>
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

export default function GroupsScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const cloudGroups = useSelector((s: RootState) => s.app.cloudGroups ?? []);
  const username = useSelector((s: RootState) => s.app.username);
  const email = useSelector((s: RootState) => s.app.email);
  const isPro = useSelector((s: RootState) => s.app.isPro);
  const hasEmail = !!(email && email.trim());
  const FREE_GROUP_LIMIT = 8;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupInvitations, setGroupInvitations] = useState<Invitation[]>([]);

  // Create form
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // Join form
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const fetchGroups = useCallback(async () => {
    const [groups, invs] = await Promise.all([loadMyGroups(), loadMyInvitations()]);
    dispatch(setCloudGroups(groups));
    setGroupInvitations(invs.filter(i => i.entity_type === 'group'));
  }, [dispatch]);

  useEffect(() => {
    fetchGroups().finally(() => setLoading(false));
  }, [fetchGroups]);

  // Refresh list immediately when my own group/team membership changes anywhere.
  const userId = useSelector((s: RootState) => s.app.userId);
  useMyMembershipRealtime(userId, fetchGroups);

  useEffect(() => {
    const deepCode = (route.params as any)?.code as string | undefined;
    if (!deepCode) return;
    if (!username) {
      showAlert(
        'Set a Username',
        'Choose a username so group members can recognize you before joining.',
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
    setInviteCode(deepCode.toUpperCase());
    setShowJoin(true);
  }, [(route.params as any)?.code, username]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, [fetchGroups]);

  const handleCreate = async () => {
    if (!isPro && cloudGroups.length >= FREE_GROUP_LIMIT) {
      showAlert('Group Limit Reached', 'Free accounts support up to 8 groups. Upgrade to Pro for unlimited groups.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Upgrade to Pro', onPress: () => navigation.navigate('HomeTab', { screen: 'Pro' }) },
      ]);
      return;
    }
    if (!groupName.trim()) { showAlert('Enter a group name'); return; }
    if (!username) { showAlert('Pick a username first in Settings.'); return; }
    setCreating(true);
    const result = await createGroup(groupName.trim(), username);
    setCreating(false);
    if (!result) {
      showAlert('Error', 'Could not create group. Make sure you are signed in.');
      return;
    }
    const link = `${INVITE_BASE_URL}/group/${result.invite_code}`;
    await Clipboard.setStringAsync(link);
    showAlert('Group created!', `Invite link copied to clipboard. Share it with your friends!`);
    setShowCreate(false);
    setGroupName('');
    await fetchGroups();
  };

  const handleJoin = async () => {
    if (!isPro && cloudGroups.length >= FREE_GROUP_LIMIT) {
      showAlert('Group Limit Reached', 'Free accounts support up to 8 groups. Upgrade to Pro for unlimited groups.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Upgrade to Pro', onPress: () => navigation.navigate('HomeTab', { screen: 'Pro' }) },
      ]);
      return;
    }
    if (!inviteCode.trim()) { showAlert('Enter an invite link'); return; }
    if (!username) { showAlert('Pick a username first in Settings.'); return; }
    setJoining(true);
    const result = await joinGroup(extractInviteCode(inviteCode), username);
    setJoining(false);
    if (result.error) {
      showAlert('Could not join', result.error);
      return;
    }
    showAlert('Joined!', `Welcome to ${result.group_name}`);
    setShowJoin(false);
    setInviteCode('');
    await fetchGroups();
  };

  const copyInviteLink = async (code: string) => {
    const link = `${INVITE_BASE_URL}/group/${code}`;
    await Clipboard.setStringAsync(link);
    showAlert('Copied!', 'Invite link copied to clipboard.');
  };

  const promptLinkEmailToCreate = () => {
    showAlert(
      'Link an email to create a group',
      'Admins need a reachable email so invites can be sent from the group. Link an email in Settings, then create.',
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <GroupsIcon size={22} />
          <Text style={styles.title}>My Groups</Text>
        </View>
      </View>

      <View style={styles.badges}>
        <View style={styles.badge}>
          <View style={styles.row}>
            <LockIcon size={12} color="#A8E6CF" />
            <Text style={styles.badgeText}> Invite-only</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <View style={styles.row}>
            <ShieldIcon size={12} color="#A8E6CF" />
            <Text style={styles.badgeText}> Cloud synced</Text>
          </View>
        </View>
      </View>

      {/* Pending group invitations */}
      {groupInvitations.length > 0 && (
        <View style={styles.inviteSection}>
          <Text style={styles.inviteSectionLabel}>PENDING INVITATIONS</Text>
          {groupInvitations.map(inv => (
            <GroupInviteCard
              key={inv.id}
              inv={inv}
              username={username}
              hasEmail={hasEmail}
              onLinkEmail={() => navigation.navigate('SettingsTab', { screen: 'LinkEmail' })}
              onDone={fetchGroups}
              styles={styles}
              theme={theme}
            />
          ))}
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={theme.colors.gold} />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      )}

      {/* Empty state */}
      {!loading && cloudGroups.length === 0 && (
        <View style={styles.empty}>
          <GroupsIcon size={40} color="rgba(242,237,228,0.4)" />
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptyDesc}>
            Create a group or join one with an invite link to do challenges together.
          </Text>
        </View>
      )}

      {/* Group list */}
      {cloudGroups.map(g => (
        <Pressable
          key={g.id}
          style={styles.groupCard}
          onPress={() => navigation.navigate('GroupDetail', { groupId: g.id, groupName: g.name })}
        >
          <View style={styles.groupHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupName}>{g.name}</Text>
              <Text style={styles.groupMeta}>
                {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                {g.my_role === 'admin' ? ' · Admin' : ''}
              </Text>
            </View>
            {g.pinned_challenge ? (
              <View style={styles.pinnedBadge}>
                <Text style={styles.pinnedText} numberOfLines={1}>{g.pinned_challenge}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.groupFooter}>
            <Pressable
              style={styles.codeBtn}
              onPress={(e) => { e.stopPropagation(); copyInviteLink(g.invite_code); }}
            >
              <ClipboardIcon size={13} color={theme.colors.dim} />
              <Text style={[styles.codeText, { fontFamily: undefined, letterSpacing: 0 }]}>Copy invite link</Text>
            </Pressable>
            <Text style={styles.dateText}>
              Created {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </Pressable>
      ))}

      {/* Action buttons — Create routes to unified pricing first (tier → name → pay) */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.btn, !hasEmail && { opacity: 0.55 }]}
          onPress={() => (hasEmail ? navigation.navigate('ChoosePlan') : promptLinkEmailToCreate())}
        >
          <Text style={styles.btnText}>+ Create Group</Text>
        </Pressable>
        <Pressable style={styles.joinBtn} onPress={() => setShowJoin(true)}>
          <Text style={styles.joinBtnText}>Join Group</Text>
        </Pressable>
      </View>
      {!hasEmail && (
        <Text style={{ fontSize: 12, color: theme.colors.faint, textAlign: 'center', marginTop: -4 }}>
          Link an email in Settings to create a group. Joining is available now.
        </Text>
      )}

      {/* Create form */}
      {showCreate && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create a Group</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.labelDim}>GROUP NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning Crew, Family..."
              placeholderTextColor={theme.colors.faint}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={40}
            />
          </View>

          {username ? (
            <Text style={styles.labelDim}>You'll appear as @{username}</Text>
          ) : null}

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { flex: 2, opacity: creating ? 0.6 : 1 }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#0C0C0C" />
              ) : (
                <View style={styles.row}>
                  <Text style={styles.btnText}>Create </Text>
                  <SparkleIcon size={14} color="#0C0C0C" />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Join form */}
      {showJoin && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Join a Group</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.labelDim}>INVITE LINK</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste invite link or code"
              placeholderTextColor={theme.colors.faint}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {username ? (
            <Text style={styles.labelDim}>You'll appear as @{username}</Text>
          ) : null}

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowJoin(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { flex: 2, opacity: joining ? 0.6 : 1 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator size="small" color="#0C0C0C" />
              ) : (
                <Text style={styles.btnText}>Join Group</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#0C0C0C' },
  createBtn: {
    backgroundColor: theme.colors.gold, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: theme.colors.greenBadgeBg,
    borderWidth: 1,
    borderColor: theme.colors.greenBadgeBord,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    color: '#A8E6CF',
  },
  loadingWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.faint,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.dim,
  },
  emptyDesc: {
    fontSize: 14,
    color: theme.colors.faint,
    textAlign: 'center',
    lineHeight: 22,
  },
  groupCard: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  groupMeta: {
    fontSize: 12,
    color: theme.colors.faint,
    marginTop: 2,
  },
  pinnedBadge: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    maxWidth: 140,
  },
  pinnedText: {
    fontSize: 11,
    color: theme.colors.gold,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  codeText: {
    fontSize: 12,
    color: theme.colors.dim,
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.faint,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 15,
    fontWeight: '700',
  },
  joinBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: {
    color: theme.colors.gold,
    fontSize: 15,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.lg,
    padding: 20,
    gap: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  inputGroup: {
    gap: 8,
  },
  labelDim: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.faint,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBord,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  placeholder: {
    color: theme.colors.faint,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: theme.colors.dim,
  },
  inviteSection: { gap: 10 },
  inviteSectionLabel: { fontSize: 10, letterSpacing: 2.5, color: theme.colors.gold, fontWeight: '600' },
  inviteCard: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: theme.radius.lg, padding: 16, gap: 10,
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
}));
