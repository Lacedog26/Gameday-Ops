import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { useAuth } from '../hooks/useAuth'
import { joinGroup } from '../lib/groups'
import { joinTeam } from '../lib/teams'

/**
 * Handles email-invite deep-links of the form
 *   https://onecompliment.app/join/team/<code>
 *   https://onecompliment.app/join/group/<code>
 * Mobile sends links in this exact shape from
 * supabase/functions/send-invitation-email and
 * lib/invitations.ts buildMailto. Without this route, web users who
 * tap an email invite hit a 404.
 *
 * Flow:
 *   1. Mount: ensure session via useAuth (anonymous OK).
 *   2. Confirm the user's @username is what members will see; if they
 *      haven't claimed one yet, route them to Settings first.
 *   3. Call the matching join_* RPC with that username.
 *   4. Bounce into the in-app screen list on success.
 */
export default function Join() {
  const { type, code: rawCode } = useParams<{ type: string; code: string }>()
  const navigate = useNavigate()
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneName, setDoneName] = useState<string | null>(null)

  const code = (rawCode ?? '').toUpperCase().trim()
  const entityType = type === 'group' ? 'group' : 'team'

  if (!code) {
    return (
      <Shell>
        <ErrorPanel message="That invite link doesn't include a code." />
        <BackHome />
      </Shell>
    )
  }

  const submit = async () => {
    if (!auth.username) {
      setError('Pick a username first in Settings.')
      return
    }
    if (!auth.email) {
      // Memberships are tied to the user's account, so an anonymous
      // session would orphan the membership row the next time their
      // browser cookies clear. Force email-link before accepting,
      // mirroring the create_group / create_team gate.
      setError('Link an email first in Settings — your membership has to follow you to other devices.')
      return
    }
    setError(null)
    setBusy(true)
    if (entityType === 'group') {
      const result = await joinGroup(code, auth.username)
      setBusy(false)
      if (result.error) return setError(result.error)
      setDoneName(result.group_name ?? 'the group')
      // Drop them on the Groups list — invitations also auto-clear there.
      setTimeout(() => navigate('/?go=groups', { replace: true }), 800)
    } else {
      const result = await joinTeam(code, auth.username)
      setBusy(false)
      if ('error' in result) return setError(result.error)
      setDoneName(result.team_name ?? 'the team')
      setTimeout(() => navigate('/?go=teams', { replace: true }), 800)
    }
  }

  return (
    <Shell>
      {doneName ? (
        <SuccessPanel name={doneName} entityType={entityType} />
      ) : (
        <div
          className="flex flex-col gap-4"
          style={{
            background: 'var(--surf)',
            border: '1px solid var(--bord)',
            borderRadius: 16,
            padding: 22,
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 32 }}>{entityType === 'team' ? '🏢' : '👥'}</span>
            <div>
              <div className="oc-label">{entityType === 'team' ? "TEAM INVITE" : 'GROUP INVITE'}</div>
              <div
                className="font-bold"
                style={{ fontSize: 18, color: 'var(--text)', marginTop: 4 }}
              >
                Invite code · {code}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.6 }}>
            You were invited to join a {entityType} on OneC🌻mpliment.
          </div>

          {auth.username ? (
            <div
              style={{
                fontSize: 13,
                color: 'var(--dim)',
                background: 'rgba(245,200,66,.07)',
                border: '1px solid rgba(245,200,66,.18)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              You'll appear as{' '}
              <strong style={{ color: 'var(--color-gold)' }}>@{auth.username}</strong>
            </div>
          ) : (
            <div
              className="flex flex-col gap-2"
              style={{
                fontSize: 13,
                color: 'var(--dim)',
                background: 'rgba(255,107,107,.07)',
                border: '1px solid rgba(255,107,107,.20)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <span>Pick a username first — that's what members will see.</span>
              <Link
                to="/settings?view=edit-profile"
                className="oc-btn"
                style={{ alignSelf: 'flex-start', width: 'auto', textDecoration: 'none' }}
              >
                Pick username
              </Link>
            </div>
          )}

          {/* Email gate — accepting an invitation requires a linked
              email so the membership survives session loss. Pre-emptive
              banner so the user can fix it before tapping Accept. */}
          {auth.username && !auth.email && (
            <div
              className="flex flex-col gap-2"
              style={{
                fontSize: 13,
                color: 'var(--dim)',
                background: 'rgba(245,200,66,.07)',
                border: '1px solid rgba(245,200,66,.30)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <span>
                <strong style={{ color: 'var(--text)', fontWeight: 700 }}>Link an email first.</strong>{' '}
                Your {entityType} membership has to follow you between devices and survive cleared
                cookies.
              </span>
              <Link
                to="/settings?view=link-email"
                className="oc-btn"
                style={{ alignSelf: 'flex-start', width: 'auto', textDecoration: 'none' }}
              >
                ✉️ Link email
              </Link>
            </div>
          )}

          {error && (
            <div
              style={{
                fontSize: 13,
                color: '#FF6B6B',
                background: 'rgba(255,107,107,.08)',
                border: '1px solid rgba(255,107,107,.2)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              {error}
            </div>
          )}

          <button onClick={submit} disabled={busy} className="oc-btn">
            {busy ? 'Joining…' : `Join the ${entityType} ☀️`}
          </button>
          <Link
            to="/"
            style={{
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--faint)',
              textDecoration: 'none',
            }}
          >
            Not now
          </Link>
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav
        className="flex justify-between items-center"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(12,12,12,0.97)',
          borderBottom: '1px solid var(--bord)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '14px 24px',
        }}
      >
        <Brand size={13} />
        <Link
          to="/"
          style={{
            color: 'var(--faint)',
            fontSize: 13,
            textDecoration: 'none',
            border: '1px solid var(--bord)',
            borderRadius: 20,
            padding: '7px 14px',
          }}
        >
          ← Skip to app
        </Link>
      </nav>
      <main className="oc-wrap" style={{ paddingTop: 32, paddingBottom: 80 }}>
        {children}
      </main>
    </>
  )
}

function SuccessPanel({ name, entityType }: { name: string; entityType: 'team' | 'group' }) {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{
        gap: 14,
        background: 'rgba(168,230,207,.07)',
        border: '1px solid rgba(168,230,207,.30)',
        borderRadius: 16,
        padding: 28,
      }}
    >
      <div style={{ fontSize: 48 }}>🌻</div>
      <div className="font-bold" style={{ fontSize: 20, color: 'var(--text)' }}>
        Welcome to {name}
      </div>
      <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.6 }}>
        Heading to your {entityType === 'team' ? 'teams' : 'groups'} now…
      </div>
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,107,107,.08)',
        border: '1px solid rgba(255,107,107,.20)',
        borderRadius: 14,
        padding: 18,
        color: '#FF6B6B',
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      {message}
    </div>
  )
}

function BackHome() {
  return (
    <Link
      to="/"
      className="oc-btn-ghost"
      style={{
        textDecoration: 'none',
        textAlign: 'center',
        marginTop: 12,
      }}
    >
      Back to app
    </Link>
  )
}
