// ── The Kindness Library ─────────────────────────────────────────
//
// The heart of the "small acts of kindness" experience. Every action a
// user can be inspired to do lives here: a title, a short human
// description, a category, an effort level, and a rough time estimate.
//
// Design notes:
//  - Actions are DATA, not UI. Screens (Today / Explore / Random Act)
//    render from this list, so adding a new act is a one-line change.
//  - `isCompliment: true` routes the act into the existing
//    Brief → Write → Bloom compliment flow instead of the generic
//    "I did it" flow — compliments stay a first-class kind of kindness.
//  - The daily rotation is deterministic per calendar date so everyone
//    (and every device) agrees on "today's kindness" without a server
//    round-trip. A compliment day comes up roughly every third day to
//    keep the app's namesake front and center.

import { todayLocal } from '../utils/dates';

export type KindnessCategory =
  | 'compliments'
  | 'encouragement'
  | 'gratitude'
  | 'helping'
  | 'giving'
  | 'strangers'
  | 'friends'
  | 'family'
  | 'work'
  | 'community'
  | 'self'
  | 'small-things';

export const CATEGORY_META: Record<KindnessCategory, { label: string; emoji: string }> = {
  'compliments':  { label: 'Compliments',   emoji: '🌻' },
  'encouragement':{ label: 'Encouragement', emoji: '💛' },
  'gratitude':    { label: 'Gratitude',     emoji: '🙏' },
  'helping':      { label: 'Helping',       emoji: '🤝' },
  'giving':       { label: 'Giving',        emoji: '🎁' },
  'strangers':    { label: 'Strangers',     emoji: '☕' },
  'friends':      { label: 'Friends',       emoji: '🫂' },
  'family':       { label: 'Family',        emoji: '🏡' },
  'work':         { label: 'Work',          emoji: '💼' },
  'community':    { label: 'Community',     emoji: '🌍' },
  'self':         { label: 'Yourself',      emoji: '🌱' },
  'small-things': { label: 'Small Things',  emoji: '✨' },
};

export interface KindnessAction {
  /** Stable slug — stored in the journal so history survives copy edits. */
  id: string;
  title: string;
  /** One warm sentence: what to do and why it matters. */
  description: string;
  category: KindnessCategory;
  /** 1 = seconds, 2 = a few minutes, 3 = real effort. */
  effort: 1 | 2 | 3;
  /** Rough time estimate shown as a soft hint ("~2 min"). */
  minutes: number;
  emoji: string;
  /** Routes into the existing compliment flow (Brief → Write → Bloom). */
  isCompliment?: boolean;
}

export const KINDNESS_ACTIONS: KindnessAction[] = [
  // ── Compliments (route to the compliment flow) ──
  { id: 'give-compliment', title: 'Give someone a genuine compliment', description: 'Tell someone something real and specific about them. It only takes a few seconds to make someone feel seen.', category: 'compliments', effort: 1, minutes: 1, emoji: '🌻', isCompliment: true },

  // ── Encouragement ──
  { id: 'encouraging-text', title: 'Send an encouraging text', description: 'Someone in your phone is having a harder week than they let on. A two-line message can carry them further than you think.', category: 'encouragement', effort: 1, minutes: 2, emoji: '💛' },
  { id: 'check-on-someone', title: 'Check on someone', description: 'Ask someone how they\'re really doing — and actually wait for the answer.', category: 'encouragement', effort: 1, minutes: 5, emoji: '📱' },
  { id: 'cheer-a-goal', title: 'Cheer someone\'s goal', description: 'Someone you know is working toward something. Tell them you believe they\'ll get there.', category: 'encouragement', effort: 1, minutes: 2, emoji: '📣' },
  { id: 'message-meaning-to-send', title: 'Send the message you\'ve been meaning to send', description: 'There\'s a text sitting half-written in your head. Today\'s the day it finally gets sent.', category: 'encouragement', effort: 2, minutes: 5, emoji: '✉️' },

  // ── Gratitude ──
  { id: 'thank-someone', title: 'Thank someone who doesn\'t hear it enough', description: 'A parent, a coworker, a friend who always shows up. Tell them plainly: "thank you — it matters."', category: 'gratitude', effort: 1, minutes: 2, emoji: '🙏' },
  { id: 'appreciate-someone', title: 'Tell someone why you\'re grateful for them', description: 'Not just "thanks" — the reason. What they did, and what it meant to you.', category: 'gratitude', effort: 2, minutes: 3, emoji: '💌' },
  { id: 'thank-helper', title: 'Thank someone who helped you recently', description: 'Someone made your week easier and probably thinks you forgot. Prove them wrong.', category: 'gratitude', effort: 1, minutes: 2, emoji: '🤲' },
  { id: 'thank-service', title: 'Genuinely thank someone doing their job', description: 'The barista, the driver, the person at the desk. Use their name if you can see it. Mean it.', category: 'gratitude', effort: 1, minutes: 1, emoji: '☕' },

  // ── Helping ──
  { id: 'help-someone', title: 'Make someone\'s day easier', description: 'Look for one small thing you can take off someone\'s plate today — then quietly do it.', category: 'helping', effort: 2, minutes: 10, emoji: '🤝' },
  { id: 'help-neighbor', title: 'Help a neighbor', description: 'Carry something, hold a door, bring in a package, shovel a walk. Small effort, long memory.', category: 'helping', effort: 2, minutes: 10, emoji: '🏠' },
  { id: 'offer-your-seat', title: 'Offer your seat or your place', description: 'On the bus, in a waiting room, wherever — give your spot to someone who needs it more.', category: 'helping', effort: 1, minutes: 1, emoji: '💺' },
  { id: 'share-knowledge', title: 'Teach someone something you know', description: 'Someone around you is stuck on a thing you find easy. Offer five minutes of what you know.', category: 'helping', effort: 2, minutes: 10, emoji: '💡' },

  // ── Giving ──
  { id: 'pay-it-forward', title: 'Pay for something small for someone', description: 'Cover a coffee, a snack, a fare. A tiny surprise that flips someone\'s whole afternoon.', category: 'giving', effort: 2, minutes: 2, emoji: '☕' },
  { id: 'generous-tip', title: 'Leave a more generous tip than usual', description: 'Round up, then a little more. To the right person on the right day, it\'s not small at all.', category: 'giving', effort: 1, minutes: 1, emoji: '💵' },
  { id: 'give-something', title: 'Give something you no longer need', description: 'Something you own could be exactly what someone else is missing. Pass it on.', category: 'giving', effort: 3, minutes: 20, emoji: '🎁' },
  { id: 'donate-something', title: 'Donate something — money, food, or time', description: 'Pick a cause that crossed your mind recently and give it something today, however small.', category: 'giving', effort: 2, minutes: 5, emoji: '❤️' },

  // ── Strangers ──
  { id: 'let-someone-ahead', title: 'Let someone go ahead of you', description: 'In line, in traffic, at the door. Give away thirty seconds; make someone\'s morning.', category: 'strangers', effort: 1, minutes: 1, emoji: '🚶' },
  { id: 'compliment-stranger', title: 'Give a stranger an unexpected compliment', description: 'Their jacket, their patience, how kind they were to the cashier. Say the nice thing out loud.', category: 'strangers', effort: 1, minutes: 1, emoji: '✨' },
  { id: 'smile-and-hello', title: 'Actually greet the people you pass', description: 'Eye contact, a real smile, a hello. You may be the friendliest moment of someone\'s day.', category: 'strangers', effort: 1, minutes: 1, emoji: '👋' },
  { id: 'hold-the-door', title: 'Slow down and hold the door', description: 'Not the half-hearted push — the full stop-and-wait. A tiny act with an outsized signal: I see you.', category: 'strangers', effort: 1, minutes: 1, emoji: '🚪' },

  // ── Friends ──
  { id: 'reach-out-old-friend', title: 'Reach out to someone you\'ve drifted from', description: '"Thought of you today" is a complete message. Old friendships rekindle on less.', category: 'friends', effort: 2, minutes: 5, emoji: '🫂' },
  { id: 'really-listen', title: 'Give someone your full attention', description: 'Phone away, eyes up. Listen to someone for a few minutes like nothing else exists.', category: 'friends', effort: 2, minutes: 10, emoji: '👂' },
  { id: 'celebrate-someone', title: 'Celebrate someone\'s win like it\'s yours', description: 'Someone you know just did something good. Make a genuinely big deal out of it.', category: 'friends', effort: 1, minutes: 3, emoji: '🎉' },
  { id: 'invite-someone', title: 'Invite someone who\'s usually left out', description: 'To lunch, to the group chat, to the plan. Being included is a kindness people never forget.', category: 'friends', effort: 2, minutes: 5, emoji: '🪑' },

  // ── Family ──
  { id: 'call-family', title: 'Call someone in your family', description: 'Not a text — a call. Ask about their day and let them talk as long as they want.', category: 'family', effort: 2, minutes: 15, emoji: '📞' },
  { id: 'do-a-chore-unasked', title: 'Do a chore that isn\'t yours', description: 'Quietly handle the thing someone else always does. Don\'t announce it. Let them find it done.', category: 'family', effort: 2, minutes: 15, emoji: '🧺' },
  { id: 'tell-family-love', title: 'Tell a family member what they mean to you', description: 'The people closest to us hear it the least. Say the thing you assume they already know.', category: 'family', effort: 1, minutes: 2, emoji: '🏡' },

  // ── Work ──
  { id: 'credit-a-coworker', title: 'Give a coworker credit publicly', description: 'Someone did good work that went unnoticed. Say so where other people can hear it.', category: 'work', effort: 1, minutes: 2, emoji: '🌟' },
  { id: 'help-newest-person', title: 'Make the newest person feel welcome', description: 'Remember your first week? Be the person you wish had checked on you.', category: 'work', effort: 2, minutes: 10, emoji: '🤗' },
  { id: 'thank-boss-or-mentor', title: 'Thank someone who taught you something', description: 'A mentor, a manager, an old teacher. Tell them one specific thing they gave you that stuck.', category: 'work', effort: 2, minutes: 5, emoji: '🎓' },

  // ── Community ──
  { id: 'pick-up-litter', title: 'Pick up three pieces of litter', description: 'Three pieces. Thirty seconds. The place you live gets a little better because you walked through it.', category: 'community', effort: 1, minutes: 2, emoji: '🌍' },
  { id: 'support-local', title: 'Support a small local business', description: 'Buy the coffee from the corner place. Leave the five-star review. Small businesses run on this.', category: 'community', effort: 2, minutes: 10, emoji: '🏪' },
  { id: 'leave-a-review', title: 'Leave a glowing review for someone who earned it', description: 'Two minutes of typing can genuinely change a small business\'s month.', category: 'community', effort: 1, minutes: 3, emoji: '⭐' },
  { id: 'return-the-cart', title: 'Do the invisible right thing', description: 'Return the cart. Reshelve the item. Wipe the machine. Kindness nobody sees still counts — maybe most.', category: 'community', effort: 1, minutes: 2, emoji: '🛒' },

  // ── Yourself ──
  { id: 'kind-to-yourself', title: 'Do something kind for yourself', description: 'Rest, a walk, your favorite meal, saying no to one thing. You can\'t pour from an empty cup.', category: 'self', effort: 1, minutes: 15, emoji: '🌱' },
  { id: 'self-compliment', title: 'Give yourself the compliment you\'d give a friend', description: 'Notice one thing you did right recently and actually say it to yourself. Out loud counts double.', category: 'self', effort: 1, minutes: 1, emoji: '🪞' },
  { id: 'forgive-small-thing', title: 'Let one small grudge go', description: 'The slow driver, the short reply, the tiny slight. Set it down. That\'s kindness in both directions.', category: 'self', effort: 1, minutes: 1, emoji: '🕊️' },

  // ── Small things ──
  { id: 'leave-a-note', title: 'Leave a kind note for someone to find', description: 'On a desk, in a lunchbox, on a mirror. A few written words, found unexpectedly, get kept for years.', category: 'small-things', effort: 1, minutes: 3, emoji: '📝' },
  { id: 'share-something-good', title: 'Share something that made you smile', description: 'The song, the photo, the article. Send it to the one person it will land perfectly with.', category: 'small-things', effort: 1, minutes: 2, emoji: '😊' },
  { id: 'notice-an-opportunity', title: 'Notice one opportunity to be kind', description: 'Just keep your eyes open today. When the moment shows up — and it will — take it.', category: 'small-things', effort: 1, minutes: 1, emoji: '👀' },
  { id: 'random-act', title: 'Do something kind, expecting nothing back', description: 'Your call. Anything, for anyone, with zero expectation of thanks. That\'s the purest kind.', category: 'small-things', effort: 2, minutes: 5, emoji: '🎲' },
];

const byId = new Map(KINDNESS_ACTIONS.map(a => [a.id, a]));
export const getKindnessAction = (id: string): KindnessAction | undefined => byId.get(id);

// ── Daily rotation ───────────────────────────────────────────────
// Deterministic per local calendar date. Compliment days recur every
// third day so the compliment experience (and the server's daily topic)
// stays central without being the only thing the app asks of you.

const NON_COMPLIMENT_DAILY: string[] = [
  'encouraging-text', 'thank-someone', 'pay-it-forward',
  'check-on-someone', 'help-someone', 'let-someone-ahead',
  'appreciate-someone', 'reach-out-old-friend', 'leave-a-note',
  'really-listen', 'thank-helper', 'pick-up-litter',
  'call-family', 'credit-a-coworker', 'kind-to-yourself',
  'compliment-stranger', 'do-a-chore-unasked', 'share-something-good',
  'thank-service', 'invite-someone', 'generous-tip',
  'celebrate-someone', 'help-neighbor', 'notice-an-opportunity',
];

/** Stable day number for a YYYY-MM-DD string (days since epoch-ish). */
function dayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Date.UTC keeps this stable regardless of device timezone — the input
  // is already the user's LOCAL calendar date.
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86400000);
}

/**
 * Today's suggested kindness. Every 3rd day is a compliment day (the
 * server's daily topic supplies the flavor); the other days walk through
 * the non-compliment rotation in a fixed order.
 */
export function getDailyKindness(dateStr: string = todayLocal()): KindnessAction {
  const n = dayNumber(dateStr);
  if (n % 3 === 0) return byId.get('give-compliment')!;
  // Two non-compliment days out of every three → advance the rotation by
  // 2 per 3-day cycle, +1 on the cycle's second day.
  const idx = Math.floor(n / 3) * 2 + (n % 3 === 2 ? 1 : 0);
  const id = NON_COMPLIMENT_DAILY[idx % NON_COMPLIMENT_DAILY.length];
  return byId.get(id) ?? KINDNESS_ACTIONS[1];
}

/**
 * A random kindness idea for the "Give me an idea" flow. Excludes ids in
 * `exclude` (recently shown / already done today) until the pool runs dry.
 */
export function getRandomKindness(exclude: string[] = []): KindnessAction {
  const pool = KINDNESS_ACTIONS.filter(a => !exclude.includes(a.id));
  const source = pool.length > 0 ? pool : KINDNESS_ACTIONS;
  return source[Math.floor(Math.random() * source.length)];
}

/** Actions grouped for the Explore screen, in display order. */
export const EXPLORE_CATEGORIES: KindnessCategory[] = [
  'compliments', 'encouragement', 'gratitude', 'helping', 'giving',
  'strangers', 'friends', 'family', 'work', 'community', 'self', 'small-things',
];

export function getActionsByCategory(cat: KindnessCategory): KindnessAction[] {
  return KINDNESS_ACTIONS.filter(a => a.category === cat);
}

// ── Completion moments ───────────────────────────────────────────
// Rotating warm copy for the "you did it" screen. Picked by day so the
// moment stays fresh without needing Math.random at render time.

export const COMPLETION_LINES: { title: string; sub: string }[] = [
  { title: 'You did it. 🌻', sub: 'One small act. One better moment for someone else.' },
  { title: 'That mattered.', sub: 'It took you a minute. It might stay with them all day.' },
  { title: 'Kindness looks good on you.', sub: 'Someone\'s day just got a little lighter.' },
  { title: 'One person\'s day, made.', sub: 'Small things are never as small as they look.' },
  { title: 'The world tilted a little kinder.', sub: 'Because you decided it should. Nice work.' },
];

export function getCompletionLine(dateStr: string = todayLocal()): { title: string; sub: string } {
  return COMPLETION_LINES[dayNumber(dateStr) % COMPLETION_LINES.length];
}
