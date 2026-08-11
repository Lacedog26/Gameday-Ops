// ── Kindness journal: server sync ────────────────────────────────
//
// The kindness journal is LOCAL-FIRST. Every logged act lands in Redux
// (and AsyncStorage) immediately; these helpers then try to mirror it to
// Supabase so history survives reinstalls and roams across devices.
//
// Server pieces (see supabase/migrations/20260811_kindness_acts.sql):
//   - table `kindness_acts` (RLS: owner-only)
//   - RPC `log_kindness_act` — inserts the act AND advances user_streaks
//     in one transaction, returning the fresh streak.
//   - RPC `set_kindness_note` — attaches/updates the optional note.
//
// EVERY function here is failure-tolerant: if the migration hasn't been
// run yet (or the device is offline) calls resolve to null/[] and the
// app carries on local-only. Nothing throws.

import { supabase } from './supabase';
import { todayLocal } from './dates';
import type { KindnessEntry } from '../store/appSlice';

export interface LogKindnessResult {
  id: string;
  currentStreak: number | null;
}

/**
 * Persist a kindness act server-side and advance the streak.
 * Returns null when the server can't take it (offline / migration not
 * applied) — the caller should keep the local entry and fall back to a
 * locally computed streak.
 */
export async function logKindnessAct(entry: {
  actionId: string;
  title: string;
  emoji: string;
  category: string;
  note?: string | null;
  source: string;
  date?: string;
}): Promise<LogKindnessResult | null> {
  try {
    const { data, error } = await supabase.rpc('log_kindness_act', {
      p_action_id: entry.actionId,
      p_title: entry.title,
      p_emoji: entry.emoji,
      p_category: entry.category,
      p_note: entry.note ?? null,
      p_source: entry.source,
      p_local_date: entry.date ?? todayLocal(),
    });
    if (error) {
      // Expected until the migration is applied ("function … does not
      // exist") — log once at debug level and move on.
      console.warn('[kindness] log_kindness_act unavailable:', error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id) return null;
    return {
      id: String(row.id),
      currentStreak: typeof row.current_streak === 'number' ? row.current_streak : null,
    };
  } catch (e) {
    console.warn('[kindness] log failed:', (e as Error)?.message ?? e);
    return null;
  }
}

/** Attach/update the optional note on a synced act. Best-effort. */
export async function saveKindnessNote(id: string, note: string): Promise<void> {
  if (!id || id.startsWith('local_')) return;
  try {
    const { error } = await supabase.rpc('set_kindness_note', { p_id: id, p_note: note });
    if (error) console.warn('[kindness] set_kindness_note failed:', error.message);
  } catch (e) {
    console.warn('[kindness] note save failed:', (e as Error)?.message ?? e);
  }
}

/**
 * Pull the journal from the server (newest first). Empty array when the
 * table doesn't exist yet or the request fails — callers must treat []
 * as "nothing to merge," NOT "wipe local history."
 */
export async function loadMyKindness(limit = 500): Promise<KindnessEntry[]> {
  try {
    const { data, error } = await supabase
      .from('kindness_acts')
      .select('id, action_id, title, emoji, category, note, source, acted_on, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !Array.isArray(data)) return [];
    return data.map((r: any): KindnessEntry => ({
      id: String(r.id),
      date: String(r.acted_on ?? '').slice(0, 10),
      actionId: r.action_id ?? '',
      title: r.title ?? 'Act of kindness',
      emoji: r.emoji ?? '🌻',
      category: r.category ?? 'small-things',
      note: r.note ?? undefined,
      createdAt: r.created_at ?? new Date().toISOString(),
      source: (['daily', 'random', 'explore', 'custom'].includes(r.source) ? r.source : 'custom') as KindnessEntry['source'],
      synced: true,
    }));
  } catch {
    return [];
  }
}

/**
 * Merge server rows with local ones. Server wins on id collisions, BUT a
 * local note survives when the server row has none (covers the window
 * where a note was typed before the log RPC resolved). Unsynced local_*
 * rows are kept only when no server row plausibly IS the same act
 * (same date + title) — that dedupe covers the lost-response case where
 * the insert landed server-side but the client never saw the uuid, which
 * would otherwise double-count the act forever. Acts logged fully offline
 * remain local-only (by design: local-first journal; they still count in
 * every stat).
 * Result is newest-first by createdAt.
 */
export function mergeKindness(local: KindnessEntry[], server: KindnessEntry[]): KindnessEntry[] {
  if (server.length === 0) return local;
  const localById = new Map(local.map(l => [l.id, l]));
  const serverIds = new Set(server.map(s => s.id));
  const serverDayTitle = new Set(server.map(s => `${s.date}|${s.title}`));
  const merged = server.map(s => {
    const localTwin = localById.get(s.id);
    return localTwin?.note && !s.note ? { ...s, note: localTwin.note } : s;
  });
  const keptLocal = local.filter(l =>
    l.id.startsWith('local_') &&
    !serverIds.has(l.id) &&
    !serverDayTitle.has(`${l.date}|${l.title}`),
  );
  return [...merged, ...keptLocal].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
