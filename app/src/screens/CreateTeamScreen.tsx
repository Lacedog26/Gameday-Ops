import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Keyboard } from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setTeams } from '../store/appSlice';
import { createTeam, loadMyTeams, TeamType } from '../utils/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = { navigation: NativeStackNavigationProp<any> };

const TEAM_TYPES: { key: TeamType; icon: string; label: string; desc: string }[] = [
  { key: 'general', icon: '🏠', label: 'General', desc: 'Casual team for friends, family, or any group.' },
  { key: 'organization', icon: '🏢', label: 'Organization', desc: 'For companies & professional teams. No moderation.' },
  { key: 'school', icon: '🏫', label: 'School', desc: 'Teacher-moderated. COPPA/FERPA safe. Approval required.' },
];

export default function CreateTeamScreen({ navigation }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const username = useSelector((s: RootState) => s.app.username);

  const [step, setStep] = useState<'type' | 'details' | 'school-setup'>('type');
  const [teamType, setTeamType] = useState<TeamType>('general');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const handleNext = () => {
    if (teamType === 'school') {
      setStep('school-setup');
    } else {
      setStep('details');
    }
  };

  const handleCreate = async () => {
    if (!canSave) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      const result = await createTeam(name.trim(), teamType, username || 'Admin', description.trim() || undefined);
      if ('error' in result) {
        showAlert('Error', result.error);
        return;
      }
      const teams = await loadMyTeams();
      dispatch(setTeams(teams));
      showAlert(
        '⏳ Team submitted for approval',
        'Your team has been created and is now waiting for a OneCompliment admin to approve it. You\'ll be able to invite members and post compliments once it\'s approved.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => {
        if (step === 'type') navigation.goBack();
        else setStep('type');
      }}>
        <Text style={styles.back}>{step === 'type' ? '← Back' : '← Change Type'}</Text>
      </Pressable>

      {/* Step 1: Team Type Selection */}
      {step === 'type' && (
        <>
          <Text style={styles.title}>Create a Team</Text>
          <View style={styles.section}>
            <Text style={styles.label}>CHOOSE TEAM TYPE</Text>
            {TEAM_TYPES.map(t => (
              <Pressable
                key={t.key}
                style={[styles.typeCard, teamType === t.key && styles.typeCardActive]}
                onPress={() => setTeamType(t.key)}
              >
                <View style={styles.typeHeader}>
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <Text style={[styles.typeLabel, teamType === t.key && styles.typeLabelActive]}>{t.label}</Text>
                  {teamType === t.key && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.typeDesc}>{t.desc}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.btn} onPress={handleNext}>
            <Text style={styles.btnText}>Next →</Text>
          </Pressable>
        </>
      )}

      {/* Step 2a: School Setup Wizard */}
      {step === 'school-setup' && (
        <>
          <Text style={styles.title}>🏫 Set Up Your Classroom</Text>
          <Text style={styles.subtitle}>
            OneCompliment helps students practice intentional kindness through daily challenges.
          </Text>

          <View style={styles.wizardCard}>
            <Text style={styles.wizardStepNum}>How it works for teachers</Text>
            <View style={styles.wizardStep}>
              <Text style={styles.wizardBullet}>1.</Text>
              <Text style={styles.wizardText}>Create your team and share the invite code with students.</Text>
            </View>
            <View style={styles.wizardStep}>
              <Text style={styles.wizardBullet}>2.</Text>
              <Text style={styles.wizardText}>Students complete daily challenges. All submissions require your approval before anyone sees them.</Text>
            </View>
            <View style={styles.wizardStep}>
              <Text style={styles.wizardBullet}>3.</Text>
              <Text style={styles.wizardText}>Review, approve, or reject in the Moderation tab. Toggle shared visibility so students can see approved responses.</Text>
            </View>
            <View style={styles.wizardStep}>
              <Text style={styles.wizardBullet}>4.</Text>
              <Text style={styles.wizardText}>Write your own custom prompts or use the built-in daily challenges. Track participation in the Insights tab.</Text>
            </View>
          </View>

          <View style={styles.safetyCard}>
            <Text style={styles.safetyTitle}>Safety & Compliance</Text>
            <Text style={styles.safetyItem}>✓ Teacher approval required on all submissions</Text>
            <Text style={styles.safetyItem}>✓ Content filtering enabled by default</Text>
            <Text style={styles.safetyItem}>✓ No direct messaging between students</Text>
            <Text style={styles.safetyItem}>✓ Shared visibility controlled by teacher</Text>
            <Text style={styles.safetyItem}>✓ Optional parent visibility mode</Text>
            <Text style={styles.safetyItem}>✓ No personal data collected from minors</Text>
          </View>

          {/* Name + Description inline */}
          <View style={styles.section}>
            <Text style={styles.label}>CLASS NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mr. Smith's 3rd Period"
              placeholderTextColor={theme.colors.faint}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="e.g. 8th Grade English — Period 3"
              placeholderTextColor={theme.colors.faint}
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          <Pressable style={[styles.btn, !canSave && styles.btnDisabled]} onPress={handleCreate} disabled={!canSave}>
            <Text style={styles.btnText}>{saving ? 'Creating...' : 'Create Classroom'}</Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            By creating a school team, you confirm that you are an authorized educator and that this tool will be used in compliance with your school's policies.
          </Text>
        </>
      )}

      {/* Step 2b: General / Organization Details */}
      {step === 'details' && (
        <>
          <Text style={styles.title}>
            {teamType === 'organization' ? '🏢 Organization Details' : '🏠 Team Details'}
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>TEAM NAME</Text>
            <TextInput
              style={styles.input}
              placeholder={teamType === 'organization' ? 'e.g. Acme Marketing Team' : 'e.g. Morning Crew'}
              placeholderTextColor={theme.colors.faint}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="What's this team about?"
              placeholderTextColor={theme.colors.faint}
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {teamType === 'organization' && (
            <View style={styles.orgInfoCard}>
              <Text style={styles.orgInfoTitle}>Organization teams include:</Text>
              <Text style={styles.orgInfoItem}>• Auto-approved submissions (no moderation queue)</Text>
              <Text style={styles.orgInfoItem}>• Leadership can set daily themes</Text>
              <Text style={styles.orgInfoItem}>• Completion rate tracking for managers</Text>
              <Text style={styles.orgInfoItem}>• Per-member participation analytics</Text>
            </View>
          )}

          <Pressable style={[styles.btn, !canSave && styles.btnDisabled]} onPress={handleCreate} disabled={!canSave}>
            <Text style={styles.btnText}>{saving ? 'Creating...' : 'Create Team'}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 20 },
  back: { color: theme.colors.faint, fontSize: 14 },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.dim, lineHeight: 22, marginTop: -8 },
  section: { gap: 10 },
  label: { fontSize: 10, letterSpacing: 2.5, color: theme.colors.gold, fontWeight: '600' },
  typeCard: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, padding: 16, gap: 6,
  },
  typeCardActive: {
    backgroundColor: theme.colors.goldCardBg, borderColor: theme.colors.goldCardBord,
  },
  typeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIcon: { fontSize: 24 },
  typeLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.text, flex: 1 },
  typeLabelActive: { color: theme.colors.gold },
  checkmark: { fontSize: 16, color: theme.colors.gold, fontWeight: '700' },
  typeDesc: { fontSize: 13, color: theme.colors.faint, lineHeight: 20 },
  input: {
    backgroundColor: theme.colors.inputBg, borderWidth: 1, borderColor: theme.colors.inputBord,
    borderRadius: 12, padding: 14, fontSize: 16, color: theme.colors.text,
  },
  textarea: { minHeight: 80, lineHeight: 24 },
  btn: {
    backgroundColor: theme.colors.gold, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.38 },
  btnText: { color: '#0C0C0C', fontSize: 16, fontWeight: '700' },
  // Wizard styles
  wizardCard: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, padding: 18, gap: 14,
  },
  wizardStepNum: {
    fontSize: 13, fontWeight: '700', color: theme.colors.gold,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  wizardStep: {
    flexDirection: 'row', gap: 10,
  },
  wizardBullet: {
    fontSize: 16, fontWeight: '700', color: theme.colors.gold, width: 20,
  },
  wizardText: {
    flex: 1, fontSize: 14, color: theme.colors.dim, lineHeight: 22,
  },
  safetyCard: {
    backgroundColor: 'rgba(168,230,207,0.06)', borderWidth: 1,
    borderColor: 'rgba(168,230,207,0.18)', borderRadius: 14, padding: 16, gap: 8,
  },
  safetyTitle: {
    fontSize: 14, fontWeight: '700', color: '#A8E6CF', marginBottom: 4,
  },
  safetyItem: {
    fontSize: 13, color: theme.colors.dim, lineHeight: 20,
  },
  orgInfoCard: {
    backgroundColor: 'rgba(195,177,225,0.06)', borderWidth: 1,
    borderColor: 'rgba(195,177,225,0.18)', borderRadius: 14, padding: 16, gap: 6,
  },
  orgInfoTitle: {
    fontSize: 14, fontWeight: '700', color: '#C3B1E1', marginBottom: 4,
  },
  orgInfoItem: {
    fontSize: 13, color: theme.colors.dim, lineHeight: 20,
  },
  disclaimer: {
    fontSize: 11, color: theme.colors.faint, textAlign: 'center', lineHeight: 17,
  },
}));
