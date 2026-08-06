import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Linking, Keyboard } from 'react-native';
import { showAlert } from '../components/CustomAlert';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import {
  SchoolIcon, TrophyIcon, ChurchIcon, BuildingIcon, HandshakeIcon, GradCapIcon,
  TargetIcon, FireIcon, TimerIcon, SeedlingIcon, SunflowerIcon,
} from '../components/icons';

const STEPS = [
  { num: '1', title: 'You set up a group', desc: 'Create a group for your team, class, or organization. Invite members with a link — no app download required.' },
  { num: '2', title: 'Everyone gets the same daily challenge', desc: "Each day there's one constraint: say it in 10 words, say it about a moment, say it out loud. The challenge makes it real." },
  { num: '3', title: 'Members write a genuine compliment', desc: "Each person chooses someone in their life — a teammate, a student, a coworker — and lifts them up using that day's rule." },
  { num: '4', title: 'The group streak grows together', desc: "When everyone blooms, the group streak goes up. Milestones at 7, 30, and 100 days. Don't let your squad down." },
];

const ORGS = [
  { iconKey: 'school', name: 'Schools', desc: 'Run a classroom kindness challenge. Build culture between students and staff.' },
  { iconKey: 'trophy', name: 'Sports Teams', desc: 'Strengthen team culture beyond the field. Coaches and players lift each other daily.' },
  { iconKey: 'church', name: 'Churches', desc: "Turn Sunday's message into a daily practice. A spiritual kindness habit for your congregation." },
  { iconKey: 'building', name: 'Companies', desc: 'Improve employee recognition and morale — with zero budget and zero overhead.' },
  { iconKey: 'handshake', name: 'Nonprofits', desc: 'Sustain the energy of volunteers and staff who give so much of themselves.' },
  { iconKey: 'gradcap', name: 'Universities', desc: 'Dorms, clubs, Greek life — any community that wants to feel more connected.' },
];

const WHY_ITEMS = [
  { iconKey: 'target', bold: 'Specificity builds trust.', text: ' When someone names exactly what you did and why it mattered, it lands completely differently than a generic compliment.' },
  { iconKey: 'fire', bold: 'Streaks create accountability.', text: " The group streak means no one wants to be the reason it breaks. Habits form around that." },
  { iconKey: 'timer', bold: 'Under 3 minutes keeps the bar low.', text: ' No workshops. No training. Just one genuine thing, once a day.' },
  { iconKey: 'seedling', bold: 'Consistency creates culture.', text: " A team that lifts each other daily for 30 days is a fundamentally different team than one that doesn't." },
];

const USE_CASES = [
  { iconKey: 'school', title: 'A high school English teacher in Texas', quote: 'She runs OneCompliment as a weekly Friday ritual. Students spend the last 5 minutes writing a compliment to someone outside class. She says the classroom atmosphere shifted within two weeks.' },
  { iconKey: 'trophy', title: 'A college soccer coach in Ohio', quote: "He uses it every preseason as a team bonding challenge. Players aren't allowed to compliment their own performance — only something they noticed in a teammate. The rule changes everything." },
  { iconKey: 'building', title: 'A remote team of 22 people', quote: 'Their HR lead set up a company-wide group during a rough quarter. They hit a 14-day streak together. "It was the most connected we\'d felt in months — and it cost nothing."' },
  { iconKey: 'church', title: 'A small church in North Carolina', quote: "Their pastor introduced it as a Lenten practice — one compliment, every day, for 40 days. Members said it became the most meaningful spiritual discipline they'd tried in years." },
];

function OrgIcon({ iconKey, size = 28 }: { iconKey: string; size?: number }) {
  switch (iconKey) {
    case 'school': return <SchoolIcon size={size} />;
    case 'trophy': return <TrophyIcon size={size} />;
    case 'church': return <ChurchIcon size={size} />;
    case 'building': return <BuildingIcon size={size} />;
    case 'handshake': return <HandshakeIcon size={size} />;
    case 'gradcap': return <GradCapIcon size={size} />;
    case 'target': return <TargetIcon size={size} />;
    case 'fire': return <FireIcon size={size} />;
    case 'timer': return <TimerIcon size={size} />;
    case 'seedling': return <SeedlingIcon size={size} />;
    default: return <SunflowerIcon size={size} />;
  }
}

export default function TeamsScreen() {
  const { styles, theme } = useStyles(stylesheet);
  const scrollRef = useRef<ScrollView>(null);
  const formY = useRef(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orgRole, setOrgRole] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const scrollToForm = () => {
    scrollRef.current?.scrollTo({ y: formY.current, animated: true });
  };

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && orgRole.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const body = new URLSearchParams({
        'form-name': 'org-inquiry',
        'Source': 'App — Teams Page',
        'Submitted At': new Date().toISOString(),
        'Full Name': name.trim(),
        'Email Address': email.trim(),
        'Organization / Role': orgRole.trim(),
        'Group Size': groupSize.trim(),
        'Message': message.trim(),
      }).toString();

      // res.ok must be checked: fetch only rejects on network failure, so a
      // 404/500 from the form endpoint used to show the success state while
      // the inquiry went nowhere.
      const res = await fetch('https://onecompliment.app/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSubmitted(true);
    } catch {
      showAlert('Something went wrong', 'Please email us directly at info@onecompliment.app');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {/* HERO */}
      <View style={styles.heroBadge}>
        <View style={styles.heroBadgeRow}>
          <BuildingIcon size={14} color={theme.colors.gold} />
          <Text style={styles.heroBadgeText}> FOR ORGANIZATIONS</Text>
        </View>
      </View>
      <Text style={styles.h1}>
        One compliment.{'\n'}Every day.{'\n'}
        <Text style={{ color: theme.colors.gold, fontStyle: 'italic' }}>For your whole team.</Text>
      </Text>
      <View style={styles.heroSubRow}>
        <Text style={styles.heroSub}>OneC</Text>
        <SunflowerIcon size={18} />
        <Text style={styles.heroSub}>mpliment is a daily kindness challenge that makes the people around you feel seen — one person at a time, every single day.</Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statPill}><Text style={styles.statValue}>30</Text><Text style={styles.statLabel}>unique challenges</Text></View>
        <View style={styles.statPill}><Text style={styles.statValue}>&lt;3 min</Text><Text style={styles.statLabel}>per day</Text></View>
        <View style={styles.statPill}><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>apps to install</Text></View>
      </View>

      <Pressable style={styles.btn} onPress={scrollToForm}>
        <View style={styles.btnIconRow}>
          <SunflowerIcon size={18} />
          <Text style={styles.btnText}> Bring It to Your Team</Text>
        </View>
      </Pressable>

      <View style={styles.divider} />

      {/* HOW IT WORKS */}
      <Text style={styles.label}>HOW IT WORKS</Text>
      <Text style={styles.h2}>Simple enough that everyone actually does it.</Text>
      <View style={styles.steps}>
        {STEPS.map(s => (
          <View key={s.num} style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{s.num}</Text></View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {/* WHO IT'S FOR */}
      <Text style={styles.label}>WHO IT'S FOR</Text>
      <Text style={styles.h2}>Built for any group that wants to lift each other up.</Text>
      <View style={styles.orgGrid}>
        {ORGS.map(o => (
          <View key={o.name} style={styles.orgCard}>
            <OrgIcon iconKey={o.iconKey} size={28} />
            <Text style={styles.orgName}>{o.name}</Text>
            <Text style={styles.orgDesc}>{o.desc}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {/* WHY IT WORKS */}
      <Text style={styles.label}>WHY IT WORKS</Text>
      <Text style={styles.h2}>The constraint is the point.</Text>
      <Text style={styles.sectionSub}>
        Anyone can say "good job." The daily challenge forces something more specific, more honest, and more memorable.
      </Text>
      {WHY_ITEMS.map((w, i) => (
        <View key={i} style={styles.whyRow}>
          <OrgIcon iconKey={w.iconKey} size={20} />
          <Text style={styles.whyText}>
            <Text style={{ fontWeight: '700', color: theme.colors.text }}>{w.bold}</Text>
            {w.text}
          </Text>
        </View>
      ))}

      <View style={styles.divider} />

      {/* USE CASES */}
      <Text style={styles.label}>REAL EXAMPLES</Text>
      <Text style={styles.h2}>How teams are using it.</Text>
      {USE_CASES.map((uc, i) => (
        <View key={i} style={styles.useCaseCard}>
          <View style={styles.useCaseHeader}>
            <OrgIcon iconKey={uc.iconKey} size={22} />
            <Text style={styles.useCaseTitle}>{uc.title}</Text>
          </View>
          <Text style={styles.useCaseQuote}>{uc.quote}</Text>
        </View>
      ))}

      <View style={styles.divider} />

      {/* CTA CARD */}
      <View style={styles.ctaCard}>
        <SunflowerIcon size={48} />
        <Text style={[styles.h2, { textAlign: 'center' }]}>Ready to start a kindness challenge with your team?</Text>
        <Text style={styles.ctaSub}>It takes 2 minutes to set up. No app download. No account required for members. Just one challenge, every day.</Text>
        <Pressable style={styles.btn} onPress={scrollToForm}>
          <View style={styles.btnIconRow}>
            <SunflowerIcon size={18} />
            <Text style={styles.btnText}> Start a Team Challenge</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* CONTACT FORM */}
      <View onLayout={(e) => { formY.current = e.nativeEvent.layout.y; }} />
      <Text style={styles.labelGreen}>GET IN TOUCH</Text>
      <Text style={styles.h2}>Let's bring this to your team.</Text>
      <Text style={styles.sectionSub}>Tell us a little about your group. We'll reach out within 24 hours to help you get set up.</Text>

      <View style={styles.greenCard}>
        {!submitted ? (
          <View style={styles.formWrap}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>YOUR NAME</Text>
              <TextInput style={styles.input} placeholder="First and last name" placeholderTextColor={theme.colors.faint} value={name} onChangeText={setName} maxLength={80} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput style={styles.input} placeholder="you@yourorg.com" placeholderTextColor={theme.colors.faint} value={email} onChangeText={setEmail} maxLength={120} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ORGANIZATION & ROLE</Text>
              <TextInput style={styles.input} placeholder="e.g. Lincoln High School — PE Teacher" placeholderTextColor={theme.colors.faint} value={orgRole} onChangeText={setOrgRole} maxLength={120} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GROUP SIZE</Text>
              <TextInput style={styles.input} placeholder="e.g. 25 students, 12 staff members..." placeholderTextColor={theme.colors.faint} value={groupSize} onChangeText={setGroupSize} maxLength={80} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ANYTHING ELSE?</Text>
              <TextInput style={[styles.input, styles.textarea]} placeholder="Tell us about your group and what you're hoping to create..." placeholderTextColor={theme.colors.faint} value={message} onChangeText={setMessage} maxLength={500} multiline numberOfLines={4} textAlignVertical="top" />
            </View>
            <Text style={styles.formDisclaimer}>
              By submitting this form, you agree to our Privacy Policy and consent to being contacted about your inquiry.
            </Text>
            <Pressable style={[styles.btn, !canSubmit && styles.btnDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
              <Text style={styles.btnText}>{submitting ? 'Sending...' : 'Talk to Us →'}</Text>
            </Pressable>
            <Text style={styles.formNote}>We read every message. Usually respond same day.</Text>
          </View>
        ) : (
          <View style={styles.thanksWrap}>
            <SunflowerIcon size={48} />
            <Text style={styles.thanksTitle}>Thank you!</Text>
            <Text style={styles.thanksSub}>We got your message and will be in touch within 24 hours.</Text>
          </View>
        )}
      </View>

      <Text style={styles.emailNote}>
        Or reach us directly at{' '}
        <Text style={{ color: theme.colors.gold }} onPress={() => Linking.openURL('mailto:info@onecompliment.app')}>
          info@onecompliment.app
        </Text>
      </Text>

      {/* FOOTER */}
      <View style={styles.divider} />
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLogo}>One</Text>
          <View style={styles.footerLogoRow}>
            <Text style={styles.footerLogo}>C</Text>
            <SunflowerIcon size={16} />
            <Text style={styles.footerLogo}>mpliment</Text>
          </View>
        </View>
        <Text style={styles.footerSub}>One compliment. Every day. · onecompliment.app</Text>
        <Pressable onPress={() => Linking.openURL('https://onecompliment.app/privacy')}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 20,
  },

  /* HERO */
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,200,66,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroBadgeText: {
    fontSize: 11,
    color: theme.colors.gold,
    letterSpacing: 1.2,
  },
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    color: theme.colors.text,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  heroSub: {
    fontSize: 18,
    color: theme.colors.dim,
    lineHeight: 32,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    color: theme.colors.text,
  },
  sectionSub: {
    fontSize: 16,
    color: theme.colors.dim,
    lineHeight: 28,
  },

  /* STATS */
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.faint,
    marginTop: 4,
  },

  /* BUTTONS */
  btn: {
    backgroundColor: theme.colors.gold,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  btnIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.38,
  },

  /* DIVIDER */
  divider: {
    height: 1,
    backgroundColor: theme.colors.bord,
    marginVertical: 8,
  },

  /* LABELS */
  label: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: theme.colors.gold,
    fontWeight: '600',
  },
  labelGreen: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: theme.colors.green,
    fontWeight: '600',
  },

  /* STEPS */
  steps: {
    gap: 20,
  },
  step: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245,200,66,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  stepBody: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  stepDesc: {
    fontSize: 14,
    color: theme.colors.faint,
    lineHeight: 24,
  },

  /* ORG GRID */
  orgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  orgCard: {
    width: '47%',
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 14,
    padding: 18,
    gap: 6,
  },
  orgName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  orgDesc: {
    fontSize: 12,
    color: theme.colors.faint,
    lineHeight: 19,
  },

  /* WHY */
  whyRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 12,
    padding: 14,
  },
  whyText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.dim,
    lineHeight: 24,
  },

  /* USE CASES */
  useCaseCard: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 14,
    padding: 18,
    gap: 8,
  },
  useCaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  useCaseTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  useCaseQuote: {
    fontSize: 13,
    fontStyle: 'italic',
    color: theme.colors.dim,
    lineHeight: 22,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(245,200,66,0.30)',
  },

  /* CTA CARD */
  ctaCard: {
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: 16,
    padding: 32,
    gap: 18,
    alignItems: 'center',
  },
  ctaSub: {
    fontSize: 15,
    color: theme.colors.dim,
    lineHeight: 26,
    textAlign: 'center',
  },

  /* FORM */
  greenCard: {
    backgroundColor: 'rgba(168,230,207,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(168,230,207,0.18)',
    borderRadius: 16,
    padding: 20,
  },
  formWrap: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 2,
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
  textarea: {
    minHeight: 100,
    lineHeight: 26,
  },
  formDisclaimer: {
    fontSize: 11,
    color: theme.colors.faint,
    textAlign: 'center',
    lineHeight: 17,
  },
  formNote: {
    fontSize: 11,
    color: theme.colors.faint,
    textAlign: 'center',
  },
  thanksWrap: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  thanksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.green,
  },
  thanksSub: {
    fontSize: 14,
    color: theme.colors.dim,
    lineHeight: 24,
    textAlign: 'center',
  },
  emailNote: {
    fontSize: 13,
    color: theme.colors.faint,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* FOOTER */
  footer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  footerLogo: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  footerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerSub: {
    fontSize: 12,
    color: theme.colors.faint,
  },
  footerLink: {
    fontSize: 12,
    color: theme.colors.faint,
  },
}));
