import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Keyboard, ActivityIndicator, Share, Linking, AppState } from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setTeams } from '../store/appSlice';
import {
  loadTeamDashboard, updateTeamSettings, removeTeamMember, toggleMuteMember,
  leaveTeam, loadMyTeams, addTeamPrompt, setTeamMemberRole,
  loadSubscriptionTiers,
  sendTeamInvitations, loadEntityInvitations,
  getTeamPendingMembers, approveTeamMember,
  TeamDashboard, TeamMember, SubscriptionTier, SentInvitation, PendingTeamMember,
} from '../utils/supabase';
import { ClipboardIcon, TrashIcon } from '../components/icons';
import * as Clipboard from 'expo-clipboard';
import { getTeamStripeUrl, withTeamRef, type TeamTierId as TierId } from '../utils/stripeLinks';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

// Poll the dashboard until the webhook has flipped the team's tier.
// Gives up after ~10 seconds; the next manual refresh will still pick it up.
async function waitForTierActivation(
  teamId: string,
  expectedTier: string,
  onActive: () => Promise<void> | void,
) {
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const data = await loadTeamDashboard(teamId);
    if (data?.team.subscription_tier === expectedTier) {
      await onActive();
      return;
    }
  }
  // Webhook hasn't landed yet — still refresh so any partial state shows.
  await onActive();
}

export default function TeamSettingsScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const teamId = (route.params as any)?.teamId as string;
  const userId = useSelector((s: RootState) => s.app.userId);

  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [dailyTheme, setDailyTheme] = useState('');
  const [pinnedChallenge, setPinnedChallenge] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  // Set when the user taps a tier card and we send them to Stripe.
  // The AppState listener uses this to know which tier to poll for
  // when they return to the app.
  const awaitingTierRef = useRef<TierId | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [pending, setPending] = useState<PendingTeamMember[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, tierData, invData, pendData] = await Promise.all([
      loadTeamDashboard(teamId),
      loadSubscriptionTiers(),
      loadEntityInvitations('team', teamId),
      getTeamPendingMembers(teamId),
    ]);
    if (data) {
      setDashboard(data);
      setTeamName(data.team.name);
      setDailyTheme(data.team.daily_theme || '');
      setPinnedChallenge(data.team.pinned_challenge || '');
    }
    setTiers(tierData);
    setSentInvitations(invData);
    setPending(pendData);
    setLoading(false);
  }, [teamId]);

  // When the user returns from the Stripe browser tab, the webhook may
  // have already activated the new tier. Poll the dashboard a few times
  // to surface the new state without forcing a manual refresh.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !awaitingTierRef.current) return;
      const expected = awaitingTierRef.current;
      awaitingTierRef.current = null;
      waitForTierActivation(teamId, expected, load).then(() => {
        // Best-effort confirmation — only fires if the dashboard now shows
        // the expected tier. waitForTierActivation reloads regardless.
        loadTeamDashboard(teamId).then((d) => {
          if (d?.team.subscription_tier === expected) {
            const name = tiers.find((t) => t.id === expected)?.name ?? expected;
            showAlert('Activated', `${name} plan is now active.`);
          }
        });
      });
    });
    return () => sub.remove();
  }, [teamId, load, tiers]);

  const handleApprovePending = async (target: PendingTeamMember) => {
    const ok = await approveTeamMember(teamId, target.user_id);
    if (ok) load();
    else showAlert('Error', 'Could not approve member.');
  };
  const handleDeclinePending = async (target: PendingTeamMember) => {
    try { await removeTeamMember(teamId, target.user_id); load(); }
    catch (e: any) { showAlert('Error', e.message); }
  };

  useEffect(() => { load(); }, [load]);

  if (!dashboard) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>{loading ? 'Loading...' : 'Team not found'}</Text>
      </View>
    );
  }

  const { team, members, stats } = dashboard;
  const isSchool = team.team_type === 'school';
  const isOrg = team.team_type === 'organization';
  const isMainAdmin = team.my_role === 'admin';

  const handleSaveName = async () => {
    if (!teamName.trim()) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await updateTeamSettings(teamId, { name: teamName.trim() });
      showAlert('Saved', 'Team name updated.');
      load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTheme = async () => {
    Keyboard.dismiss();
    setSaving(true);
    try {
      await updateTeamSettings(teamId, { daily_theme: dailyTheme.trim() || undefined });
      showAlert('Saved', dailyTheme.trim() ? 'Theme updated.' : 'Theme cleared.');
      load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearTheme = async () => {
    setDailyTheme('');
    setSaving(true);
    try {
      await updateTeamSettings(teamId, { daily_theme: '' });
      showAlert('Cleared', 'Theme removed.');
      load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePinnedChallenge = async () => {
    Keyboard.dismiss();
    setSaving(true);
    try {
      await updateTeamSettings(teamId, { pinned_challenge: pinnedChallenge.trim() || undefined });
      showAlert('Saved', pinnedChallenge.trim() ? 'Challenge pinned!' : 'Challenge cleared.');
      load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearPinnedChallenge = async () => {
    setPinnedChallenge('');
    setSaving(true);
    try {
      await updateTeamSettings(teamId, { pinned_challenge: '' });
      showAlert('Cleared', 'Pinned challenge removed.');
      load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key: string, current: boolean) => {
    try {
      await updateTeamSettings(teamId, { [key]: !current } as any);
      load();
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  const handleRemoveMember = (m: TeamMember) => {
    showAlert('Remove Member', `Remove ${m.display_name} from the team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try { await removeTeamMember(teamId, m.user_id); load(); }
          catch (e: any) { showAlert('Error', e.message); }
        },
      },
    ]);
  };

  const handleMuteMember = async (m: TeamMember) => {
    try { await toggleMuteMember(teamId, m.user_id); load(); }
    catch (e: any) { showAlert('Error', e.message); }
  };

  const handleRoleChange = (m: TeamMember) => {
    const options: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [];

    if (m.role === 'member') {
      options.push({ text: 'Promote to Moderator', onPress: async () => {
        try { await setTeamMemberRole(teamId, m.user_id, 'moderator'); load(); }
        catch (e: any) { showAlert('Error', e.message); }
      }});
    }
    if (m.role === 'moderator') {
      options.push({ text: 'Promote to Admin', onPress: async () => {
        try { await setTeamMemberRole(teamId, m.user_id, 'admin'); load(); }
        catch (e: any) { showAlert('Error', e.message); }
      }});
      options.push({ text: 'Demote to Member', onPress: async () => {
        try { await setTeamMemberRole(teamId, m.user_id, 'member'); load(); }
        catch (e: any) { showAlert('Error', e.message); }
      }});
    }
    options.push({ text: 'Cancel', style: 'cancel' });

    showAlert('Change Role', `${m.display_name} is currently: ${m.role}`, options);
  };

  const handleLeave = () => {
    showAlert('Leave Team', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await leaveTeam(teamId);
            const teams = await loadMyTeams();
            dispatch(setTeams(teams));
            navigation.popToTop();
          } catch (e: any) { showAlert('Error', e.message); }
        },
      },
    ]);
  };

  const handleAddPrompt = async () => {
    if (!customPrompt.trim()) return;
    Keyboard.dismiss();
    try {
      await addTeamPrompt(teamId, customPrompt.trim());
      setCustomPrompt('');
      showAlert('Added', 'Custom prompt saved.');
    } catch (e: any) { showAlert('Error', e.message); }
  };

  const INVITE_BASE_URL = 'https://onecompliment.app/join';

  const shareInviteLink = async () => {
    const link = `${INVITE_BASE_URL}/team/${team.invite_code}`;
    try {
      await Share.share({ message: link });
    } catch {
      await Clipboard.setStringAsync(link);
      showAlert('Copied!', 'Invite link copied to clipboard.');
    }
  };

  const handleSendInvites = async () => {
    const emails = emailInput.split(/[,;\n]+/).map(e => e.trim()).filter(e => e);
    if (emails.length === 0) return;
    Keyboard.dismiss();
    setSendingInvites(true);
    try {
      const result = await sendTeamInvitations(teamId, emails);
      if ('error' in result) {
        showAlert('Error', result.error);
        return;
      }
      setEmailInput('');
      load();

      const summary = `${result.sent} invitation${result.sent !== 1 ? 's' : ''} saved.${
        result.skipped > 0 ? ` ${result.skipped} skipped (already members or duplicates).` : ''
      }`;

      if (result.emailDelivered) {
        showAlert('Invitations Sent', `${summary}\n\nEmails are on the way.`);
        return;
      }

      // SMTP not configured or failed → fall back to the system share
      // sheet. Admin can send via email/WhatsApp/SMS/etc.
      if (result.sent > 0 && result.shareMessage) {
        const reason = result.deliveryError
          ? `Server email failed: ${result.deliveryError}`
          : 'Server email isn\'t set up yet.';
        showAlert(
          'Invitations Saved',
          `${summary}\n\n${reason}\n\nShare the invite link now?`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Share Link',
              onPress: async () => {
                try {
                  await Share.share({
                    message: result.shareMessage!,
                    ...(result.joinUrl ? { url: result.joinUrl } : {}),
                  });
                } catch (err: any) {
                  showAlert('Error', err?.message ?? 'Could not open share sheet.');
                }
              },
            },
          ],
        );
        return;
      }

      showAlert('Invitations', summary);
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setSendingInvites(false);
    }
  };

  // Build toggle list based on team type
  const toggles = [];
  if (isSchool) {
    toggles.push(
      { key: 'require_approval', label: 'Require teacher approval', desc: 'All submissions need approval before visible', value: team.require_approval },
      { key: 'shared_visibility', label: 'Shared visibility', desc: 'Students can see each other\'s approved responses', value: team.shared_visibility },
      { key: 'content_filter_enabled', label: 'Content filtering', desc: 'Content filter on all submissions', value: team.content_filter_enabled },
      { key: 'parent_visibility', label: 'Parent visibility', desc: 'Parents can view student submissions', value: team.parent_visibility },
      { key: 'custom_prompts_only', label: 'Custom prompts only', desc: 'Only teacher-written prompts', value: team.custom_prompts_only },
    );
  } else if (isOrg) {
    toggles.push(
      { key: 'shared_visibility', label: 'Shared visibility', desc: 'Members can see each other\'s completions', value: team.shared_visibility },
    );
  } else {
    toggles.push(
      { key: 'require_approval', label: 'Require approval', desc: 'Submissions need admin approval', value: team.require_approval },
      { key: 'shared_visibility', label: 'Shared visibility', desc: 'Members can see each other\'s completions', value: team.shared_visibility },
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Team Settings</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.gold} style={{ marginTop: 32 }} />
      ) : (
        <>
          {/* Inactive-team notice — every management action below is rejected
              server-side until a subscription is active, including by admins. */}
          {dashboard && dashboard.subscription?.status !== 'active' && (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedCardTitle}>🔒 This team is inactive</Text>
              <Text style={styles.lockedCardBody}>
                All management actions (renaming, inviting, approving members, changing
                settings) are blocked until you subscribe to a plan below.
              </Text>
            </View>
          )}

          {/* Invite link */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>INVITE LINK</Text>
            <Pressable style={styles.codeRow} onPress={shareInviteLink}>
              <Text style={[styles.codeText, { fontSize: 13, letterSpacing: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                onecompliment.app/join/team/{team.invite_code}
              </Text>
              <ClipboardIcon size={16} color={theme.colors.dim} />
            </Pressable>
            <Text style={styles.hint}>Tap to share — anyone with this link can join your team.</Text>
          </View>

          {/* Invite by email */}
          {isMainAdmin && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>INVITE BY EMAIL</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Enter emails separated by commas&#10;e.g. john@school.edu, jane@school.edu"
                placeholderTextColor={theme.colors.faint}
                value={emailInput}
                onChangeText={setEmailInput}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Pressable
                style={[styles.saveBtn, (!emailInput.trim() || sendingInvites) && styles.saveBtnDisabled]}
                onPress={handleSendInvites}
                disabled={!emailInput.trim() || sendingInvites}
              >
                <Text style={styles.saveBtnText}>
                  {sendingInvites ? 'Sending...' : 'Send Invitations'}
                </Text>
              </Pressable>
              <Text style={styles.hint}>
                Invitees will see the invitation when they link their email in the app. Invitations expire in 7 days.
              </Text>

              {/* Sent invitations list */}
              {sentInvitations.length > 0 && (
                <View style={styles.invitationsList}>
                  <Text style={styles.invitationsTitle}>Sent Invitations</Text>
                  {sentInvitations.map(inv => (
                    <View key={inv.id} style={styles.invitationRow}>
                      <Text style={styles.invitationEmail}>{inv.email}</Text>
                      <Text style={[
                        styles.invitationStatus,
                        inv.status === 'accepted' && styles.statusAccepted,
                        inv.status === 'expired' && styles.statusExpired,
                      ]}>
                        {inv.status}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Team name */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>TEAM NAME</Text>
            <View style={styles.editRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={teamName}
                onChangeText={setTeamName}
                maxLength={60}
              />
              <Pressable style={styles.saveBtn} onPress={handleSaveName} disabled={saving}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>

          {/* Daily theme */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              {isOrg ? 'LEADERSHIP DAILY THEME' : 'DAILY THEME / FOCUS'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={isOrg
                ? 'e.g. Recognize someone who helped you this week'
                : 'e.g. Say something kind to a teammate'}
              placeholderTextColor={theme.colors.faint}
              value={dailyTheme}
              onChangeText={setDailyTheme}
              maxLength={200}
            />
            {(dailyTheme.trim() || team.daily_theme) && (
              <View style={styles.challengeActions}>
                <Pressable style={[styles.saveBtn, { flex: 1 }]} onPress={handleSaveTheme} disabled={saving || !dailyTheme.trim()}>
                  <Text style={styles.saveBtnText}>Set Theme</Text>
                </Pressable>
                <Pressable style={styles.clearBtn} onPress={handleClearTheme} disabled={saving}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Pinned challenge */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>PINNED CHALLENGE / THEME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Compliment someone's work ethic"
              placeholderTextColor={theme.colors.faint}
              value={pinnedChallenge}
              onChangeText={setPinnedChallenge}
              maxLength={100}
            />
            {(pinnedChallenge.trim() || team.pinned_challenge) && (
              <View style={styles.challengeActions}>
                <Pressable style={[styles.saveBtn, { flex: 1 }]} onPress={handleSavePinnedChallenge} disabled={saving || !pinnedChallenge.trim()}>
                  <Text style={styles.saveBtnText}>Pin Challenge</Text>
                </Pressable>
                <Pressable style={styles.clearBtn} onPress={handleClearPinnedChallenge} disabled={saving}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Type-specific toggles */}
          {toggles.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>
                {isSchool ? 'SCHOOL SETTINGS' : isOrg ? 'ORGANIZATION SETTINGS' : 'TEAM SETTINGS'}
              </Text>
              {toggles.map((toggle, i) => (
                <View key={toggle.key}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.toggleLabel}>{toggle.label}</Text>
                      <Text style={styles.toggleDesc}>{toggle.desc}</Text>
                    </View>
                    <Pressable
                      style={[styles.toggle, toggle.value && styles.toggleActive]}
                      onPress={() => handleToggle(toggle.key, toggle.value)}
                    >
                      <View style={[styles.knob, toggle.value && styles.knobActive]} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Org info note */}
          {isOrg && (
            <View style={styles.orgNote}>
              <Text style={styles.orgNoteText}>
                Organization teams are professional and open. Submissions are auto-approved — no moderation queue.
              </Text>
            </View>
          )}

          {/* Custom prompts */}
          {(isSchool || isMainAdmin) && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>
                {isSchool ? 'ADD CUSTOM PROMPT FOR STUDENTS' : 'ADD CUSTOM CHALLENGE'}
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={customPrompt}
                onChangeText={setCustomPrompt}
                placeholder={isSchool
                  ? 'Write a custom challenge for your students...'
                  : 'Write a custom challenge for your team...'}
                placeholderTextColor={theme.colors.faint}
                maxLength={300} multiline numberOfLines={3} textAlignVertical="top"
              />
              <Pressable
                style={[styles.saveBtn, !customPrompt.trim() && styles.saveBtnDisabled]}
                onPress={handleAddPrompt}
                disabled={!customPrompt.trim()}
              >
                <Text style={styles.saveBtnText}>Add Prompt</Text>
              </Pressable>
            </View>
          )}

          {/* Pending approvals (admin/moderator only) */}
          {isMainAdmin && pending.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>PENDING APPROVAL ({pending.length})</Text>
              {pending.map(p => (
                <View key={p.user_id} style={styles.memberRow}>
                  <View style={[styles.avatar, { backgroundColor: p.color }]}>
                    <Text style={styles.avatarText}>{p.display_name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{p.display_name}</Text>
                    <Text style={styles.memberRole}>Joined by invite code</Text>
                  </View>
                  <Pressable
                    style={[styles.saveBtn, { paddingHorizontal: 14, paddingVertical: 8 }]}
                    onPress={() => handleApprovePending(p)}
                  >
                    <Text style={styles.saveBtnText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.removeBtn, { marginLeft: 8 }]}
                    onPress={() => handleDeclinePending(p)}
                  >
                    <TrashIcon size={16} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Members management */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>MEMBERS ({members.length})</Text>
            {members.map((m: TeamMember) => (
              <View key={m.user_id} style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: m.color }]}>
                  <Text style={styles.avatarText}>{m.display_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.display_name}
                  </Text>
                  <Text style={styles.memberRole}>
                    {m.role}{m.muted ? ' · Muted' : ''}
                  </Text>
                </View>
                {m.role !== 'admin' && isMainAdmin && (
                  <View style={styles.memberActions}>
                    <Pressable onPress={() => handleRoleChange(m)}>
                      <Text style={styles.roleText}>Role</Text>
                    </Pressable>
                    <Pressable onPress={() => handleMuteMember(m)}>
                      <Text style={styles.actionText}>{m.muted ? 'Unmute' : 'Mute'}</Text>
                    </Pressable>
                    <Pressable style={styles.removeBtn} onPress={() => handleRemoveMember(m)}>
                      <TrashIcon size={16} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Subscription — admin only */}
          {isMainAdmin && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>

              {/* Current plan — teams without a subscription show a
                  "choose a plan" prompt. No free tier exists. */}
              {dashboard.subscription ? (
                <View style={styles.currentPlan}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{dashboard.subscription.tier_name} Plan</Text>
                    <Text style={styles.planMeta}>
                      {dashboard.subscription.max_members
                        ? `Up to ${dashboard.subscription.max_members} members`
                        : 'Unlimited members'}
                      {' · '}${dashboard.subscription.price_monthly}/mo
                    </Text>
                    <Text style={styles.planMeta}>
                      {dashboard.subscription.status === 'active' ? '✓ Active' : dashboard.subscription.status}
                      {dashboard.subscription.cancel_at_period_end ? ' · Cancels at period end' : ''}
                    </Text>
                  </View>
                  <Text style={styles.planSeats}>
                    {stats.member_count}/{dashboard.subscription.max_members ?? '∞'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.planPrompt}>
                  Choose a plan below to start growing your team.
                </Text>
              )}

              {/* Tier options — opens Stripe checkout in the system browser.
                  Apple Guideline 3.1.3(b) Multiplatform Services explicitly
                  permits B2B subscriptions to be sold outside IAP. */}
              {tiers.length > 0 && (
                <View style={styles.tierList}>
                  {tiers.map(tier => {
                    const isCurrent = team.subscription_tier === tier.id;
                    return (
                      <Pressable
                        key={tier.id}
                        style={[styles.tierCard, isCurrent && styles.tierCardActive]}
                        disabled={isCurrent}
                        onPress={() => {
                          showAlert(
                            `Upgrade to ${tier.name}?`,
                            `$${tier.price_monthly}/month — ${tier.max_members ? `up to ${tier.max_members} members` : 'unlimited members'}\n\nCheckout opens in your browser. Your plan activates within ~30 seconds of payment.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Continue',
                                onPress: async () => {
                                  const tierId = tier.id as TierId;
                                  const stripeUrl = getTeamStripeUrl(tierId);
                                  if (!stripeUrl) {
                                    // No Payment Link configured — never open
                                    // another tier's (wrong-price) checkout.
                                    showAlert(
                                      'Checkout unavailable',
                                      `Checkout for ${tier.name} isn’t set up yet. Email info@onecompliment.app and we’ll get you started.`
                                    );
                                    return;
                                  }
                                  const url = withTeamRef(stripeUrl, teamId, tierId);
                                  awaitingTierRef.current = tierId;
                                  try {
                                    await Linking.openURL(url);
                                  } catch (e: any) {
                                    awaitingTierRef.current = null;
                                    showAlert('Could not open checkout', e?.message ?? 'Please try again.');
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <View style={styles.tierHeader}>
                          <Text style={[styles.tierName, isCurrent && styles.tierNameActive]}>
                            {tier.name}
                          </Text>
                          {isCurrent && <Text style={styles.tierBadge}>CURRENT</Text>}
                        </View>
                        <Text style={styles.tierPrice}>${tier.price_monthly}/mo</Text>
                        <Text style={styles.tierLimit}>
                          {tier.max_members ? `Up to ${tier.max_members} members` : 'Unlimited members'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Leave */}
          <Pressable style={styles.leaveBtn} onPress={handleLeave}>
            <Text style={styles.leaveBtnText}>Leave Team</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 16 },
  center: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.faint, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  back: { color: theme.colors.faint, fontSize: 14 },

  card: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '600',
  },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 10,
    padding: 14,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'Courier',
    letterSpacing: 2,
  },
  hint: { fontSize: 12, color: theme.colors.faint },

  editRow: { flexDirection: 'row', gap: 10 },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBord,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  textarea: { minHeight: 80, lineHeight: 24 },
  placeholder: { color: theme.colors.faint },
  saveBtn: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.38 },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.gold },
  challengeActions: { flexDirection: 'row', gap: 10 },
  clearBtn: {
    backgroundColor: 'rgba(255,100,100,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.20)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,100,100,0.7)' },

  divider: {
    height: 1,
    backgroundColor: theme.colors.bord,
    marginVertical: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  toggleDesc: { fontSize: 11, color: theme.colors.faint, marginTop: 2 },
  toggle: {
    width: 44, height: 26, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: theme.colors.gold },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)' },
  knobActive: { backgroundColor: '#0D0D0D', alignSelf: 'flex-end' },

  orgNote: {
    backgroundColor: 'rgba(78,205,196,0.06)', borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.15)', borderRadius: 14, padding: 14,
  },
  orgNoteText: { fontSize: 13, color: theme.colors.dim, lineHeight: 20 },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bord,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#0D0D0D' },
  memberName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  memberRole: { fontSize: 11, color: theme.colors.faint, marginTop: 1 },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleText: { fontSize: 12, color: '#C3B1E1' },
  actionText: { fontSize: 12, color: theme.colors.dim },
  removeBtn: {
    borderWidth: 1,
    borderColor: theme.colors.dangerBord,
    borderRadius: 8,
    padding: 8,
  },

  // ── Subscription ──
  currentPlan: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.inputBg, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 12, padding: 14,
  },
  planName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  planMeta: { fontSize: 12, color: theme.colors.faint, marginTop: 2 },
  planSeats: { fontSize: 22, fontWeight: '700', color: theme.colors.gold },
  planPrompt: { fontSize: 13, color: theme.colors.faint, lineHeight: 20 },
  lockedCard: {
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.28)',
    borderRadius: 14, padding: 16, gap: 6,
  },
  lockedCardTitle: { fontSize: 14, fontWeight: '700', color: '#FF8B94' },
  lockedCardBody: { fontSize: 13, color: theme.colors.dim, lineHeight: 18 },
  tierList: { gap: 8 },
  tierCard: {
    backgroundColor: theme.colors.inputBg, borderWidth: 1.5, borderColor: theme.colors.bord,
    borderRadius: 12, padding: 14, gap: 4,
  },
  tierCardActive: {
    borderColor: theme.colors.goldCardBord, backgroundColor: theme.colors.goldCardBg,
  },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  tierNameActive: { color: theme.colors.gold },
  tierBadge: {
    fontSize: 9, letterSpacing: 1, color: theme.colors.gold,
    backgroundColor: 'rgba(245,200,66,0.12)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  tierPrice: { fontSize: 13, fontWeight: '600', color: theme.colors.dim },
  tierLimit: { fontSize: 12, color: theme.colors.faint },

  // ── Invitations ──
  invitationsList: { gap: 6, marginTop: 4 },
  invitationsTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.dim },
  invitationRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.bord,
  },
  invitationEmail: { fontSize: 13, color: theme.colors.text },
  invitationStatus: { fontSize: 11, color: theme.colors.faint, textTransform: 'capitalize' },
  statusAccepted: { color: '#4ECDC4' },
  statusExpired: { color: 'rgba(255,100,100,0.6)' },

  leaveBtn: {
    borderWidth: 1, borderColor: 'rgba(255,80,80,0.18)', borderRadius: theme.radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  leaveBtnText: { fontSize: 13, color: 'rgba(255,100,100,0.55)' },
}));
