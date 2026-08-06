import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Keyboard, Linking, ActivityIndicator } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../store';
import { setTeams, setCloudGroups } from '../store/appSlice';
import { createTeam, loadMyTeams, type TeamType } from '../utils/supabase';
import { createGroup, loadMyGroups } from '../utils/supabaseGroups';
import {
  getTeamStripeUrl, getGroupStripeUrl, withTeamRef, withGroupRef,
  type TeamTierId, type GroupTierId,
} from '../utils/stripeLinks';
import { showAlert } from '../components/CustomAlert';

type Tier = {
  id: 'free' | GroupTierId | TeamTierId;
  product: 'group' | 'team';
  name: string;
  price: string;
  members: string;
  blurb: string;
  emphasize?: boolean;
  isFree?: boolean;
};

// Cheapest first. Free creates a casual `groups` row; every paid tier
// (Small Group included) creates a `teams` row so Small Group sits on the
// same SaaS pricing ladder as Team / Growth / Enterprise — matches the
// client's "buying a plan on any SaaS site" framing.
const TIERS: Tier[] = [
  { id: 'free',         product: 'group', name: 'Free',        price: '$0/mo',     members: 'Up to 10 members', blurb: 'Casual group with friends or family. Upgrade anytime.', isFree: true },
  { id: 'small_group',  product: 'team',  name: 'Small Group', price: '$9.99/mo',  members: '10–25 members',    blurb: 'For a tight circle of friends, family, or a small club.' },
  { id: 'team',         product: 'team',  name: 'Team',        price: '$99/mo',    members: 'Up to 100',        blurb: 'For workplaces, classrooms, and small organizations.', emphasize: true },
  { id: 'growth',       product: 'team',  name: 'Growth',      price: '$299/mo',   members: 'Up to 500',        blurb: 'For mid-size orgs, larger schools, or multi-team rollouts.' },
  { id: 'enterprise',   product: 'team',  name: 'Enterprise',  price: '$499/mo',   members: 'Unlimited',        blurb: 'For schools, districts, and large organizations.' },
];

type TeamTypeMeta = { key: TeamType; icon: string; label: string; desc: string };
const TEAM_TYPES: TeamTypeMeta[] = [
  { key: 'general',      icon: '🏠', label: 'General',      desc: 'Casual team for friends, family, or any group.' },
  { key: 'organization', icon: '🏢', label: 'Organization', desc: 'Companies & professional teams. No moderation.' },
  { key: 'school',       icon: '🏫', label: 'School',       desc: 'Teacher-moderated. Approval required.' },
];

export default function ChoosePlanScreen() {
  const { styles, theme } = useStyles(stylesheet);
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const username = useSelector((s: RootState) => s.app.username);
  const isPro = useSelector((s: RootState) => s.app.isPro);
  const cloudGroups = useSelector((s: RootState) => s.app.cloudGroups);

  const [selected, setSelected] = useState<Tier | null>(null);
  const [name, setName]         = useState('');
  const [description, setDescription] = useState('');
  const [teamType, setTeamType] = useState<TeamType>('general');
  const [busy, setBusy]         = useState(false);

  const product: 'group' | 'team' | null = selected?.product ?? null;
  const isFree       = selected?.isFree ?? false;
  const showNameForm = selected !== null;
  const canSubmit    = name.trim().length > 0 && !busy && showNameForm;

  const handleContinue = async () => {
    if (!canSubmit || !selected) return;
    Keyboard.dismiss();
    setBusy(true);
    try {
      if (product === 'group') {
        // Free 8-group limit — same gate as GroupsScreen's modals; this
        // was the one create path that bypassed it. The server now
        // enforces it too (create_group, 20260617), this check just
        // gives the friendly upsell instead of a raw RPC error.
        if (!isPro && cloudGroups.length >= 8) {
          showAlert('Group Limit Reached', 'Free accounts support up to 8 groups. Upgrade to Pro for unlimited groups.', [
            { text: 'Not now', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => navigation.navigate('Pro') },
          ]);
          return;
        }
        // Resolve the Payment Link before creating anything — a missing
        // link must not leave an orphan row or fall through to a
        // wrong-price checkout.
        const groupStripeUrl = isFree ? null : getGroupStripeUrl('small_group');
        if (!isFree && !groupStripeUrl) {
          showAlert(
            'Checkout unavailable',
            'Checkout for this tier isn’t set up yet. Email info@onecompliment.app and we’ll get you started.'
          );
          return;
        }
        // Free / Small Group — both create a row in `groups`.
        const result = await createGroup(name.trim(), username || 'Member');
        if (!result) {
          showAlert('Error', 'Could not create the group. Try again in a moment.');
          return;
        }
        const groups = await loadMyGroups();
        dispatch(setCloudGroups(groups));

        if (isFree) {
          showAlert(
            '✓ Free group created',
            'You can invite up to 10 members. Upgrade anytime from group settings.',
            [{ text: 'Open', onPress: () => navigation.goBack() }]
          );
          return;
        }

        // Small Group → Stripe Payment Link (checked non-null above)
        const url = withGroupRef(groupStripeUrl!, result.group_id, 'small_group');
        await Linking.openURL(url);
        showAlert(
          'Almost there',
          'Complete payment in your browser to activate Small Group. Come back to the app when you\'re done.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // product === 'team' — team/growth/enterprise
      const tierId = selected.id as TeamTierId;
      const teamStripeUrl = getTeamStripeUrl(tierId);
      if (!teamStripeUrl) {
        showAlert(
          'Checkout unavailable',
          'Checkout for this tier isn’t set up yet. Email info@onecompliment.app and we’ll get you started.'
        );
        return;
      }
      const createRes = await createTeam(
        name.trim(),
        teamType,
        username || 'Admin',
        description.trim() || undefined
      );
      if ('error' in createRes) {
        showAlert('Error', createRes.error);
        return;
      }
      const teams = await loadMyTeams();
      dispatch(setTeams(teams));

      const url = withTeamRef(teamStripeUrl, createRes.team_id, tierId);
      await Linking.openURL(url);
      showAlert(
        '⏳ Team submitted',
        'Your team is awaiting OneCompliment approval. After it\'s approved AND payment is complete, you can invite members.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      showAlert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      <View style={styles.titleRow}>
        <Text style={styles.title}>Choose your plan</Text>
        <Text style={styles.subtitle}>
          Pick a tier first, then name your {product === 'team' ? 'team' : 'group'}. You can change names later — tier requires a fresh payment.
        </Text>
      </View>

      {/* All tiers — Free at the top, then paid (cheapest first). */}
      <View style={styles.tierList}>
        {TIERS.map((t) => {
          const active = selected?.id === t.id;
          return (
            <Pressable
              key={t.id}
              style={[
                styles.tierCard,
                t.emphasize && styles.tierCardEmphasis,
                active && styles.tierCardActive,
              ]}
              onPress={() => setSelected(t)}
            >
              <View style={styles.tierHeader}>
                <Text style={[styles.tierName, active && styles.tierNameActive]}>{t.name}</Text>
                {t.isFree && !active && <Text style={styles.freeBadge}>FREE</Text>}
                {t.emphasize && !active && <Text style={styles.popular}>POPULAR</Text>}
                {active && <Text style={styles.tierCheck}>✓</Text>}
              </View>
              <Text style={[styles.tierPrice, active && styles.tierPriceActive]}>{t.price}</Text>
              <Text style={styles.tierMembers}>{t.members}</Text>
              <Text style={styles.tierBlurb}>{t.blurb}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Name + (for teams) type form, only after a selection */}
      {showNameForm && (
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>
            NAME YOUR {product === 'team' ? 'TEAM' : 'GROUP'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={product === 'team' ? 'e.g. Mrs. Lee\'s 4th Grade' : 'e.g. Saturday Hike Crew'}
            placeholderTextColor={theme.colors.faint}
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoFocus
          />

          {product === 'team' && (
            <>
              <Text style={[styles.formLabel, { marginTop: 16 }]}>TEAM TYPE</Text>
              {TEAM_TYPES.map(t => (
                <Pressable
                  key={t.key}
                  style={[styles.typeCard, teamType === t.key && styles.typeCardActive]}
                  onPress={() => setTeamType(t.key)}
                >
                  <View style={styles.typeHeader}>
                    <Text style={styles.typeIcon}>{t.icon}</Text>
                    <Text style={[styles.typeLabel, teamType === t.key && styles.typeLabelActive]}>
                      {t.label}
                    </Text>
                    {teamType === t.key && <Text style={styles.tierCheck}>✓</Text>}
                  </View>
                  <Text style={styles.typeDesc}>{t.desc}</Text>
                </Pressable>
              ))}

              <Text style={[styles.formLabel, { marginTop: 16 }]}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="What's this team for?"
                placeholderTextColor={theme.colors.faint}
                value={description}
                onChangeText={setDescription}
                maxLength={200}
                multiline
              />
            </>
          )}

          <Pressable
            style={[styles.cta, !canSubmit && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={!canSubmit}
          >
            {busy ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text style={styles.ctaText}>
                {isFree
                  ? 'Create free group'
                  : `Continue to payment · ${selected!.price}`}
              </Text>
            )}
          </Pressable>

          {!isFree && (
            <Text style={styles.footerNote}>
              You'll be sent to Stripe to complete payment. Your {product} is created immediately;
              full features unlock when payment confirms (usually seconds).
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingBottom: 80, gap: 16 },
  back: { color: theme.colors.faint, fontSize: 14 },
  titleRow: { gap: 6 },
  title:    { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.dim, lineHeight: 20 },

  tierList: { gap: 10 },
  tierCard: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, padding: 16, gap: 4,
  },
  tierCardEmphasis: {
    borderColor: 'rgba(245,200,66,0.45)',
  },
  tierCardActive: {
    backgroundColor: 'rgba(245,200,66,0.07)',
    borderColor: theme.colors.gold,
    borderWidth: 2,
    padding: 15,
  },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierName: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.colors.text },
  tierNameActive: { color: theme.colors.gold },
  popular: {
    fontSize: 9, letterSpacing: 1.2, fontWeight: '700',
    color: theme.colors.gold,
    backgroundColor: 'rgba(245,200,66,0.12)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  freeBadge: {
    fontSize: 9, letterSpacing: 1.2, fontWeight: '700',
    color: '#A8E6CF',
    backgroundColor: 'rgba(168,230,207,0.12)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  tierCheck: { fontSize: 16, color: theme.colors.gold, fontWeight: '700' },
  tierPrice: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  tierPriceActive: { color: theme.colors.gold },
  tierMembers: { fontSize: 12, color: theme.colors.faint, marginTop: 2 },
  tierBlurb:   { fontSize: 12, color: theme.colors.dim, lineHeight: 17, marginTop: 6 },

  formCard: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, padding: 16, gap: 10,
    marginTop: 8,
  },
  formLabel: { fontSize: 10, letterSpacing: 1.5, color: theme.colors.faint, fontWeight: '600' },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1, borderColor: theme.colors.inputBord,
    borderRadius: 12, padding: 14,
    fontSize: 15, color: theme.colors.text,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  typeCard: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 12, padding: 12, gap: 4,
  },
  typeCardActive: {
    backgroundColor: 'rgba(245,200,66,0.07)',
    borderColor: theme.colors.gold,
  },
  typeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeIcon:   { fontSize: 18 },
  typeLabel:  { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
  typeLabelActive: { color: theme.colors.gold },
  typeDesc:   { fontSize: 12, color: theme.colors.faint, lineHeight: 17 },

  cta: {
    backgroundColor: theme.colors.gold,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginTop: 6,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#0D0D0D', fontSize: 15, fontWeight: '700' },
  footerNote: {
    fontSize: 11, color: theme.colors.faint, lineHeight: 16,
    textAlign: 'center', marginTop: 4,
  },
}));
