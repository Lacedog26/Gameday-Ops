import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Onboarding } from '../components/Onboarding'
import { Landing } from '../components/Landing'
import { Brief } from '../components/Brief'
import { Write } from '../components/Write'
import { Bloom } from '../components/Bloom'
import { Groups } from '../components/Groups'
import { GroupFeed } from '../components/GroupFeed'
import { Teams } from '../components/Teams'
import { TeamDetail } from '../components/TeamDetail'
import { BottomNav } from '../components/BottomNav'
import { LanguageSheet } from '../components/LanguageSheet'
import { MilestoneOverlay } from '../components/MilestoneOverlay'
import { CookieBanner } from '../components/CookieBanner'
import { UsernameClaim } from '../components/UsernameClaim'
import { UsernameRequiredModal } from '../components/UsernameRequiredModal'
import { storage } from '../lib/storage'
import { postGroupCompliment, loadMyGroups } from '../lib/groups'
import {
  getChallenge,
  getMilestone,
  LANGUAGES,
  type Challenge,
  type Language,
  type Milestone,
} from '../lib/data'
import {
  loadDailyPrompt,
  loadMyStreak,
  loadTodayCompletion,
  submitCompliment,
  verifyRecentCompletion,
} from '../lib/supabase'
import { todayLocal } from '../lib/dates'
import { useAuth } from '../hooks/useAuth'
import { useGroups } from '../hooks/useGroups'
import { useTeams } from '../hooks/useTeams'
import { useProStatus } from '../hooks/useProStatus'
import { useStreakFreezeStatus } from '../hooks/useStreakFreeze'
import { useMyMembershipRealtime } from '../hooks/useRealtime'
import { useInvitations } from '../hooks/useInvitations'

type Screen =
  | 'onboard'
  | 'username'
  | 'landing'
  | 'brief'
  | 'write'
  | 'bloom'
  | 'groups'
  | 'feed'
  | 'teams'
  | 'team-detail'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

function loadAnalytics() {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID
  if (!id) return
  if (document.querySelector('script[data-ga="1"]')) return
  const s = document.createElement('script')
  s.async = true
  s.dataset.ga = '1'
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer || []
  window.gtag = function () {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', id)
}

export default function Home() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { groups, refresh: refreshGroups } = useGroups(!auth.loading && !!auth.userId)
  const { teams, refresh: refreshTeams } = useTeams(!auth.loading && !!auth.userId)
  const { isPro } = useProStatus(!auth.loading && !!auth.userId)
  const {
    teamInvites,
    groupInvites,
    refresh: refreshInvites,
  } = useInvitations(!auth.loading && !!auth.userId)
  const { status: freezeStatus, useFreeze } = useStreakFreezeStatus(
    !auth.loading && !!auth.userId,
  )

  // Local dismiss flag for the setup modal — the returning-user branch
  // doesn't claim a username, so without this `!auth.username` would keep
  // the modal mounted when we route to /settings for verify, and a back
  // navigation would show it over the verify form. Reset naturally when
  // Home re-mounts (route change unmounts the page).
  const [setupDismissed, setSetupDismissed] = useState(false)
  const [screen, setScreen] = useState<Screen>(() =>
    storage.isOnboarded() ? 'landing' : 'onboard',
  )
  const [challenge, setChallenge] = useState<Challenge>(() => getChallenge())
  const [streak, setStreak] = useState<number>(0)
  // ISO date string of the user's most recent completion. Drives the
  // "one compliment per day" rule + the bloomed-today gate on Home.
  // Lazy initializer reads the localStorage snapshot so a page refresh
  // post-submit lands directly on Done — no Landing flash while we
  // wait for the auth session and loadTodayCompletion to round-trip.
  const [lastCompleted, setLastCompleted] = useState<string | null>(() =>
    storage.getTodayLift() ? todayLocal() : null,
  )
  const [currentLang, setCurrentLang] = useState<Language>(() => LANGUAGES[0])
  const [last, setLast] = useState<{
    recipient: string
    response: string
    /** UUID of the registered recipient when the sender picked one from
     *  the search dropdown — null when they typed a free-form name.
     *  Done branches its share UX on this. */
    recipientUserId: string | null
    completionId: string | null
  } | null>(() => {
    const snap = storage.getTodayLift()
    return snap
      ? {
          recipient: snap.recipient,
          response: snap.response,
          recipientUserId: snap.recipientUserId,
          completionId: snap.completionId,
        }
      : null
  })

  const [langOpen, setLangOpen] = useState(false)
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)

  const [cookieChoice, setCookieChoice] = useState<'accepted' | 'rejected' | null>(() =>
    storage.getCookieChoice(),
  )

  // Live: refresh group + team lists whenever this user's membership rows
  // change anywhere (joined a group from another tab, accepted an invite,
  // got removed by an admin, etc.).
  useMyMembershipRealtime(auth.userId, () => {
    refreshGroups()
    refreshTeams()
  })

  // ── Static loads — fire once on mount, no auth required ───────
  useEffect(() => {
    if (cookieChoice === 'accepted') loadAnalytics()
    ;(async () => {
      const data = await loadDailyPrompt()
      // We surface the server's prompt text in the UI but intentionally
      // don't track its id — mobile passes p_prompt_id=null to
      // complete_daily_prompt and we mirror that.
      // Belt-and-suspenders: only overwrite the local-fallback challenge
      // if the server text is actually usable. loadDailyPrompt already
      // filters empty / "null" / "undefined", but checking here too means
      // a regressed RPC can never put a bogus prompt in React state.
      const text = data?.prompt_text?.trim()
      if (text && !/^(null|undefined)$/i.test(text)) {
        setChallenge((prev) => ({ ...prev, prompt: text }))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth-dependent loads — re-run when the session resolves ─────
  // The init effect above used to do this with `[]` deps, but on a
  // fresh mount `auth.userId` hasn't been bootstrapped yet (anonymous
  // sign-in is async), so loadMyStreak / loadTodayCompletion saw no
  // session and silently returned null — the bloomed-today gate never
  // fired. Hanging the effect on auth.userId ensures it runs once
  // a session is in hand, and re-runs on sign-in / sign-out.
  useEffect(() => {
    if (auth.loading || !auth.userId) return
    let cancelled = false
    ;(async () => {
      // Authoritative: is there a `compliments` row from this user
      // since local midnight? `user_streaks.last_completed_on` is
      // unreliable on this DB, so we probe the canonical table.
      const today = todayLocal()
      const t = await loadTodayCompletion()
      if (cancelled) return
      console.log('[Home init] loadTodayCompletion result:', t ? 'found row' : 'null', { userId: auth.userId })
      if (t) {
        setLast({
          recipient: t.recipientName,
          response: t.body,
          recipientUserId: t.recipientId,
          completionId: t.id,
        })
        setLastCompleted(today)
        // Refresh the snapshot from the server's truth so a later
        // refresh has the most up-to-date data (e.g. recipient_id may
        // have been resolved from username lookup post-submit).
        storage.setTodayLift({
          recipient: t.recipientName,
          response: t.body,
          recipientUserId: t.recipientId,
          completionId: t.id,
        })
      } else {
        // Server says no row from today. If we had an optimistic
        // snapshot, it was either stale or for a different user — drop
        // it so we don't keep showing Done over Landing forever.
        const snap = storage.getTodayLift()
        if (snap) {
          storage.clearTodayLift()
          setLast(null)
          setLastCompleted(null)
        }
      }

      const s = await loadMyStreak()
      if (cancelled) return
      if (s) {
        setStreak(s.current_streak)
        // CRITICAL: do NOT setLastCompleted(s.last_completed) when it's
        // null. The streak column on this DB is often null even right
        // after a successful submit, and clobbering a freshly-set
        // "today" with null was making Home flip from Done back to
        // Landing post-submit. Only fall through to the streak value
        // when (a) loadTodayCompletion didn't find a row AND (b) the
        // streak column actually has a date string.
        if (!t && s.last_completed) setLastCompleted(s.last_completed)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [auth.loading, auth.userId])

  // ── legacy invite-link redirect ─────────────────────────────────
  // Links shared before build*JoinUrl switched to /join/<type>/<code>
  // arrive as `?join=CODE` (group) or `?join=CODE&type=team`. Hand
  // both to the Join page, which enforces the username/email gates
  // the join_* RPCs expect — the old inline joinGroup flow here
  // skipped them. No auth wait: Join handles its own auth states.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('join')
    if (!code) return
    const type = params.get('type') === 'team' ? 'team' : 'group'
    navigate(`/join/${type}/${code}`, { replace: true })
  }, [navigate])

  // ── route auth gate: after onboarding, force username claim ────
  useEffect(() => {
    if (auth.loading) return
    if (screen === 'landing' && !auth.username) {
      setScreen('username')
    }
  }, [auth.loading, auth.username, screen])

  // Honour ?go=<screen> from BottomNav navigations issued from other routes.
  // When the user taps "Groups" on /history we navigate to /?go=groups —
  // here we read that and flip the screen state, then strip the param.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const go = params.get('go')
    if (!go) return
    if (go === 'groups') setScreen('groups')
    else if (go === 'teams') setScreen('teams')
    else if (go === 'home') setScreen('landing')
    // Settings is its own route now — no longer handled here.
    // Strip the query so the param doesn't re-fire on the next render.
    navigate(location.pathname, { replace: true })
  }, [location.search, location.pathname, navigate])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [screen])

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [],
  )

  const finishOnboard = () => {
    storage.setOnboarded()
    setScreen(auth.username ? 'landing' : 'username')
  }

  const onSelectLang = (lang: Language) => {
    setCurrentLang(lang)
    document.documentElement.dir = lang.dir
  }

  // Mirrors mobile/BloomScreen.tsx exactly:
  //   1. submitCompliment(body, promptId=null, recipientName)
  //      — promptId is intentionally null, not the global daily prompt id.
  //   2. Update streak from server, fall back to +1 on failure.
  //   3. Fan-out to each cloud group with that group's pinned_challenge
  //      as the prompt context (NOT the global daily challenge).
  //   4. Teams are NOT auto-fanned-out from here — they have their own
  //      moderated submit flow via submit_team_completion.
  const handleSubmit = async (
    recipient: string,
    recipientUserId: string | null,
    response: string,
  ) => {
    // Pre-flight: if we already know they bloomed today, skip the
    // server round-trip and land them straight on the Done screen.
    // Avoids the brief "Bloom" flash + the "you already completed"
    // alert when state is fresh in our hand.
    const todayIso = todayLocal()
    if (lastCompleted === todayIso) {
      const t = await loadTodayCompletion()
      if (t) {
        setLast({
          recipient: t.recipientName,
          response: t.body,
          recipientUserId: t.recipientId,
          completionId: t.id,
        })
      }
      setScreen('landing')
      return
    }

    setLast({ recipient, response, recipientUserId, completionId: null })
    setScreen('bloom')

    try {
      const { completionId, error } = await submitCompliment({
        body: response,
        promptId: null,
        recipientName: recipient,
        recipientId: recipientUserId,
      })
      if (error) {
        // Special case: server says they already completed today —
        // happens when the browser had a stale lastCompleted (e.g.
        // submitted in another tab). Recover by hydrating today's
        // compliment from the server and showing Done.
        if (/already completed.*today/i.test(error.message)) {
          const [t, s] = await Promise.all([loadTodayCompletion(), loadMyStreak()])
          if (t) {
            setLast({
              recipient: t.recipientName,
              response: t.body,
              recipientUserId: t.recipientId,
              completionId: t.id,
            })
          }
          if (s) {
            setStreak(s.current_streak)
            setLastCompleted(s.last_completed)
          }
          setScreen('landing')
          return
        }

        // Make other failures unmissable. Server-side errors here
        // usually mean RLS rejects the insert, the JWT is stale, or
        // the RPC isn't deployed at the expected signature.
        console.error('Submit error:', error)
        // The compliments_sender_id_fkey violation specifically means an
        // anonymous user has no profiles row yet. The 20260504 migration
        // adds a BEFORE INSERT trigger that creates one automatically;
        // until that runs, surface a friendly hint instead of the raw
        // SQLSTATE 23503 message.
        const friendly = /compliments_sender_id_fkey|violates foreign key/i.test(error.message)
          ? "We couldn't link this compliment to your profile. Pick a username from the profile menu, then try again."
          : error.message
        alert(`Could not save your compliment.\n\n${friendly}\n\nIt's still in the form — try again.`)
        setScreen('write')
        return
      }

      // Stamp the completion id on the last-result so Done can build the
      // public share link `/c/<id>` without needing another query.
      setLast((prev) =>
        prev ? { ...prev, completionId: completionId ?? prev.completionId } : prev,
      )

      // Persist a snapshot so a page refresh later in the day lands
      // straight on Done — no Landing flash while auth + the
      // compliments query round-trip. Cleared automatically by
      // storage.getTodayLift() once the date rolls past midnight.
      storage.setTodayLift({
        recipient,
        response,
        recipientUserId,
        completionId: completionId ?? null,
      })

      // Belt-and-suspenders: even when the RPC returns no error, verify
      // a row actually landed in `completions` for this user in the last
      // 60s. Catches silent no-ops where an out-of-date deployed function
      // writes to the wrong table or short-circuits without inserting.
      const saved = await verifyRecentCompletion()
      if (!saved) {
        console.error('Submit verify failed — RPC returned ok but no row in completions for this user')
        alert(
          "We didn't find your compliment in the database after submitting.\n\n" +
            'This usually means the server function is out of date. ' +
            "Apply the latest migrations (`supabase db push`) and try again.\n\n" +
            "(Open DevTools → Console for details.)",
        )
        setScreen('write')
        return
      }

      const s = await loadMyStreak()
      const next = s ? s.current_streak : streak + 1
      setStreak(next)
      // Force today regardless of what loadMyStreak returns. The server
      // column `user_streaks.last_completed_on` is unreliable on this
      // DB (the live RPC may not update it on every submit), so reading
      // it back here would clobber our just-confirmed "yes, bloomed
      // today" with a stale yesterday-or-older value — which is what
      // was making Home flip back to Landing after a successful lift.
      setLastCompleted(todayLocal())

      // Reload groups fresh from the server before fan-out — the cached
      // `groups` state may be stale if the user joined one moments ago.
      try {
        const fresh = await loadMyGroups()
        await Promise.all(
          fresh.map((g) =>
            postGroupCompliment(g.id, response, recipient, null, g.pinned_challenge),
          ),
        )
      } catch {
        /* offline — skip group fan-out, personal submit already landed */
      }
      refreshGroups()

      const ms = getMilestone(next)
      if (ms) setMilestone(ms)
    } catch (err) {
      const msg = (err as { message?: string } | null)?.message ?? String(err)
      console.error('submitChallenge crashed:', err)
      alert(`Could not save your compliment.\n\n${msg}\n\nIt's still in the form — try again.`)
      setScreen('write')
    }
  }

  const onBloomFinish = () => {
    if (milestone) return
    // Per client feedback (2026-05-14): after submit the user should
    // land back on Home (Landing), not on a separate Done page. The
    // SEND IT TO X card now renders inline on Landing for unregistered
    // recipients. The full Done page still exists as a screen value
    // but is no longer the post-bloom default.
    setScreen('landing')
  }

  const onMilestoneContinue = () => {
    // Milestone overlay shows over Bloom — dismissing it lands the user
    // on Landing (which now houses the SEND IT TO X card). Done screen
    // is removed entirely (see Home tab feedback: a "Back to home"
    // button shouldn't appear on the home page).
    setMilestone(null)
    setScreen('landing')
  }

  const showBottomNav =
    screen === 'landing' ||
    screen === 'groups' ||
    screen === 'feed' ||
    screen === 'teams' ||
    screen === 'team-detail'

  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) : null
  const activeTeam = activeTeamId ? teams.find((t) => t.id === activeTeamId) : null

  return (
    <>
      <div className="oc-wrap">
        <div key={screen} className="oc-screen screen-fade">
          {screen === 'onboard' && <Onboarding onFinish={finishOnboard} />}
          {screen === 'username' && (
            <UsernameClaim
              onClaimed={async (name) => {
                const result = await auth.claimUsername(name)
                if (result.ok) setScreen('landing')
                return result
              }}
            />
          )}
          {screen === 'landing' && (
            // The Home tab always renders Landing. When the user has
            // bloomed today, Landing internally renders its <BloomedToday>
            // mini card (streak + "Come back tomorrow") inline — so the
            // Home tab is the "where to send" entry point at all times.
            // Done is reserved for the active submit flow only
            // (Write → Bloom → Done), where it's reached via setScreen('done')
            // in onBloomFinish. Previously this branch routed bloomed
            // users to <Done> here, making the full celebration page
            // (share card + Pro upsell + Teams card) the de facto home
            // state — client feedback flagged that as wrong.
            <Landing
              challenge={challenge}
              langFlag={currentLang.flag}
              onOpenLang={() => setLangOpen(true)}
              onPlay={async () => {
                // Server pre-flight before letting the user into Brief:
                // local `lastCompleted` can be stale (other tab / other
                // device just bloomed). Confirm via loadTodayCompletion
                // and skip Brief entirely if today's row already exists.
                // Belt-and-suspenders behind the DB trigger from
                // 20260513_enforce_one_per_day.sql.
                try {
                  const t = await loadTodayCompletion()
                  if (t) {
                    setLast({
                      recipient: t.recipientName,
                      response: t.body,
                      recipientUserId: t.recipientId,
                      completionId: t.id,
                    })
                    setLastCompleted(todayLocal())
                    return
                  }
                } catch {
                  /* offline — fall through; DB trigger is the real guard */
                }
                setScreen('brief')
              }}
              todayLabel={todayLabel}
              isPro={isPro}
              freezeStatus={freezeStatus}
              onUseFreeze={async () => {
                const result = await useFreeze()
                if (result.ok) {
                  const s = await loadMyStreak()
                  if (s) setStreak(s.current_streak)
                }
                return result
              }}
              bloomedToday={lastCompleted === todayLocal()}
              streak={streak}
              todayCompletion={
                last && last.completionId
                  ? {
                      id: last.completionId,
                      body: last.response,
                      recipientName: last.recipient,
                      recipientId: last.recipientUserId,
                    }
                  : null
              }
            />
          )}
          {screen === 'brief' && lastCompleted === todayLocal() && (
            // Defensive guard: if a user URL-jumps or otherwise lands on
            // Brief while already bloomed today, bounce to Landing.
            // Mobile enforces this same rule in WriteScreen's useEffect.
            <RedirectToLanding go={() => setScreen('landing')} />
          )}
          {screen === 'brief' && lastCompleted !== todayLocal() && (
            <Brief
              challenge={challenge}
              langFlag={currentLang.flag}
              onOpenLang={() => setLangOpen(true)}
              onBack={() => setScreen('landing')}
              onContinue={() => setScreen('write')}
            />
          )}
          {screen === 'write' && lastCompleted === todayLocal() && (
            // Defensive guard: mirrors mobile WriteScreen's bloomed-today check.
            // If the user lingers on Write past midnight (or URL-jumps after
            // bloom), bounce them back to Landing rather than let the server
            // reject the second submit with a one-per-day error.
            <RedirectToLanding go={() => setScreen('landing')} />
          )}
          {screen === 'write' && lastCompleted !== todayLocal() && (
            <>
              <UsernameRequiredModal
                visible={!auth.loading && !auth.username && !setupDismissed}
                onCancel={() => setScreen('landing')}
                onComplete={({ email, emailSent }) => {
                  // Always dismiss locally — for the returning-user branch
                  // no username is claimed, so `!auth.username` alone would
                  // keep the modal stacked over the verify route below.
                  setSetupDismissed(true)
                  // If the user supplied an email and OTP went out, route
                  // them to the LinkEmail verify step so they don't have to
                  // re-type the address. The compliment they were about to
                  // write is preserved by Write's local state.
                  if (email && emailSent) {
                    navigate(
                      `/settings?view=link-email&email=${encodeURIComponent(email)}&verify=1`,
                    )
                  }
                }}
              />
              <Write
                challenge={challenge}
                langFlag={currentLang.flag}
                onOpenLang={() => setLangOpen(true)}
                onBack={() => setScreen('brief')}
                onSubmit={handleSubmit}
              />
            </>
          )}
          {screen === 'bloom' && <Bloom onFinish={onBloomFinish} />}
          {/* Done screen intentionally removed (2026-05-14). After Bloom
              the user lands on screen='landing' where the SEND IT TO X
              card now lives. Keeping a separate Done branch would let
              its "Back to home" button appear while the user is on the
              Home tab — the inconsistency the client flagged. */}
          {screen === 'groups' && (
            <Groups
              groups={groups}
              username={auth.username}
              hasEmail={!!auth.email}
              onChange={refreshGroups}
              onBack={() => setScreen('landing')}
              onOpenGroup={(id) => {
                setActiveGroupId(id)
                setScreen('feed')
              }}
              pendingInvites={groupInvites}
              onInvitesChange={() => {
                refreshInvites()
                refreshGroups()
              }}
              onOpenLinkEmail={() => navigate('/settings?view=link-email')}
            />
          )}
          {screen === 'feed' && activeGroup && (
            <GroupFeed
              group={activeGroup}
              currentUserId={auth.userId}
              onChange={refreshGroups}
              onBack={() => {
                setActiveGroupId(null)
                setScreen('groups')
              }}
            />
          )}
          {screen === 'teams' && (
            <Teams
              teams={teams}
              username={auth.username}
              hasEmail={!!auth.email}
              onChange={refreshTeams}
              onBack={() => setScreen('landing')}
              onOpenTeam={(id) => {
                setActiveTeamId(id)
                setScreen('team-detail')
              }}
              pendingInvites={teamInvites}
              onInvitesChange={() => {
                refreshInvites()
                refreshTeams()
              }}
              onOpenLinkEmail={() => navigate('/settings?view=link-email')}
            />
          )}
          {screen === 'team-detail' && activeTeam && (
            <TeamDetail
              team={activeTeam}
              currentUserId={auth.userId}
              onChange={refreshTeams}
              onBack={() => {
                setActiveTeamId(null)
                setScreen('teams')
              }}
            />
          )}
        </div>
      </div>

      {showBottomNav && (
        <BottomNav
          activeTab={
            screen === 'landing'
              ? 'home'
              : screen === 'groups' || screen === 'feed'
              ? 'groups'
              : screen === 'teams' || screen === 'team-detail'
              ? 'teams'
              : undefined
          }
          onHome={() => setScreen('landing')}
          onGroups={() => setScreen('groups')}
          onTeams={() => setScreen('teams')}
          /* onSettings omitted on purpose — BottomNav falls back to a
             Link to /settings (the new full-page Settings route). */
        />
      )}

      <LanguageSheet
        open={langOpen}
        current={currentLang.code}
        onClose={() => setLangOpen(false)}
        onSelect={onSelectLang}
      />
      <MilestoneOverlay
        milestone={milestone}
        streak={streak}
        groupName={groups[0]?.name}
        onContinue={onMilestoneContinue}
      />
      {cookieChoice === null && (
        <CookieBanner
          onAccept={() => {
            storage.setCookieChoice('accepted')
            setCookieChoice('accepted')
            loadAnalytics()
          }}
          onReject={() => {
            storage.setCookieChoice('rejected')
            setCookieChoice('rejected')
          }}
        />
      )}
    </>
  )
}

function RedirectToLanding({ go }: { go: () => void }) {
  useEffect(() => {
    go()
  }, [go])
  return null
}
