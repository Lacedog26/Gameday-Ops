# One Compliment → Small Acts of Kindness

**Redesign of the core experience — 2026-08-11**

The product thesis shifted from *"send a compliment to someone"* to *"do one
small thing to make someone's day better."* A compliment is now one (central)
form of kindness, and the entire core loop works for a single user with no
recipient, no friend, and no one else on the app.

The new daily loop: **open → get inspired → do something kind in the real
world → log it → see your impact → come back tomorrow.**

---

## What changed

### New screens
| Screen | Route | What it does |
|---|---|---|
| `TodayScreen` | `Today` (Home tab root) | The kindness dashboard. "Make someone's day." + one suggested act per day. Compliment days route into the classic Brief → Write → Bloom flow; every other act is a one-tap **I did it**. Ported intact from the old Landing screen: privacy banner, streak-freeze system, server focus-sync, SEND IT TO X share card. |
| `KindnessDoneScreen` | `KindnessDone` | The completion moment: bloom animation → warm copy → streak → optional one-line note. Also handles free-form logging (`{ custom: true }`) — "What did you do?" → log it. |
| `RandomActScreen` | `RandomAct` | "Give me an idea" → one idea at a time → **Another one** → **I did this**. |
| `ExploreScreen` | `Explore` | Browse the kindness library by category. No checkboxes, no progress bars — invitations, not a checklist. |

### Modified
- **Recap tab → My Kindness** (`RecapScreen`): impact hero ("You've made a
  difference N times"), days-active, and a unified journal merging kindness
  acts + sent compliments. Received compliments keep their own tab. All Pro
  gating for compliment history is unchanged; kindness acts are never gated.
- **Onboarding** (`data/challenges.ts`): same 4-step structure, new copy —
  the aha is "one small act can change someone's day," not "give a compliment."
- **Streak**: completing **any** kindness act keeps it alive. Compliment flow
  unchanged server-side.
- **Brief/Write guards**: now gate on "compliment sent today" instead of
  `lastChallengeDate` (which any kindness act flips) — so logging a kindness
  never locks you out of also sending a compliment.
- **Milestone copy** reframed from "lifting people" to daily kindness.

### New data
- `src/data/kindness.ts` — the kindness library: ~40 acts across 12
  categories, each with title, description, effort, time estimate, emoji.
  Deterministic daily rotation (compliment day every 3rd day), random-idea
  picker, rotating completion copy. Adding an act is a one-line change.
- `src/store/appSlice.ts` — `kindnessHistory: KindnessEntry[]` (persisted via
  the existing AsyncStorage pipeline; backward-compatible, no version bump).
- `src/utils/kindnessApi.ts` — local-first server sync (see below).

### Untouched
Groups, Teams, Pro/RevenueCat/Stripe, Settings, OneSignal push, share links
(`/c/:id`), Supabase auth, the visual design system (sunflower, gold
`#F5C842`, Poppins, dark/light themes).

---

## The one thing you must do: run the SQL migration

`supabase/migrations/20260811_kindness_acts.sql` — paste the whole file into
the **Supabase SQL editor** and run it once. It adds:

- `kindness_acts` table (RLS: owner-only)
- `log_kindness_act` RPC — inserts the act and advances `user_streaks`
  atomically (same rules as compliments: same-day no double-count,
  consecutive +1, gap resets, streak-freeze bridging honored)
- `set_kindness_note` RPC

**The app is safe to ship before the migration runs**: the journal is
local-first (Redux + AsyncStorage). Until the RPC exists, acts log locally,
streaks compute locally, and nothing errors. Once the migration is live,
syncing starts automatically — no coordinated rollout needed.

One thing to verify in the migration: the streak-freeze bridge assumes a
`streak_freezes` table with a `used_on date` column. If your live schema
names it differently, adjust that one subquery (a mismatch is swallowed
safely — the only effect would be a freeze not bridging a kindness-act gap).

## How to apply the code

From the repo root on your computer:

1. Copy the contents of this delivery over `app/` (new files add, changed
   files replace; `LandingScreen.tsx` and `DoneScreen.tsx` are deleted), or
   `git apply kindness-redesign.patch` if you prefer the patch file.
2. `cd app && npm install` (no new dependencies were added — this is just
   your normal install).
3. `npx tsc --noEmit` should pass (it does in this delivery).
4. Run in Expo, then ship through your usual EAS build.

---

## Design decisions worth knowing

- **No shame, ever.** A broken streak shows "Ready for today's kindness?" —
  never "you missed yesterday." The at-risk card only appears while the
  streak is still rescuable.
- **Stats stay quiet.** Three pills (acts, days active, streak), hidden
  entirely for brand-new users so the first screen is an invitation, not a
  row of zeros. Total acts of kindness is the hero metric, not the streak.
- **Compliment days recur every 3rd day** in the daily rotation, and a
  compliment path is always one tap away — the app's namesake stays central.
- **Everything is logged in the user's own words if they want** ("I did
  something else" → free-form entry), and every act takes an optional note —
  the journal is evidence of the person they're becoming.

## Future monetization hooks (built for, not built)

The kindness library loader is data-driven, so premium idea packs, themed or
seasonal campaigns, and workplace kindness programs are a
`kindness_packs` table + `pack_id` column away (noted in the migration file).
Existing Pro gates (history archive, streak freeze) apply unchanged; Teams
remains the workplace surface.
