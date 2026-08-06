import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Keyboard, Share, Linking, AppState,
} from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  getGroupLeaderboard, renameGroup, pinChallenge,
  removeMember,
  getGroupPendingMembers, approveGroupMember,
  loadGroupSubscription,
  type GroupMemberInfo, type PendingGroupMember, type GroupSubscription,
} from '../utils/supabaseGroups';
import {
  sendGroupInvitations, loadEntityInvitations, loadSubscriptionTiers,
  type SentInvitation, type SubscriptionTier,
} from '../utils/supabase';
import { getGroupStripeUrl, withGroupRef, type GroupTierId as TierId } from '../utils/stripeLinks';
import { ClipboardIcon, TrashIcon } from '../components/icons';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

const FREE_GROUP_LIMIT = 10;

// Poll the group subscription until the webhook has flipped the tier.
// Used after the user returns from the Stripe checkout browser tab.
async function waitForGroupTierActivation(
  groupId: string,
  expectedTier: string,
  onActive: () => Promise<void> | void,
): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const sub = await loadGroupSubscription(groupId);
    if (sub?.subscription_tier === expectedTier) {
      await onActive();
      return true;
    }
  }
  await onActive();
  return false;
}

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export default function GroupSettingsScreen({ navigation, route }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const params = route.params as { groupId: string; groupName: string };
  const { groupId } = params;
  const userId = useSelector((s: RootState) => s.app.userId);
  const cloudGroups = useSelector((s: RootState) => s.app.cloudGroups ?? []);
  const myGroup = cloudGroups.find(g => g.id === groupId);

  const [members, setMembers] = useState<GroupMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [name, setName] = useState(params.groupName);
  const [challenge, setChallenge] = useState(myGroup?.pinned_challenge ?? '');
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [pending, setPending] = useState<PendingGroupMember[]>([]);

  // Subscription
  const [subscription, setSubscription] = useState<GroupSubscription | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  // Set when the user taps a tier card and we send them to Stripe.
  // The AppState listener uses this to know which tier to poll for
  // when they return to the app.
  const awaitingTierRef = useRef<TierId | null>(null);

  const isAdmin = myGroup?.my_role === 'admin';

  const fetchMembers = useCallback(async () => {
    const [lb, invs, pend, sub, tierData] = await Promise.all([
      getGroupLeaderboard(groupId),
      isAdmin ? loadEntityInvitations('group', groupId) : Promise.resolve([]),
      isAdmin ? getGroupPendingMembers(groupId) : Promise.resolve([]),
      isAdmin ? loadGroupSubscription(groupId) : Promise.resolve(null),
      isAdmin ? loadSubscriptionTiers() : Promise.resolve([]),
    ]);
    setMembers(lb);
    setSentInvitations(invs);
    setPending(pend);
    setSubscription(sub);
    setTiers(tierData);
  }, [groupId, userId, isAdmin]);

  // When the user returns from the Stripe browser tab, the webhook may
  // have already activated the new tier. Poll the subscription a few
  // times to surface the new state without forcing a manual refresh.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !awaitingTierRef.current) return;
      const expected = awaitingTierRef.current;
      awaitingTierRef.current = null;
      const activated = await waitForGroupTierActivation(groupId, expected, fetchMembers);
      if (activated) {
        const name = tiers.find((t) => t.id === expected)?.name ?? expected;
        showAlert('Activated', `${name} plan is now active.`);
      }
    });
    return () => sub.remove();
  }, [groupId, fetchMembers, tiers]);

  const handleApprove = async (target: PendingGroupMember) => {
    const ok = await approveGroupMember(groupId, target.user_id);
    if (ok) fetchMembers();
    else showAlert('Error', 'Could not approve member.');
  };

  const handleDecline = async (target: PendingGroupMember) => {
    // "Decline" just removes the pending row — same RPC as kicking a member.
    const ok = await removeMember(groupId, target.user_id);
    if (ok) fetchMembers();
    else showAlert('Error', 'Could not decline request.');
  };

  useEffect(() => {
    fetchMembers().finally(() => setLoading(false));
  }, [fetchMembers]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await renameGroup(groupId, name.trim());
    setSaving(false);
    if (ok) showAlert('Saved', 'Group name updated.');
    else showAlert('Error', 'Could not rename group.');
  };

  const handleSaveChallenge = async () => {
    setSaving(true);
    const ok = await pinChallenge(groupId, challenge.trim() || null);
    setSaving(false);
    if (ok) showAlert('Saved', challenge.trim() ? 'Challenge pinned!' : 'Challenge removed.');
    else showAlert('Error', 'Could not update challenge.');
  };

  const handleRemoveMember = (member: GroupMemberInfo) => {
    if (member.user_id === userId) {
      showAlert("Can't remove yourself", 'Use "Leave Group" instead.');
      return;
    }
    showAlert(
      'Remove member?',
      `Remove ${member.display_name} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            const ok = await removeMember(groupId, member.user_id);
            if (ok) {
              await fetchMembers();
              showAlert('Removed', `${member.display_name} has been removed.`);
            }
          },
        },
      ]
    );
  };

  const INVITE_BASE_URL = 'https://onecompliment.app/join';

  const shareInviteLink = async () => {
    if (!myGroup?.invite_code) return;
    const link = `${INVITE_BASE_URL}/group/${myGroup.invite_code}`;
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
      const result = await sendGroupInvitations(groupId, emails);
      if ('error' in result) {
        showAlert('Error', result.error);
        return;
      }
      setEmailInput('');
      fetchMembers();

      const summary = `${result.sent} invitation${result.sent !== 1 ? 's' : ''} saved.${
        result.skipped > 0 ? ` ${result.skipped} skipped.` : ''
      }`;

      // Server sent the email via SMTP → done.
      if (result.emailDelivered) {
        showAlert('Invitations Sent', `${summary}\n\nEmails are on the way.`);
        return;
      }

      // SMTP not configured (or failed) but DB has pending invites.
      // Open the system share sheet so the admin can send the link via
      // whatever app they have (email, WhatsApp, SMS, etc.). More reliable
      // than mailto: on emulators / phones without a default mail app.
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Group Settings</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.gold} style={{ marginTop: 32 }} />
      ) : (
        <>
          {/* Invite link */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>INVITE LINK</Text>
            <Pressable style={styles.codeRow} onPress={shareInviteLink}>
              <Text style={[styles.codeText, { fontSize: 13, letterSpacing: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                {myGroup?.invite_code ? `onecompliment.app/join/group/${myGroup.invite_code}` : '—'}
              </Text>
              <ClipboardIcon size={16} color={theme.colors.dim} />
            </Pressable>
            <Text style={styles.hint}>Tap to share — anyone with this link can join your group.</Text>
          </View>

          {/* Invite by email */}
          {isAdmin && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>INVITE BY EMAIL</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, lineHeight: 24 }]}
                placeholder="Enter emails separated by commas&#10;e.g. friend@email.com, mom@email.com"
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
                style={[styles.saveBtn, (!emailInput.trim() || sendingInvites) && { opacity: 0.38 }]}
                onPress={handleSendInvites}
                disabled={!emailInput.trim() || sendingInvites}
              >
                <Text style={styles.saveBtnText}>
                  {sendingInvites ? 'Sending...' : 'Send Invitations'}
                </Text>
              </Pressable>
              <Text style={styles.hint}>
                Invitees will see the invitation when they link their email. Expires in 7 days.
              </Text>

              {sentInvitations.length > 0 && (
                <View style={{ gap: 6, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.dim }}>Sent Invitations</Text>
                  {sentInvitations.map(inv => (
                    <View key={inv.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.bord }}>
                      <Text style={{ fontSize: 13, color: theme.colors.text }}>{inv.email}</Text>
                      <Text style={{ fontSize: 11, color: inv.status === 'accepted' ? '#4ECDC4' : inv.status === 'expired' ? 'rgba(255,100,100,0.6)' : theme.colors.faint, textTransform: 'capitalize' }}>
                        {inv.status}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Rename group */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>GROUP NAME</Text>
            <View style={styles.editRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={name}
                onChangeText={setName}
                maxLength={40}
              />
              <Pressable style={styles.saveBtn} onPress={handleSaveName} disabled={saving}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>

          {/* Pin challenge */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>PINNED CHALLENGE / THEME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Compliment someone's work ethic"
              placeholderTextColor={theme.colors.faint}
              value={challenge}
              onChangeText={setChallenge}
              maxLength={100}
            />
            {(challenge.trim() || myGroup?.pinned_challenge) && (
              <View style={styles.challengeActions}>
                <Pressable style={[styles.saveBtn, { flex: 1 }]} onPress={handleSaveChallenge} disabled={saving || !challenge.trim()}>
                  <Text style={styles.saveBtnText}>Pin Challenge</Text>
                </Pressable>
                <Pressable
                  style={styles.clearBtn}
                  onPress={() => {
                    setChallenge('');
                    (async () => {
                      setSaving(true);
                      const ok = await pinChallenge(groupId, null);
                      setSaving(false);
                      if (ok) showAlert('Cleared', 'Challenge removed.');
                    })();
                  }}
                  disabled={saving}
                >
                  <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Pending approvals (admin only) */}
          {isAdmin && pending.length > 0 && (
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
                    onPress={() => handleApprove(p)}
                  >
                    <Text style={styles.saveBtnText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.removeBtn, { marginLeft: 8 }]}
                    onPress={() => handleDecline(p)}
                  >
                    <TrashIcon size={16} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Manage members */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>MEMBERS ({members.length})</Text>
            {members.map(m => (
              <View key={m.user_id} style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: m.color }]}>
                  <Text style={styles.avatarText}>{m.display_name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.display_name}
                    {m.user_id === userId ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.memberRole}>{m.role === 'admin' ? 'Admin' : 'Member'}</Text>
                </View>
                {m.user_id !== userId && (
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => handleRemoveMember(m)}
                  >
                    <TrashIcon size={16} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          {/* Subscription — admin only. Free plan (no row) caps at 10 members;
              paid tiers reuse the team_subscription_tiers catalog. */}
          {isAdmin && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>

              {subscription?.tier_id ? (
                <View style={styles.currentPlan}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{subscription.tier_name} Plan</Text>
                    <Text style={styles.planMeta}>
                      {subscription.max_members
                        ? `Up to ${subscription.max_members} members`
                        : 'Unlimited members'}
                      {subscription.price_monthly != null ? ` · $${subscription.price_monthly}/mo` : ''}
                    </Text>
                    <Text style={styles.planMeta}>
                      {subscription.status === 'active' ? '✓ Active' : subscription.status}
                      {subscription.cancel_at_period_end ? ' · Cancels at period end' : ''}
                    </Text>
                  </View>
                  <Text style={styles.planSeats}>
                    {subscription.current_members}/{subscription.max_members ?? '∞'}
                  </Text>
                </View>
              ) : (
                <View style={styles.currentPlan}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>Free Plan</Text>
                    <Text style={styles.planMeta}>Up to {FREE_GROUP_LIMIT} members · $0/mo</Text>
                    <Text style={styles.planMeta}>✓ Active</Text>
                  </View>
                  <Text style={styles.planSeats}>
                    {subscription?.current_members ?? members.length}/{FREE_GROUP_LIMIT}
                  </Text>
                </View>
              )}

              {/* Tier options — opens Stripe checkout in the system browser.
                  Apple Guideline 3.1.3(b) Multiplatform Services explicitly
                  permits B2B subscriptions to be sold outside IAP. */}
              {tiers.length > 0 && (
                <View style={styles.tierList}>
                  {tiers.map(tier => {
                    const isCurrent = subscription?.subscription_tier === tier.id;
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
                                  const stripeUrl = getGroupStripeUrl(tierId);
                                  if (!stripeUrl) {
                                    // No Payment Link configured — never open
                                    // another tier's (wrong-price) checkout.
                                    showAlert(
                                      'Checkout unavailable',
                                      `Checkout for ${tier.name} isn’t set up yet. Email info@onecompliment.app and we’ll get you started.`
                                    );
                                    return;
                                  }
                                  const url = withGroupRef(stripeUrl, groupId, tierId);
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
        </>
      )}
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 16 },
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
  placeholder: { color: theme.colors.faint },
  saveBtn: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.gold, paddingVertical: 8, textAlign: 'center' },
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
  removeBtn: {
    borderWidth: 1,
    borderColor: theme.colors.dangerBord,
    borderRadius: 8,
    padding: 8,
  },

  // ── Subscription ──
  currentPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 12,
    padding: 14,
  },
  planName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  planMeta: { fontSize: 12, color: theme.colors.faint, marginTop: 2 },
  planSeats: { fontSize: 20, fontWeight: '700', color: theme.colors.gold },
  tierList: { gap: 8 },
  tierCard: {
    borderWidth: 1, borderColor: theme.colors.bord, borderRadius: 12, padding: 14, gap: 4,
  },
  tierCardActive: {
    borderColor: theme.colors.goldCardBord, backgroundColor: theme.colors.goldCardBg,
  },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  tierNameActive: { color: theme.colors.gold },
  tierBadge: {
    fontSize: 9, letterSpacing: 1.5, color: theme.colors.gold, fontWeight: '700',
  },
  tierPrice: { fontSize: 13, color: theme.colors.dim },
  tierLimit: { fontSize: 12, color: theme.colors.faint },
}));
