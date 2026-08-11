import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Keyboard, ActivityIndicator, InputAccessoryView, Platform } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useSelector } from 'react-redux';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { RootState } from '../store';
import { resolveChallenge } from '../data/challenges';
import { todayLocal } from '../utils/dates';
import { searchUsers, resolveContactEmails, resolveContactPhones, UserSearchResult } from '../utils/supabase';
import { useContacts, type SimpleContact } from '../utils/useContacts';
import { showAlert } from '../components/CustomAlert';
import UsernameRequiredModal from '../components/UsernameRequiredModal';
import { SunIcon, SunflowerIcon } from '../components/icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function WriteScreen({ navigation }: Props) {
  const { styles, theme } = useStyles(stylesheet);
  const complimentHistory = useSelector((s: RootState) => s.app.complimentHistory);
  const username = useSelector((s: RootState) => s.app.username);

  // Setup modal: shown when there's no username AND the user hasn't already
  // started a verify flow from it. Without `setupDismissed`, the modal would
  // stay covering the LinkEmail sheet that slides up after OTP send (the
  // returning-user branch never sets a username, so `!username` alone is
  // still true). On screen re-focus we reopen the modal if the user backed
  // out of verify without completing it.
  const [setupDismissed, setSetupDismissed] = useState(false);
  const showSetup = !username && !setupDismissed;

  useFocusEffect(
    useCallback(() => {
      if (!username) setSetupDismissed(false);
    }, [username]),
  );

  // Guard: if a COMPLIMENT was already sent today, go back. (Kindness
  // redesign: lastChallengeDate now flips for ANY act of kindness, so
  // gating on it would lock users who logged a non-compliment act out of
  // the compliment flow. complimentHistory is the compliment-specific
  // signal.) Gated on isFocused so a returning-user email verify (which
  // lands today's compliment while LinkEmail is on top) can't pop Write
  // out from underneath the modal sheet — without this gate, both Brief
  // and Write's guards fire DURING verify and cascade-pop the stack.
  const isFocused = useIsFocused();
  const complimentedToday = complimentHistory.some(c => c.date === todayLocal());
  // Never yank a non-empty draft out from under the user: a background
  // history refresh (Recap's realtime hook fires even while this tab is
  // focused) can land a today-dated entry from another device mid-typing.
  // With text in the box we stay put — the server's one-per-day trigger is
  // the real dupe gate, and BloomScreen already treats "already completed
  // today" as success.
  const draftRef = useRef('');
  useEffect(() => {
    if (isFocused && complimentedToday && draftRef.current.trim().length === 0) {
      navigation.goBack();
    }
  }, [isFocused, complimentedToday]);

  // Clear the submitting lock whenever Write regains focus. When the
  // server submit fails inside BloomScreen, it routes back here so the
  // user can retry — but without this reset the Submit button would
  // still read "Submitting…" and stay disabled (the React state on this
  // screen was preserved by the native stack while Bloom was on top).
  useEffect(() => {
    if (isFocused) setSubmitting(false);
  }, [isFocused]);

  const todayChallenge = useSelector((s: RootState) => s.app.todayChallenge);
  const challenge = resolveChallenge(todayChallenge);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  // Identifier carried over when the recipient was picked from device
  // contacts. Lets the server match them to an existing account (by email)
  // and store a claim key for when they sign up. Cleared the moment the
  // user edits the name by hand or picks a registered user, since the
  // contact identity no longer applies to whatever they typed.
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Mirror of `response` for the bounce-guard above (ref keeps that
  // effect's deps stable — no re-run per keystroke).
  useEffect(() => { draftRef.current = response; }, [response]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Device contacts: surface real people in the picker so the empty state
  // doesn't feel like "type into the void." Permission is requested on tap
  // of the inline CTA; denial is silent (no nag) and typing still works.
  const { status: contactsStatus, contacts: deviceContacts, request: requestContacts } = useContacts();

  // Contacts already on OneCompliment → badge them with their @username.
  // Resolved once when the address book loads. Matched contacts already route
  // to that account at send time (the server matches by email OR phone — see
  // complete_daily_prompt); these maps just make the match visible up front.
  //   contactMatches      — key: lowercased email
  //   contactPhoneMatches — key: the raw contact.phone string (server-side
  //                         normalize_phone handles formatting differences)
  const [contactMatches, setContactMatches] = useState<Record<string, string>>({});
  const [contactPhoneMatches, setContactPhoneMatches] = useState<Record<string, string>>({});
  useEffect(() => {
    if (contactsStatus !== 'granted') return;
    let cancelled = false;
    const emails = deviceContacts.map(c => c.email).filter((e): e is string => !!e);
    const phones = deviceContacts.map(c => c.phone).filter((p): p is string => !!p);
    if (emails.length > 0) {
      resolveContactEmails(emails).then(map => { if (!cancelled) setContactMatches(map); });
    }
    if (phones.length > 0) {
      resolveContactPhones(phones).then(map => { if (!cancelled) setContactPhoneMatches(map); });
    }
    return () => { cancelled = true; };
  }, [contactsStatus, deviceContacts]);

  // Cap the list so a 2000-contact phone book doesn't ruin scroll perf.
  // When the user starts typing, we filter by name substring.
  const visibleContacts: SimpleContact[] = useMemo(() => {
    if (contactsStatus !== 'granted') return [];
    const q = recipientQuery.trim().toLowerCase();
    if (!q) return deviceContacts.slice(0, 30);
    return deviceContacts.filter(c => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [contactsStatus, deviceContacts, recipientQuery]);

  // Lift-anyone: a registered selection is preferred (recipient_id flows
  // through and they see it in their app), but a free-form name also
  // works — DoneScreen surfaces a share card for the sender to forward.
  // Strip a leading '@' from the free-text name: usernames are stored WITHOUT
  // it, so a "@handle" stored as recipient_name never matches the recipient's
  // username (LOWER(recipient_name)=LOWER(username)) and the compliment is
  // invisible in their Received tab (the Received·0 bug). A picked user's
  // username is already bare; stripping is a harmless no-op there.
  const recipientText = (selectedUser ? selectedUser.username : recipientQuery.trim()).replace(/^@+/, '');
  const canSubmit = response.trim().length > 4 && recipientText.length > 0 && !submitting;

  // Debounced user search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!recipientQuery.trim() || recipientQuery.trim().length < 2 || selectedUser) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchUsers(recipientQuery);
        // Defensive: an RPC row with a null/empty username would crash the
        // result list render (.charAt(0) on undefined). Filter them out.
        setSearchResults(results.filter(u => u && typeof u.username === 'string' && u.username.length > 0));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [recipientQuery, selectedUser]);

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setRecipientQuery(user.username);
    setSearchResults([]);
    // Registered user → recipient_id flows through; the contact identifier
    // is irrelevant (and could belong to a different person than the @user).
    setContactEmail(null);
    setContactPhone(null);
    Keyboard.dismiss();
  };

  // Tapping a device contact = free-form name fill. The existing OneCompliment
  // search still fires on this query in case the contact's name happens to
  // match a registered user; otherwise DoneScreen renders a share card.
  const handleSelectContact = (c: SimpleContact) => {
    setSelectedUser(null);
    setRecipientQuery(c.name);
    // Carry the contact's email/phone so the server can match them to an
    // existing account (by email) or store a claim key for signup.
    setContactEmail(c.email ?? null);
    setContactPhone(c.phone ?? null);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleClearRecipient = () => {
    setSelectedUser(null);
    setRecipientQuery('');
    setContactEmail(null);
    setContactPhone(null);
    setSearchResults([]);
  };

  const handleRecipientChange = (text: string) => {
    setRecipientQuery(text);
    // Hand-editing the name detaches it from the picked contact — the
    // stored identifier may no longer be the person they mean.
    setContactEmail(null);
    setContactPhone(null);
    if (selectedUser) {
      setSelectedUser(null);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setSubmitting(true);

    navigation.navigate('Bloom', {
      recipient: recipientText,
      // Null when the sender typed a free-form name — DoneScreen branches
      // its share UX on this so unregistered recipients get a "Send to X"
      // card instead of the generic streak share.
      recipientUserId: selectedUser?.user_id ?? null,
      // Contact identifiers (when picked from the phone book) so the server
      // can resolve the recipient to an existing account or hold the
      // compliment as pending until they claim it.
      recipientEmail: contactEmail,
      recipientPhone: contactPhone,
      response: response.trim(),
    });
  };

  return (
    <>
    <UsernameRequiredModal
      visible={showSetup}
      onCancel={() => navigation.goBack()}
      onComplete={() => {
        // Dismiss the modal so it doesn't reopen on the next render.
        // The modal is now username-only — email link / verify lives in
        // Settings → Link Email, so there's no OTP branch to handle
        // here. Kept the result-shape in the modal's onComplete prop
        // for API stability but we ignore email/emailSent at this site.
        setSetupDismissed(true);
      }}
    />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Back to Rules</Text>
      </Pressable>

      <View style={styles.headerWrap}>
        <Text style={styles.prompt}>{challenge.prompt}</Text>
        <View style={styles.ruleReminder}>
          <Text style={styles.ruleText}>{challenge.rule}</Text>
        </View>
      </View>

      {/* Recipient */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>WHO ARE YOU LIFTING?</Text>

        {selectedUser ? (
          <View style={styles.selectedUser}>
            <View style={styles.selectedAvatar}>
              <Text style={styles.selectedAvatarText}>
                {selectedUser.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName}>@{selectedUser.username}</Text>
            </View>
            <Pressable onPress={handleClearRecipient} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>×</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Search by username or pick a contact..."
              placeholderTextColor={theme.colors.faint}
              value={recipientQuery}
              onChangeText={handleRecipientChange}
              maxLength={40}
              autoCorrect={false}
              autoCapitalize="none"
              // Focus = "I want to pick someone now." Prompt for contacts
              // permission inline at that exact moment so the list can
              // appear below the input on first interaction. Already-
              // granted / already-denied are no-ops.
              onFocus={() => {
                if (contactsStatus === 'undetermined') {
                  requestContacts();
                }
              }}
            />

            {/* Search results dropdown */}
            {searching && (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color={theme.colors.gold} />
                <Text style={styles.searchLoadingText}>Searching...</Text>
              </View>
            )}

            {!searching && searchResults.length > 0 && (
              <View style={styles.resultsList}>
                {searchResults.map(user => (
                  <Pressable
                    key={user.user_id}
                    style={styles.resultRow}
                    onPress={() => handleSelectUser(user)}
                  >
                    <View style={styles.resultAvatar}>
                      <Text style={styles.resultAvatarText}>
                        {user.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>@{user.username}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {!searching && recipientQuery.trim().length >= 2 && searchResults.length === 0 && !selectedUser && (
              <View style={styles.noResults}>
                <Text style={[styles.noResultsText, { fontStyle: 'normal', color: theme.colors.text }]}>
                  Lift "{recipientQuery.trim()}" anyway
                </Text>
                <Text style={styles.noResultsText}>
                  They're not on OneCompliment yet — we'll make a card you can text them.
                </Text>
              </View>
            )}

            {/* Contacts list — shown when permission is granted. Pre-filtered
                by the same query that drives OneCompliment search, so as you
                type you see both surfaces narrow together. Focus on the input
                above prompts for permission on first use. */}
            {contactsStatus === 'granted' && visibleContacts.length > 0 && (
              <View style={styles.contactsList}>
                <Text style={styles.contactsHeader}>
                  {recipientQuery.trim() ? 'CONTACTS MATCHING' : 'FROM YOUR CONTACTS'}
                </Text>
                {visibleContacts.map(c => {
                  const match =
                    (c.email ? contactMatches[c.email.toLowerCase()] : undefined) ??
                    (c.phone ? contactPhoneMatches[c.phone] : undefined);
                  return (
                    <Pressable
                      key={c.id}
                      style={styles.contactRow}
                      onPress={() => handleSelectContact(c)}
                    >
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>{c.initial}</Text>
                      </View>
                      <Text style={styles.contactName} numberOfLines={1}>{c.name}</Text>
                      {match && (
                        <View style={styles.contactMatchBadge}>
                          <SunflowerIcon size={12} />
                          <Text style={styles.contactMatchText} numberOfLines={1}>@{match}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Compliment — word/char counts removed per design feedback
          (the 280 maxLength caps it anyway, and surfacing the numbers
          adds metadata noise without helping the user). */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>YOUR COMPLIMENT</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Write it here..."
          placeholderTextColor={theme.colors.faint}
          value={response}
          onChangeText={setResponse}
          maxLength={280}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          // iOS: surfaces a Done bar above the keyboard so the user
          // doesn't have to tap outside to dismiss + then scroll to
          // Submit. Android keyboards already have a dismiss key.
          inputAccessoryViewID={Platform.OS === 'ios' ? 'compliment-done' : undefined}
        />
      </View>

      {/* Submit */}
      <Pressable
        style={[styles.btn, !canSubmit && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        <View style={styles.btnRow}>
          <SunIcon size={18} color="#0C0C0C" />
          <Text style={styles.btnText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
        </View>
      </Pressable>
    </ScrollView>

    {/* Done bar above the iOS keyboard. Pinned to the keyboard frame
        — no layout impact when keyboard is dismissed. */}
    {Platform.OS === 'ios' && (
      <InputAccessoryView nativeID="compliment-done">
        <View style={styles.accessoryBar}>
          <Pressable onPress={Keyboard.dismiss} hitSlop={8}>
            <Text style={styles.accessoryDone}>Done</Text>
          </Pressable>
        </View>
      </InputAccessoryView>
    )}
    </>
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
  back: {
    color: theme.colors.faint,
    fontSize: 14,
  },
  headerWrap: {
    gap: 8,
  },
  prompt: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    color: theme.colors.text,
  },
  ruleReminder: {
    backgroundColor: theme.colors.ruleBoxBg,
    borderWidth: 1,
    borderColor: theme.colors.ruleBoxBord,
    borderRadius: theme.radius.sm,
    padding: 12,
  },
  ruleText: {
    fontSize: 13,
    color: theme.colors.dim,
    lineHeight: 21,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.text,
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
    minHeight: 120,
    lineHeight: 26,
  },
  accessoryBar: {
    backgroundColor: theme.colors.surf,
    borderTopWidth: 1,
    borderTopColor: theme.colors.bord,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  accessoryDone: {
    color: theme.colors.gold,
    fontSize: 15,
    fontWeight: '700',
  },

  // Selected user chip
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.goldCardBg,
    borderWidth: 1,
    borderColor: theme.colors.goldCardBord,
    borderRadius: 12,
    padding: 12,
  },
  selectedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  selectedUsername: {
    fontSize: 12,
    color: theme.colors.gold,
    marginTop: 1,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 18,
    color: theme.colors.faint,
    lineHeight: 20,
  },

  // Search results
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  searchLoadingText: {
    fontSize: 13,
    color: theme.colors.faint,
  },
  resultsList: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bord,
  },
  resultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C3B1E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  resultUsername: {
    fontSize: 12,
    color: theme.colors.faint,
    marginTop: 1,
  },
  noResults: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  noResultsText: {
    fontSize: 13,
    color: theme.colors.faint,
    fontStyle: 'italic',
  },

  // ── Contacts picker ──
  contactsList: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    backgroundColor: theme.colors.surf,
    overflow: 'hidden',
  },
  contactsHeader: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '600',
    color: theme.colors.faint,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.bord,
  },
  contactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A8E6CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  contactName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  contactMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.35)',
    maxWidth: 130,
  },
  contactMatchText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.gold,
  },

  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.gold,
    marginTop: -8,
  },

  btn: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.38,
  },
  btnText: {
    color: '#0C0C0C',
    fontSize: 16,
    fontWeight: '700',
  },
}));
