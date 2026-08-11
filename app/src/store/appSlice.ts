import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Team, DailyChallenge } from '../utils/supabase';
import { localDateString } from '../utils/dates';

export interface GroupMember {
  id: string;
  name: string;
  color: string;
  bloomed: boolean;
  isMe?: boolean;
  pending?: boolean;
}

export interface FeedEntry {
  name: string;
  color: string;
  recipient: string;
  compliment: string;
  time: string;
}

export interface ComplimentEntry {
  id: string;
  date: string;        // ISO date "2026-04-08"
  prompt: string;
  recipient: string;
  body: string;
  createdAt: string;   // ISO datetime
  /** Resolved recipient account (read receipts only exist when set). */
  recipientId?: string | null;
  /** Read receipt: recipient viewed it. Optional — local_* optimistic
   *  rows and pre-receipt cached rows don't carry it. */
  isRead?: boolean;
}

// Legacy local-only group (kept for migration)
export interface Group {
  id: string;
  name: string;
  streak: number;
  inviteCode: string;
  created: string;
  lastActiveDay: string;
  members: GroupMember[];
  feed: FeedEntry[];
}

/** One logged act of kindness — the unit of the My Kindness journal.
 *  Compliments are NOT duplicated here; they live in complimentHistory
 *  and the journal merges the two lists at render time. */
export interface KindnessEntry {
  id: string;           // server uuid, or `local_<ts>` before/without sync
  date: string;         // local YYYY-MM-DD the act was done
  actionId: string;     // slug from the kindness library ('' for custom)
  title: string;        // denormalized so history survives library edits
  emoji: string;
  category: string;
  note?: string;        // optional user reflection
  createdAt: string;    // ISO datetime
  source: 'daily' | 'random' | 'explore' | 'custom';
  /** True once the row exists server-side (kindness_acts table). */
  synced?: boolean;
}

// Cloud-backed group (from Supabase)
export interface CloudGroup {
  id: string;
  name: string;
  invite_code: string;
  pinned_challenge: string | null;
  created_at: string;
  member_count: number;
  my_role: 'admin' | 'member';
  /** 'pending' while a join-by-code membership awaits admin approval —
   *  load_my_groups returns the caller's own row even when pending.
   *  Optional: rows cached before the approval flow predate the field. */
  my_status?: 'pending' | 'approved';
}

interface AppState {
  onboarded: boolean;
  streak: number;
  lastChallengeDate: string | null;
  groups: Group[];
  notifEnabled: boolean;
  notifTime: string;
  currentRating: number;
  feedbackSubmitted: boolean;
  cookieChoice: 'accepted' | 'rejected' | null;
  // User account
  userId: string | null;
  username: string | null;
  email: string | null;
  emailVerified: boolean;
  // Compliment history
  complimentHistory: ComplimentEntry[];
  // Kindness journal (non-compliment acts)
  kindnessHistory: KindnessEntry[];
  // Subscription
  isPro: boolean;
  // Cloud groups cache
  cloudGroups: CloudGroup[];
  // Teams cache
  teams: Team[];
  // Today's challenge from Supabase
  todayChallenge: DailyChallenge | null;
  // Count of received compliments the user hasn't viewed yet — drives the
  // red dot on the Recap tab. Server is the source of truth
  // (get_unread_received_count); cleared when Recap is opened.
  unreadReceived: number;
}

const initialState: AppState = {
  onboarded: false,
  streak: 0,
  lastChallengeDate: null,
  groups: [],
  notifEnabled: false,
  notifTime: '09:00',
  currentRating: 0,
  feedbackSubmitted: false,
  cookieChoice: null,
  userId: null,
  username: null,
  email: null,
  emailVerified: false,
  complimentHistory: [],
  kindnessHistory: [],
  isPro: false,
  cloudGroups: [],
  teams: [],
  todayChallenge: null,
  unreadReceived: 0,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnboarded(state) {
      state.onboarded = true;
    },
    resetOnboarding(state) {
      state.onboarded = false;
    },
    incrementStreak(state) {
      state.streak += 1;
      state.lastChallengeDate = localDateString();
    },
    setStreak(state, action: PayloadAction<number>) {
      state.streak = action.payload;
      state.lastChallengeDate = localDateString();
    },
    restoreStreak(state, action: PayloadAction<{ streak: number; lastChallengeDate: string | null }>) {
      state.streak = action.payload.streak;
      if (action.payload.lastChallengeDate) {
        state.lastChallengeDate = action.payload.lastChallengeDate;
      }
    },
    addGroup(state, action: PayloadAction<Group>) {
      state.groups.push(action.payload);
    },
    removeGroup(state, action: PayloadAction<string>) {
      state.groups = state.groups.filter(g => g.id !== action.payload);
    },
    markGroupsBloomed(state, action: PayloadAction<{ compliment: string; recipient: string }>) {
      const { compliment, recipient } = action.payload;
      state.groups.forEach(g => {
        const me = g.members.find(m => m.isMe);
        if (me && !me.bloomed) {
          me.bloomed = true;
          g.feed.unshift({
            name: 'You',
            color: '#F5C842',
            recipient,
            compliment,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          if (g.members.every(m => m.bloomed || m.pending)) {
            g.streak += 1;
          }
        }
      });
    },
    resetGroupsForNewDay(state) {
      const todayKey = localDateString();
      state.groups.forEach(g => {
        if (g.lastActiveDay !== todayKey) {
          g.lastActiveDay = todayKey;
          g.members.forEach(m => { m.bloomed = false; });
          g.feed = [];
        }
      });
    },
    setNotifEnabled(state, action: PayloadAction<boolean>) {
      state.notifEnabled = action.payload;
    },
    setNotifTime(state, action: PayloadAction<string>) {
      state.notifTime = action.payload;
    },
    setRating(state, action: PayloadAction<number>) {
      state.currentRating = action.payload;
    },
    setFeedbackSubmitted(state) {
      state.feedbackSubmitted = true;
    },
    setCookieChoice(state, action: PayloadAction<'accepted' | 'rejected'>) {
      state.cookieChoice = action.payload;
    },
    setUserId(state, action: PayloadAction<string>) {
      state.userId = action.payload;
    },
    setUsername(state, action: PayloadAction<string>) {
      state.username = action.payload;
    },
    setEmail(state, action: PayloadAction<string>) {
      state.email = action.payload;
    },
    setEmailVerified(state, action: PayloadAction<boolean>) {
      state.emailVerified = action.payload;
    },
    addCompliment(state, action: PayloadAction<ComplimentEntry>) {
      // Add to front (newest first), avoid duplicates by id
      if (!state.complimentHistory.some(c => c.id === action.payload.id)) {
        state.complimentHistory.unshift(action.payload);
      }
    },
    setComplimentHistory(state, action: PayloadAction<ComplimentEntry[]>) {
      state.complimentHistory = action.payload;
    },
    addKindness(state, action: PayloadAction<KindnessEntry>) {
      if (!state.kindnessHistory.some(k => k.id === action.payload.id)) {
        state.kindnessHistory.unshift(action.payload);
      }
    },
    /** Replace a local_* entry once the server confirms (or attach a note). */
    updateKindness(state, action: PayloadAction<{ id: string; changes: Partial<KindnessEntry> }>) {
      const i = state.kindnessHistory.findIndex(k => k.id === action.payload.id);
      if (i >= 0) {
        state.kindnessHistory[i] = { ...state.kindnessHistory[i], ...action.payload.changes };
      }
    },
    setKindnessHistory(state, action: PayloadAction<KindnessEntry[]>) {
      state.kindnessHistory = action.payload;
    },
    setPro(state, action: PayloadAction<boolean>) {
      state.isPro = action.payload;
    },
    setCloudGroups(state, action: PayloadAction<CloudGroup[]>) {
      state.cloudGroups = action.payload;
    },
    setTeams(state, action: PayloadAction<Team[]>) {
      state.teams = action.payload;
    },
    setTodayChallenge(state, action: PayloadAction<DailyChallenge | null>) {
      state.todayChallenge = action.payload;
    },
    setUnreadReceived(state, action: PayloadAction<number>) {
      state.unreadReceived = Math.max(0, action.payload);
    },
    // Streak freeze lives on the server now (streak_freezes table +
    // use_streak_freeze RPC, see utils/supabase.ts). The old Redux-only
    // reducers were removed: they never persisted anything server-side,
    // faked lastChallengeDate = today (making Landing think the user had
    // bloomed), and Landing's focus-sync overwrote them within seconds.
    hydrateState(_state, action: PayloadAction<Partial<AppState>>) {
      return { ...initialState, ...action.payload };
    },
  },
});

export const {
  setOnboarded,
  resetOnboarding,
  incrementStreak,
  setStreak,
  restoreStreak,
  addGroup,
  removeGroup,
  markGroupsBloomed,
  resetGroupsForNewDay,
  setNotifEnabled,
  setNotifTime,
  setRating,
  setFeedbackSubmitted,
  setCookieChoice,
  setUserId,
  setUsername,
  setEmail,
  setEmailVerified,
  addCompliment,
  setComplimentHistory,
  addKindness,
  updateKindness,
  setKindnessHistory,
  setPro,
  setCloudGroups,
  setTeams,
  setTodayChallenge,
  setUnreadReceived,
  hydrateState,
} = appSlice.actions;

export default appSlice.reducer;
