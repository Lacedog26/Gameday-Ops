import { todayLocal } from './dates'

export type OnboardStep = { emoji: string; headline: string; sub: string; cta: string }
export type Challenge = { prompt: string; rule: string; example: string; why: string }
export type Milestone = { days: number; emoji: string; badge: string; color: string; title: string; message: string; confetti: string[] }
export type Language = { code: string; name: string; native: string; flag: string; dir: 'ltr' | 'rtl' }

export const ONBOARD_STEPS: OnboardStep[] = [
  { emoji: '🌅', headline: "When's the last time you gave someone a compliment?", sub: 'Not a like. Not a reaction. A real, specific, genuine compliment — on purpose.', cta: 'I want to do that' },
  { emoji: '☀️', headline: 'Give one compliment. Every day.', sub: "Each day brings a fresh way to say it — out loud, something they'll feel. Small, but real.", cta: 'That sounds doable' },
  { emoji: '🌻', headline: "A few words can make someone's whole day.", sub: "Create a group with friends, family, or coworkers. Watch each other's streaks. Don't let the squad down.", cta: 'Get started' },
]

export const CHALLENGES: Challenge[] = [
  { prompt: 'Say it without using their name', rule: "Write your compliment without saying the person's name. Not once.", example: 'The way you show up quietly and make everything better — I notice that more than you know.', why: 'Removing the name forces you to be specific about what makes them unique.' },
  { prompt: 'Say it in exactly 10 words', rule: 'Your compliment must be exactly 10 words. Count every word.', example: 'You make every room feel warmer just by walking in.', why: 'Every word has to earn its place.' },
  { prompt: 'Compliment what they do, not who they are', rule: "No 'you are' statements. Focus on a specific action.", example: 'You always ask how someone is doing and actually wait to hear the answer.', why: 'A specific action sticks with someone for years.' },
  { prompt: "Say it like you'd write it in a card", rule: 'Warm, personal, meant to be kept.', example: "I'm so glad you're in my life. You make ordinary days worth remembering.", why: 'Cards get saved. People reread them years later.' },
  { prompt: 'Use a color somewhere in it', rule: 'Your compliment must include at least one color.', example: 'You bring this golden energy to everything you touch.', why: "A random constraint unlocks angles you'd never find otherwise." },
  { prompt: "Say something they've probably never been told", rule: 'Say the thing no one else has probably ever said to them.', example: 'You have this rare ability to make people feel like the most interesting person in the room.', why: 'Most compliments are things people have heard before. This one has to be new.' },
  { prompt: 'Say it to yourself today', rule: 'You are the recipient. Write a genuine compliment to yourself.', example: "I keep showing up even when it's hard, and I don't give myself enough credit for that.", why: "You can't pour from an empty cup." },
  { prompt: "Write it without using the word 'you'", rule: "The word 'you' cannot appear anywhere. Not once.", example: "There's a kind of person who makes everyone around them feel seen — that's who I'm thinking about.", why: "Removing 'you' forces a completely different sentence structure." },
  { prompt: "Say it out loud — don't text it", rule: 'This compliment must be spoken. In person or on a call.', example: 'Walk up to them. Pick up the phone. Just say it.', why: 'Hearing a compliment is 10x more powerful than reading one.' },
  { prompt: "Start with 'I never told you...'", rule: "Begin with the words 'I never told you' — then finish honestly.", example: 'I never told you how much that one thing you said two years ago still stays with me.', why: 'Those four words signal that something real is coming.' },
  { prompt: 'Make it about a moment, not a trait', rule: 'Describe one specific moment you witnessed.', example: "That day you stayed late to help without being asked — I haven't forgotten that.", why: 'Specific moments are unforgettable. Traits are forgettable.' },
  { prompt: 'Say it in a question', rule: 'Write your compliment as a genuine question.', example: 'Do you know how rare it is to find someone who actually listens the way you do?', why: 'A question lands differently — it invites them to sit with it.' },
  { prompt: 'Write it like the opening line of a story', rule: 'Start your compliment like the first sentence of a novel about this person.', example: "There's a person in my life who makes everyone around them feel like they matter — and they don't even realize it.", why: 'A great opening line makes you want to keep reading.' },
  { prompt: "Compliment someone you haven't spoken to in a while", rule: "Think of someone you've drifted from. Say the thing you never got around to saying.", example: 'I still think about the advice you gave me years ago. It changed something.', why: "The longer you've waited to say it, the more it means." },
  { prompt: 'Use a number in it', rule: 'Your compliment must include a specific number.', example: "I've seen you handle hard things at least a dozen times. You never fold.", why: 'Numbers make vague praise feel specific and earned.' },
  { prompt: "Start with 'Most people don't notice...'", rule: 'Begin with those exact words and finish honestly.', example: "Most people don't notice how much work you put in before anyone else is watching.", why: 'Noticing what others miss is the highest form of a compliment.' },
  { prompt: 'Say it in exactly 5 words', rule: 'Five words. Not four, not six.', example: 'You make hard things beautiful.', why: 'The tightest constraints produce the most surprising results.' },
  { prompt: 'Compliment their consistency', rule: 'Focus on something they show up for every single day, quietly.', example: 'You do the same thing every day — show up fully — and most people never notice how hard that is.', why: 'Consistency is the most underappreciated quality in people.' },
  { prompt: "Write it as if they'll read it in 10 years", rule: 'Imagine they find this compliment a decade from now.', example: 'I hope you remember this period of your life as the one where you figured out who you really were.', why: 'The best compliments are time capsules.' },
  { prompt: 'Say the thing you always think but never say', rule: "There's something you've thought about this person a hundred times. Say it today.", example: 'Every time I see your name on my phone I smile before I even open it.', why: 'The unsaid things are usually the truest things.' },
  { prompt: 'Compliment how they make others feel', rule: "Don't describe them — describe what the room feels like when they're in it.", example: 'Something shifts when you walk in. People stand a little taller.', why: 'Impact on others is the most powerful thing you can recognize.' },
  { prompt: 'Use a season or weather in it', rule: 'Your compliment must reference a season, weather, or time of day.', example: "You're the kind of person that feels like the first warm day after a long winter.", why: 'Sensory language makes compliments feel vivid and memorable.' },
  { prompt: 'Compliment their courage', rule: "Think of something brave they did that maybe they don't see as brave.", example: 'You said the true thing in the room when everyone else stayed quiet. That took more courage than you know.', why: 'People rarely recognize their own bravery.' },
  { prompt: 'Write it backwards — end with the setup', rule: 'Say the compliment first, then explain what earned it.', example: "You're irreplaceable. Not because of what you do — because of how you make people feel seen while you're doing it.", why: 'Leading with the punch lands harder.' },
  { prompt: 'Say it in third person', rule: "Write your compliment as if you're telling someone else about this person.", example: "There's someone in my life who shows up for people without keeping score. That's genuinely rare.", why: "Third person creates a kind of awe that first person can't reach." },
  { prompt: 'Compliment something invisible', rule: 'Pick something about them that no one can see.', example: "The quiet way you hold yourself together when everything is falling apart — I see that. It's extraordinary.", why: 'Invisible qualities feel unseen. Until someone names them.' },
  { prompt: "Start with 'The world is better because...'", rule: 'Begin with those exact words.', example: 'The world is better because you ask questions that make people think about things differently.', why: "When it's earned, it's the truest thing you can say." },
  { prompt: 'Say it like a toast', rule: "Write your compliment as if you're raising a glass.", example: "To someone who makes hard work look effortless and kindness look natural — I'm lucky to know you.", why: 'A toast format gives your words weight and ceremony.' },
  { prompt: 'Compliment their timing', rule: 'Think about a moment they showed up at exactly the right time.', example: "You appeared at one of the hardest points of my year. I don't know if you knew that, but it mattered.", why: 'Being there at the right moment is a form of grace.' },
  { prompt: "Say it in a place they'd least expect", rule: 'This one is about delivery. Say it somewhere unexpected.', example: "Don't overthink it. Just pick the moment and say it somewhere they won't expect it.", why: 'The unexpected timing is half the gift.' },
]

export const MILESTONES: Milestone[] = [
  { days: 7, emoji: '🌱', badge: 'First Bloom', color: '#A8E6CF', title: 'One week of lifting people up.', message: "You've built something most people never do — a habit of kindness. Seven people felt more seen because of you.", confetti: ['🌻', '🌱', '✦', '🌿', '💚'] },
  { days: 14, emoji: '🌻', badge: 'Two Weeks Strong', color: '#F5C842', title: "Two weeks. You're not stopping.", message: "Most people quit in the first week. You didn't.", confetti: ['🌻', '☀️', '✦', '🌸', '⭐'] },
  { days: 30, emoji: '🏅', badge: 'One Month', color: '#FFB347', title: 'A whole month of lifting people.', message: "30 days. That's not a habit anymore — that's who you are.", confetti: ['🏅', '🌻', '🎉', '✨', '🔥', '⭐'] },
  { days: 60, emoji: '💫', badge: 'Two Months', color: '#C3B1E1', title: "Two months. You're rare.", message: "Almost no one gets here. You've lifted 60 people in 60 days.", confetti: ['💫', '🌻', '✨', '🎊', '⭐', '🌟'] },
  { days: 100, emoji: '🌟', badge: '100 Days', color: '#F5C842', title: '100 days of lifting people up.', message: "One hundred. That's a legacy.", confetti: ['🌟', '🏆', '🌻', '🎉', '✨', '💫', '🎊', '⭐', '🔥'] },
]

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { code: 'zh', name: 'Mandarin', native: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', flag: '🇰🇪', dir: 'ltr' },
  { code: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱', dir: 'ltr' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
  { code: 'th', name: 'Thai', native: 'ภาษาไทย', flag: '🇹🇭', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'fa', name: 'Persian', native: 'فارسی', flag: '🇮🇷', dir: 'rtl' },
  { code: 'he', name: 'Hebrew', native: 'עברית', flag: '🇮🇱', dir: 'rtl' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇧🇩', dir: 'ltr' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', flag: '🇺🇦', dir: 'ltr' },
  { code: 'ro', name: 'Romanian', native: 'Română', flag: '🇷🇴', dir: 'ltr' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά', flag: '🇬🇷', dir: 'ltr' },
  { code: 'cs', name: 'Czech', native: 'Čeština', flag: '🇨🇿', dir: 'ltr' },
  { code: 'sv', name: 'Swedish', native: 'Svenska', flag: '🇸🇪', dir: 'ltr' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar', flag: '🇭🇺', dir: 'ltr' },
  { code: 'fi', name: 'Finnish', native: 'Suomi', flag: '🇫🇮', dir: 'ltr' },
  { code: 'no', name: 'Norwegian', native: 'Norsk', flag: '🇳🇴', dir: 'ltr' },
  { code: 'da', name: 'Danish', native: 'Dansk', flag: '🇩🇰', dir: 'ltr' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', flag: '🇲🇾', dir: 'ltr' },
  { code: 'fil', name: 'Filipino', native: 'Filipino', flag: '🇵🇭', dir: 'ltr' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans', flag: '🇿🇦', dir: 'ltr' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu', flag: '🇿🇦', dir: 'ltr' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá', flag: '🇳🇬', dir: 'ltr' },
  { code: 'ha', name: 'Hausa', native: 'Hausa', flag: '🇳🇬', dir: 'ltr' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ', flag: '🇪🇹', dir: 'ltr' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰', dir: 'rtl' },
]

export const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#C3B1E1', '#FFB347', '#A8E6CF', '#FF8B94', '#85C1E9']

export function getDayOfYear(): number {
  const now = new Date()
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000)
}

export function getTodayKey(): string {
  return todayLocal()
}

export function getChallenge(): Challenge {
  return CHALLENGES[getDayOfYear() % CHALLENGES.length]
}

export function getMilestone(n: number): Milestone | undefined {
  return MILESTONES.find((m) => m.days === n)
}

export function getNextMilestone(n: number): Milestone | undefined {
  return MILESTONES.find((m) => m.days > n)
}
