import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { createStyleSheet, useStyles } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import {
  loadGeoLeaderboard, loadGeoLeaderboardSummary, setMyLocationShare,
  type GeoLeaderboardRow, type GeoLeaderboardScope, type GeoLeaderboardSummary,
} from '../utils/supabase';
import { SunflowerIcon, SunIcon } from '../components/icons';

const SCOPES: { key: GeoLeaderboardScope; label: string }[] = [
  { key: 'city',    label: 'My City' },
  { key: 'region',  label: 'State / Region' },
  { key: 'country', label: 'Country' },
];

export default function GeoLeaderboardScreen() {
  const { styles, theme } = useStyles(stylesheet);
  const navigation = useNavigation<any>();
  const [scope, setScope]       = useState<GeoLeaderboardScope>('city');
  const [rows, setRows]         = useState<GeoLeaderboardRow[]>([]);
  const [summary, setSummary]   = useState<GeoLeaderboardSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingShare, setSavingShare] = useState(false);

  const fetchAll = useCallback(async () => {
    const [s, lb] = await Promise.all([
      loadGeoLeaderboardSummary(),
      loadGeoLeaderboard(scope, 25),
    ]);
    setSummary(s);
    setRows(lb);
  }, [scope]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const onToggleShare = useCallback(async () => {
    if (!summary) return;
    const next = !summary.share;
    setSavingShare(true);
    const ok = await setMyLocationShare(next);
    if (ok) setSummary({ ...summary, share: next });
    setSavingShare(false);
    fetchAll();
  }, [summary, fetchAll]);

  const rankLabel = (idx: number, streak: number) => {
    if (streak <= 0) return `#${idx + 1}`;
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  const scopeLabel: Record<GeoLeaderboardScope, string | undefined> = {
    city:    summary?.city ?? undefined,
    region:  summary?.region ?? undefined,
    country: summary?.country ?? undefined,
  };
  const scopeCount: Record<GeoLeaderboardScope, number | undefined> = {
    city:    summary?.city_count,
    region:  summary?.region_count,
    country: summary?.country_count,
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>📍 Local Leaderboard</Text>
        <Text style={styles.subtitle}>
          Top streaks in your city, region, or country. Opt in to share your streak and see
          others nearby.
        </Text>
      </View>

      {/* Sharing opt-in card — always rendered so users can opt in BEFORE
          we have a location for them. Capture is gated on this toggle
          server-side, so a user must turn this on first; their next
          compliment then derives their area from the request IP. */}
      {!loading && summary && (
        <View style={[styles.shareCard, summary.share && styles.shareCardOn]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>
              {summary.share
                ? summary.has_location
                  ? "You're on the leaderboard"
                  : "Local Leaderboard is on"
                : 'Join the Local Leaderboard'}
            </Text>
            <Text style={styles.shareBody}>
              {summary.share
                ? summary.has_location
                  ? `Your username and streak are visible to people in ${summary.city ?? summary.country}.`
                  : "Post your next compliment — we'll derive your city from your IP and add you to the board."
                : 'Off by default. Turn on and your next compliment will add you to the board.'}
            </Text>
          </View>
          <Pressable
            style={[styles.toggle, summary.share && styles.toggleOn]}
            onPress={onToggleShare}
            disabled={savingShare}
          >
            <View style={[styles.knob, summary.share && styles.knobOn]} />
          </Pressable>
        </View>
      )}

      {/* Opted in but no location yet — explain the next step. */}
      {!loading && summary && summary.share && !summary.has_location && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>One more step</Text>
          <Text style={styles.noticeBody}>
            Post a compliment from your usual location and we'll detect your city from your IP.
            Only city / region / country is stored — never precise coordinates, never the IP
            itself.
          </Text>
        </View>
      )}

      {/* Scope tabs */}
      {summary?.has_location && (
        <View style={styles.tabs}>
          {SCOPES.map(s => (
            <Pressable
              key={s.key}
              style={[styles.tab, scope === s.key && styles.tabOn]}
              onPress={() => setScope(s.key)}
            >
              <Text style={[styles.tabText, scope === s.key && styles.tabTextOn]}>
                {s.label}
              </Text>
              {scopeCount[s.key] !== undefined && (
                <Text style={[styles.tabCount, scope === s.key && styles.tabCountOn]}>
                  {scopeCount[s.key]}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {summary?.has_location && scopeLabel[scope] && (
        <Text style={styles.scopeLine}>
          Showing: <Text style={styles.scopeLineEm}>{scopeLabel[scope]}</Text>
        </Text>
      )}

      {/* Leaderboard rows */}
      {loading ? (
        <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 32 }} />
      ) : rows.length === 0 && summary?.has_location ? (
        <View style={styles.notice}>
          <Text style={styles.noticeBody}>
            {summary.share
              ? 'No one in your area has opted in yet. You\'re first.'
              : 'No one in your area has opted in yet — including you. Toggle on above to start the leaderboard.'}
          </Text>
        </View>
      ) : (
        rows.map((m, idx) => {
          const isTop = idx < 3 && m.current_streak > 0;
          return (
            <View
              key={m.user_id}
              style={[styles.row, isTop && styles.rowTop, m.is_me && styles.rowMe]}
            >
              <Text style={[styles.rank, isTop && styles.rankTop]}>
                {rankLabel(idx, m.current_streak)}
              </Text>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>
                    {m.is_me ? 'You' : (m.display_name ?? m.username ?? 'Anonymous')}
                  </Text>
                  {m.is_me && <Text style={styles.youBadge}>YOU</Text>}
                </View>
                <Text style={styles.meta}>
                  {m.location_city ?? m.location_region ?? m.location_country ?? ''}
                  {m.longest_streak > m.current_streak ? ` · Best: ${m.longest_streak}d` : ''}
                </Text>
              </View>
              <View style={styles.streakWrap}>
                {m.bloomed_today ? <SunflowerIcon size={16} /> : <SunIcon size={16} />}
                <Text style={styles.streakValue}>{m.current_streak}</Text>
              </View>
            </View>
          );
        })
      )}

      {/* No bottom privacy footer — the share toggle card above already
          explains opt-in. The full disclosure (no IP/GPS/coords storage,
          30-day purge, etc.) lives in the Privacy Policy's "Location
          Data" section. Removing the duplicate per Joao's feedback;
          App Review still passes because Apple reads the policy + the
          (absent) Info.plist location-usage strings, not in-app footers. */}
    </ScrollView>
  );
}

const stylesheet = createStyleSheet(theme => ({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingBottom: 80, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  back: { color: theme.colors.faint, fontSize: 14 },
  titleRow: { gap: 6 },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.dim, lineHeight: 20 },

  notice: {
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, padding: 16, gap: 6,
  },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  noticeBody: { fontSize: 13, color: theme.colors.dim, lineHeight: 19 },

  shareCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 14, padding: 16,
  },
  shareCardOn: {
    backgroundColor: 'rgba(245,200,66,0.06)', borderColor: 'rgba(245,200,66,0.30)',
  },
  shareTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  shareBody:  { fontSize: 12, color: theme.colors.faint, marginTop: 2, lineHeight: 17 },
  toggle: {
    width: 44, height: 26, borderRadius: 13, padding: 2,
    backgroundColor: theme.colors.bord, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: theme.colors.gold },
  knob: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#0D0D0D', alignSelf: 'flex-start',
  },
  knobOn: { alignSelf: 'flex-end', backgroundColor: '#0D0D0D' },

  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
    borderRadius: 10, backgroundColor: theme.colors.surf,
    borderWidth: 1, borderColor: theme.colors.bord,
  },
  tabOn: { backgroundColor: theme.colors.goldCardBg, borderColor: theme.colors.goldCardBord },
  tabText: { fontSize: 12, color: theme.colors.faint, fontWeight: '600' },
  tabTextOn: { color: theme.colors.gold },
  tabCount: { fontSize: 10, color: theme.colors.faint, marginTop: 2 },
  tabCountOn: { color: theme.colors.gold },

  scopeLine: { fontSize: 12, color: theme.colors.faint },
  scopeLineEm: { color: theme.colors.text, fontWeight: '600' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.surf, borderWidth: 1, borderColor: theme.colors.bord,
    borderRadius: 12, padding: 12,
  },
  rowTop: {
    backgroundColor: 'rgba(245,200,66,0.06)', borderColor: 'rgba(245,200,66,0.30)',
  },
  rowMe: {
    borderColor: theme.colors.gold,
  },
  rank: {
    width: 32, textAlign: 'center',
    fontSize: 14, fontWeight: '700', color: theme.colors.faint,
  },
  rankTop: { fontSize: 18, color: theme.colors.gold },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  youBadge: {
    fontSize: 9, letterSpacing: 1, color: theme.colors.gold,
    backgroundColor: 'rgba(245,200,66,0.12)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  meta: { fontSize: 11, color: theme.colors.faint, marginTop: 2 },
  streakWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakValue: { fontSize: 18, fontWeight: '700', color: theme.colors.gold },

  privacyFooter: {
    fontSize: 11, color: theme.colors.faint, lineHeight: 16,
    textAlign: 'center', paddingHorizontal: 12, marginTop: 8,
  },
}));
