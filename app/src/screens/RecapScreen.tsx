import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootState } from '../store';
import { setComplimentHistory, setUnreadReceived } from '../store/appSlice';
import type { ComplimentEntry } from '../store/appSlice';
import { resolveChallenge, getDayOfYear, getNextMilestone, MILESTONES } from '../data/challenges';
import { loadComplimentHistory, loadReceivedCompliments, markReceivedRead, getHistoryGateInfo } from '../utils/supabase';
import type { ReceivedCompliment, HistoryGateInfo } from '../utils/supabase';
import { useReceivedComplimentsRealtime, useSentComplimentsRealtime } from '../utils/realtimeHooks';
import { localDateString } from '../utils/dates';
import { SunIcon, SunflowerIcon, FireIcon, SeedlingIcon, MedalIcon, SparkleIcon, StarIcon, RecapIcon } from '../components/icons';

// Compliment History is a Pro feature: free accounts see a 7-day window,
// Pro unlocks the full 365-day archive. The REAL gate is server-side
// (20260617_pro_server_enforcement.sql — the history RPCs clamp the
// lookback by profiles.is_pro), so free clients never receive archive
// rows. The client-side date filter below stays as defense-in-depth and
// the upsell count comes from get_history_gate_info. Mirrors the web
// History page (OneCompliment-site/src/pages/History.tsx).
const FREE_LOOKBACK_DAYS = 7;
const PRO_LOOKBACK_DAYS = 365;

// Local YYYY-MM-DD for `days` ago — the free-tier cutoff. Comparing
// against entry.date (also local YYYY-MM-DD) as plain strings is valid
// because the format is lexicographically ordered.
function cutoffDateString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateString(d);
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const today = localDateString();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yesterday = localDateString(yest);

  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';

  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RecapScreen() {
  const { styles, theme } = useStyles(stylesheet);
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const { streak, groups, lastChallengeDate, complimentHistory, todayChallenge, isPro } = useSelector((s: RootState) => s.app);
  const username = useSelector((s: RootState) => s.app.username);
  const userId = useSelector((s: RootState) => s.app.userId);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receivedCompliments, setReceivedCompliments] = useState<ReceivedCompliment[]>([]);
  const [expandedReceivedId, setExpandedReceivedId] = useState<string | null>(null);
  // Mirrors web's History page tab UX so the Sent/Received section is
  // always visible — even with zero entries — and the empty-tab branch
  // gives the user a nudge instead of just hiding the entire history card.
  const [historyTab, setHistoryTab] = useState<'sent' | 'received'>('sent');

  // Hidden-entry counts from the server (free tier only) — drives the
  // upsell card now that gated rows never reach the client.
  const [gateInfo, setGateInfo] = useState<HistoryGateInfo | null>(null);

  const refreshReceived = useCallback(async () => {
    try {
      // Ask for the full archive; the server clamps to the caller's tier
      // (7 days free / 365 Pro). The old hardcoded 50 starved PAYING
      // users of the 365-day archive they bought.
      const received = await loadReceivedCompliments(PRO_LOOKBACK_DAYS);
      setReceivedCompliments(received);
    } catch { /* offline — keep current */ }
  }, []);

  // Debounce realtime bursts: if multiple inserts fire in quick succession
  // (e.g. a team admin approves several queued completions), we only refetch
  // once at the tail.
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => { refreshReceived(); }, 300);
  }, [refreshReceived]);

  useReceivedComplimentsRealtime(username, scheduleReload);

  // Pull sent + received history from Supabase. Server is the source of
  // truth. Any `local_*` entry still in Redux after a successful remote
  // load is by definition stale — if the server had it, it would
  // already be in `remote` (with a UUID id, not local_*). Optimistic
  // local entries get persisted by redux-persist, so old test/dev rows
  // would survive across launches and re-appear as phantom "Today"
  // cards even when the server (and Home's bloom state) say otherwise.
  // Replacing history with `remote` unconditionally — including the
  // empty case — purges those leftovers.
  const reloadHistory = useCallback(
    async ({ showSpinner }: { showSpinner: boolean }) => {
      if (showSpinner) setLoadingHistory(true);
      try {
        const [remote, received, gate] = await Promise.all([
          loadComplimentHistory(PRO_LOOKBACK_DAYS),
          loadReceivedCompliments(PRO_LOOKBACK_DAYS),
          getHistoryGateInfo().catch(() => null),
        ]);
        dispatch(setComplimentHistory(remote));
        setReceivedCompliments(received);
        setGateInfo(gate);
      } catch (_e) { /* offline — keep current */ }
      if (showSpinner) setLoadingHistory(false);
    },
    [dispatch],
  );

  // Live read receipts: when the recipient reads a compliment, the row's
  // is_read flips via UPDATE (the sent hook listens to '*'), and the
  // Sent tab's Read/Delivered chip updates without a manual refresh.
  // Debounced — mark_received_read flips a recipient's whole backlog in
  // one go, which arrives here as one UPDATE event per row.
  const sentReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSentReload = useCallback(() => {
    if (sentReloadTimer.current) clearTimeout(sentReloadTimer.current);
    sentReloadTimer.current = setTimeout(() => {
      reloadHistory({ showSpinner: false });
    }, 500);
  }, [reloadHistory]);
  useSentComplimentsRealtime(userId, scheduleSentReload);
  useEffect(() => () => {
    if (sentReloadTimer.current) clearTimeout(sentReloadTimer.current);
  }, []);

  // Refetch on every focus. Without this, Recap caches whatever was
  // loaded on first mount — so a user who sent a compliment via Home,
  // then tapped the Recap tab, would see history without today's row
  // even though the DB has it. (Was the iOS-reported "today's lift
  // doesn't display in Recap" symptom.) Initial focus triggers a
  // spinner; later focuses are silent so the tab doesn't flash.
  const hasLoadedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      reloadHistory({ showSpinner: !hasLoadedOnceRef.current });
      hasLoadedOnceRef.current = true;
      // Opening Recap = the user has now seen their received compliments.
      // Flip them read server-side and clear the tab's red dot immediately.
      dispatch(setUnreadReceived(0));
      void markReceivedRead();
      return () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
      };
    }, [reloadHistory, dispatch]),
  );

  const today = localDateString();
  const bloomedToday = lastChallengeDate === today;

  // Defensive render-time dedup. Two passes:
  //   1) Drop any `local_*` entry the bloom-state says shouldn't exist.
  //      A local_* dated today but `lastChallengeDate !== today` means
  //      the optimistic insert never reached the server (or this is a
  //      stale row from a prior session) — the Home screen would say
  //      "you haven't bloomed yet" for the same state. A local_* dated
  //      anything other than today is always stale.
  //   2) Then dedup by date, preferring server (UUID) rows.
  const dedupedHistory = (() => {
    const filtered = complimentHistory.filter(c => {
      if (!c.id.startsWith('local_')) return true;
      return c.date === today && lastChallengeDate === today;
    });
    const byDate = new Map<string, ComplimentEntry>();
    for (const c of filtered) {
      const existing = byDate.get(c.date);
      if (!existing) {
        byDate.set(c.date, c);
        continue;
      }
      const existingIsLocal = existing.id.startsWith('local_');
      const cIsLocal = c.id.startsWith('local_');
      if (existingIsLocal && !cIsLocal) byDate.set(c.date, c);
    }
    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  })();

  // Pro gating: free users only see the last 7 days. Filter both the
  // sent and received lists; the difference drives the upsell card. Pro
  // (or anyone with no hidden entries) sees the full set with no gate.
  const cutoff = cutoffDateString(FREE_LOOKBACK_DAYS);
  const visibleHistory = isPro ? dedupedHistory : dedupedHistory.filter(c => c.date >= cutoff);
  const visibleReceived = isPro ? receivedCompliments : receivedCompliments.filter(c => c.date >= cutoff);
  // The server withholds gated rows, so the local fetch-vs-render diff is
  // normally 0 for free users — get_history_gate_info supplies the real
  // hidden counts. The local diff stays as a fallback for the window
  // between client rollout and the 20260617 migration being applied.
  const localHidden =
    (dedupedHistory.length - visibleHistory.length) +
    (receivedCompliments.length - visibleReceived.length);
  const hiddenCount = gateInfo && !gateInfo.is_pro
    ? gateInfo.hidden_sent + gateInfo.hidden_received
    : localHidden;

  const challenge = resolveChallenge(todayChallenge);
  const nextMs = getNextMilestone(streak);

  // Build streak grid
  const total = Math.min(streak, 28);
  const perRow = 7;
  const gridRows: number[][] = [];
  for (let i = 0; i < total; i += perRow) {
    gridRows.push(Array.from({ length: Math.min(perRow, total - i) }, (_, j) => i + j));
  }

  // Find achieved milestones
  const achieved = MILESTONES.filter(m => m.days <= streak);

  const milestoneIcon = (emoji: string) => {
    switch (emoji) {
      case '🌱': return <SeedlingIcon size={32} />;
      case '🌻': return <SunflowerIcon size={32} />;
      case '🏅': return <MedalIcon size={32} />;
      case '💫': return <SparkleIcon size={32} />;
      case '🌟': return <StarIcon size={32} />;
      default: return <SunflowerIcon size={32} />;
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <RecapIcon size={22} />
        <Text style={styles.title}> Recap</Text>
      </View>

      {/* Today's status */}
      <View style={styles.card}>
        <Text style={styles.label}>TODAY</Text>
        <View style={styles.todayRow}>
          {bloomedToday ? <SunflowerIcon size={36} /> : <SunIcon size={36} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.todayTitle}>
              {bloomedToday ? 'You bloomed today!' : 'You haven\'t bloomed yet'}
            </Text>
            <Text style={styles.todaySub}>{challenge.prompt}</Text>
          </View>
        </View>
      </View>

      {/* Streak */}
      <View style={styles.card}>
        <Text style={styles.label}>YOUR STREAK</Text>
        <View style={styles.streakHeader}>
          <FireIcon size={28} />
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>day{streak !== 1 ? 's' : ''}</Text>
        </View>

        {/* Streak grid */}
        {gridRows.length > 0 && (
          <View style={styles.grid}>
            {gridRows.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map((_, ci) => (
                  <SunflowerIcon key={ci} size={20} />
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Progress to next milestone */}
        {nextMs && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                Next: {nextMs.emoji} {nextMs.badge}
              </Text>
              <Text style={styles.progressCount}>
                {nextMs.days - streak} day{nextMs.days - streak !== 1 ? 's' : ''} left
              </Text>
            </View>
            <View style={styles.progressBarWrap}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min((streak / nextMs.days) * 100, 100)}%` },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* Milestones achieved */}
      {achieved.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>MILESTONES</Text>
          <View style={styles.milestoneList}>
            {achieved.map(m => (
              <View key={m.days} style={styles.milestoneRow}>
                {milestoneIcon(m.emoji)}
                <View style={{ flex: 1 }}>
                  <Text style={styles.milestoneName}>{m.badge}</Text>
                  <Text style={styles.milestoneDesc}>{m.title}</Text>
                </View>
                <View style={[styles.milestoneBadge, { borderColor: m.color + '44', backgroundColor: m.color + '18' }]}>
                  <Text style={[styles.milestoneDays, { color: m.color }]}>{m.days}d</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Groups recap */}
      {groups.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>GROUP ACTIVITY</Text>
          {groups.map(g => (
            <View key={g.id} style={styles.groupRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{g.name}</Text>
                <Text style={styles.groupMeta}>
                  {g.members.length} member{g.members.length !== 1 ? 's' : ''} · {g.members.filter(m => m.bloomed).length} bloomed today
                </Text>
              </View>
              <View style={styles.groupStreakWrap}>
                <Text style={styles.groupStreak}>{g.streak}</Text>
                <Text style={styles.groupStreakLabel}>streak</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Sent / Received tabs — always rendered (mirrors web History page).
          Empty tabs show a hint instead of hiding the whole section, which
          is what was making the Recap look like it had no history surface
          at all when the user hadn't sent/received anything yet. */}
      <View style={styles.card}>
        <View style={styles.historyTabsRow}>
          <Pressable
            onPress={() => setHistoryTab('sent')}
            style={[styles.historyTab, historyTab === 'sent' && styles.historyTabActive]}
          >
            <Text style={[styles.historyTabText, historyTab === 'sent' && styles.historyTabTextActive]}>
              Sent · {visibleHistory.length}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setHistoryTab('received')}
            style={[styles.historyTab, historyTab === 'received' && styles.historyTabActive]}
          >
            <Text style={[styles.historyTabText, historyTab === 'received' && styles.historyTabTextActive]}>
              Received · {visibleReceived.length}
            </Text>
          </Pressable>
        </View>

        {historyTab === 'sent' ? (
          visibleHistory.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyText}>
                You haven't written a compliment yet. Today's compliment is one tap away.
              </Text>
            </View>
          ) : (
            visibleHistory.map(entry => {
              const isExpanded = expandedId === entry.id;
              const dateStr = formatDate(entry.date);
              // Read receipt: Read (recipient viewed it via Recap or the
              // compliment view), Delivered (resolved to their account,
              // not yet viewed), Sent (no account matched yet —
              // store-and-claim pending). Mirrors web History's SentCard.
              const receipt = entry.isRead
                ? { label: '✓✓ Read', color: '#F5C842' }
                : entry.recipientId
                ? { label: '✓ Delivered', color: '#A8E6CF' }
                : { label: 'Sent', color: theme.colors.faint };

              return (
                <Pressable
                  key={entry.id}
                  style={styles.historyCard}
                  onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <View style={styles.historyHeader}>
                    <View style={styles.historyDateBadge}>
                      <Text style={styles.historyDateText}>{dateStr}</Text>
                    </View>
                    <Text style={styles.historyRecipient} numberOfLines={1}>
                      → {entry.recipient}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: receipt.color }}>
                      {receipt.label}
                    </Text>
                    <Text style={styles.historyChevron}>{isExpanded ? '▾' : '▸'}</Text>
                  </View>

                  {entry.prompt ? (
                    <Text style={styles.historyPrompt} numberOfLines={isExpanded ? undefined : 1}>
                      {entry.prompt}
                    </Text>
                  ) : null}

                  <View style={styles.historyQuoteWrap}>
                    <Text
                      style={styles.historyQuote}
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      "{entry.body}"
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )
        ) : visibleReceived.length === 0 ? (
          <View style={styles.historyEmpty}>
            <Text style={styles.historyEmptyText}>
              No compliments received yet. Once friends or teammates lift you, they'll appear here.
            </Text>
          </View>
        ) : (
          visibleReceived.map(entry => {
            const isExpanded = expandedReceivedId === entry.id;
            const dateStr = formatDate(entry.date);

            return (
              <Pressable
                key={entry.id}
                style={styles.historyCard}
                onPress={() => setExpandedReceivedId(isExpanded ? null : entry.id)}
              >
                <View style={styles.historyHeader}>
                  <View style={styles.historyDateBadge}>
                    <Text style={styles.historyDateText}>{dateStr}</Text>
                  </View>
                  <Text style={styles.historyRecipient} numberOfLines={1}>
                    from @{entry.senderUsername}
                    {entry.source === 'group' && entry.contextName
                      ? `  ·  in ${entry.contextName}`
                      : entry.source === 'team' && entry.contextName
                      ? `  ·  in ${entry.contextName}`
                      : ''}
                  </Text>
                  <Text style={styles.historyChevron}>{isExpanded ? '▾' : '▸'}</Text>
                </View>

                <View style={styles.historyQuoteWrap}>
                  <Text
                    style={styles.historyQuote}
                    numberOfLines={isExpanded ? undefined : 2}
                  >
                    "{entry.body}"
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Pro upsell — free users have entries older than the 7-day window.
          Tapping reveals the already-loaded history once they upgrade.
          Mirrors the web History page's ProGate. */}
      {!isPro && hiddenCount > 0 && (
        <Pressable
          style={styles.proGate}
          onPress={() => navigation.navigate('HomeTab', { screen: 'Pro' })}
        >
          <View style={styles.proGateBadge}>
            <Text style={styles.proGateBadgeText}>
              ✦ {hiddenCount} more compliment{hiddenCount !== 1 ? 's' : ''} with Pro
            </Text>
          </View>
          <Text style={styles.proGateTitle}>
            Free shows {FREE_LOOKBACK_DAYS} days. Pro unlocks the full {PRO_LOOKBACK_DAYS}-day archive.
          </Text>
          <View style={styles.proGateBtn}>
            <Text style={styles.proGateBtnText}>Unlock Compliment History →</Text>
          </View>
        </Pressable>
      )}

      {/* Loading indicator for remote history */}
      {loadingHistory && complimentHistory.length === 0 && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={theme.colors.gold} />
          <Text style={styles.loadingText}>Loading your history...</Text>
        </View>
      )}

      {/* Empty state */}
      {streak === 0 && dedupedHistory.length === 0 && (
        <View style={styles.emptyState}>
          <SunIcon size={56} />
          <Text style={styles.emptyTitle}>Your recap starts here</Text>
          <Text style={styles.emptySub}>
            Complete your first challenge to start tracking your journey.
          </Text>
        </View>
      )}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surf,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: theme.colors.gold,
    fontWeight: '600',
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  todaySub: {
    fontSize: 13,
    color: theme.colors.dim,
    marginTop: 2,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakNum: {
    fontSize: 40,
    fontWeight: '700',
    color: theme.colors.gold,
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 14,
    color: theme.colors.faint,
  },
  grid: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressCount: {
    fontSize: 12,
    color: theme.colors.faint,
  },
  progressBarWrap: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.gold,
    borderRadius: 99,
  },
  milestoneList: {
    gap: 12,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  milestoneDesc: {
    fontSize: 12,
    color: theme.colors.dim,
    marginTop: 2,
  },
  milestoneBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  milestoneDays: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  groupMeta: {
    fontSize: 11,
    color: theme.colors.faint,
    marginTop: 2,
  },
  groupStreakWrap: {
    alignItems: 'center',
  },
  groupStreak: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.gold,
  },
  groupStreakLabel: {
    fontSize: 9,
    color: theme.colors.faint,
    letterSpacing: 1,
  },
  // ── History styles ──
  historySubtitle: {
    fontSize: 12,
    color: theme.colors.faint,
    marginTop: -8,
  },
  historyTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  historyTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.colors.bord,
  },
  historyTabActive: {
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderColor: 'rgba(245,200,66,0.40)',
  },
  historyTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.faint,
  },
  historyTabTextActive: {
    color: theme.colors.gold,
  },
  historyEmpty: {
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  historyEmptyText: {
    fontSize: 13,
    color: theme.colors.faint,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.bord,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDateBadge: {
    backgroundColor: 'rgba(245,200,66,0.10)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  historyDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.gold,
  },
  historyRecipient: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  historyChevron: {
    fontSize: 12,
    color: theme.colors.faint,
  },
  historyPrompt: {
    fontSize: 12,
    color: theme.colors.faint,
    fontStyle: 'italic',
  },
  historyQuoteWrap: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(245,200,66,0.30)',
    paddingLeft: 12,
  },
  historyQuote: {
    fontSize: 14,
    color: theme.colors.dim,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  proGate: {
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.35)',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    alignItems: 'center',
  },
  proGateBadge: {
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.30)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  proGateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.gold,
  },
  proGateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 21,
  },
  proGateBtn: {
    backgroundColor: theme.colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 2,
  },
  proGateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C0C0C',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.faint,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.dim,
  },
  emptySub: {
    fontSize: 14,
    color: theme.colors.faint,
    textAlign: 'center',
    lineHeight: 22,
  },
}));
