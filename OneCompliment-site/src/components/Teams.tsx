import { useState } from 'react'
import { Link } from 'react-router-dom'
import { joinTeam, leaveTeam, TEAM_TYPE_META, type Team } from '../lib/teams'
import { CreateTeam } from './CreateTeam'
import { PendingInvitations } from './PendingInvitations'
import type { Invitation } from '../lib/invitations'

type Props = {
  teams: Team[]
  username: string | null
  /** Whether the viewer has a linked email — required to accept
   *  invitations (memberships need a stable identity) and matches
   *  the Groups gate. */
  hasEmail: boolean
  onChange: () => void
  onBack: () => void
  onOpenTeam: (teamId: string) => void
  /** Pending team invitations, filtered by Home from the global pool. */
  pendingInvites: Invitation[]
  /** Reload invitations after accept / decline. */
  onInvitesChange: () => void
  /** Opens the Settings link-email view when the viewer needs to link
   *  before accepting an invite. */
  onOpenLinkEmail: () => void
}

type Mode = 'list' | 'create' | 'join'

export function Teams({
  teams,
  username,
  hasEmail,
  onChange,
  onBack,
  onOpenTeam,
  pendingInvites,
  onInvitesChange,
  onOpenLinkEmail,
}: Props) {
  const [mode, setMode] = useState<Mode>('list')

  if (mode === 'create') {
    return (
      <CreateTeam
        username={username}
        onCancel={() => setMode('list')}
        onCreated={() => {
          setMode('list')
          onChange()
        }}
      />
    )
  }

  if (mode === 'join') {
    return (
      <JoinForm
        username={username}
        onCancel={() => setMode('list')}
        onJoined={() => {
          setMode('list')
          onChange()
        }}
      />
    )
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="font-bold" style={{ fontSize: 20, color: 'var(--text)' }}>
          🏢 Teams
        </div>
        <button onClick={onBack} className="oc-btn-back">← Back</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.65 }}>
        Run OneC🌻mpliment as a daily challenge with your school, company, or group.
      </div>

      <PendingInvitations
        invitations={pendingInvites}
        username={username}
        hasEmail={hasEmail}
        onOpenLinkEmail={onOpenLinkEmail}
        onChange={() => {
          onInvitesChange()
          onChange()
        }}
      />

      {teams.length === 0 ? (
        <Empty />
      ) : (
        teams.map((t) => (
          <TeamCard
            key={t.id}
            team={t}
            onOpen={() => onOpenTeam(t.id)}
            onLeave={async () => {
              if (!confirm(`Leave "${t.name}"?`)) return
              await leaveTeam(t.id)
              onChange()
            }}
          />
        ))
      )}

      <div className="flex flex-col gap-2.5">
        {/* Create routes to the unified pricing screen (tier → name → pay). */}
        <Link to="/create" className="oc-btn" style={{ textAlign: 'center', textDecoration: 'none' }}>
          + Create a Team
        </Link>
        <button onClick={() => setMode('join')} className="oc-btn-ghost">
          Join with invite code
        </button>
      </div>

      <div
        className="text-center"
        style={{
          background: 'rgba(168,230,207,.07)',
          border: '1px solid rgba(168,230,207,.2)',
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            color: 'var(--faint)',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
          }}
        >
          For Schools &amp; Organizations
        </div>
        <div
          className="font-bold"
          style={{ fontSize: 14, color: 'var(--text)', marginTop: 6 }}
        >
          Need a tier upgrade or sales help?
        </div>
        <Link
          to="/business"
          style={{
            display: 'inline-block',
            marginTop: 10,
            background: '#A8E6CF',
            color: '#0C0C0C',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Talk to us →
        </Link>
      </div>
    </>
  )
}

function Empty() {
  return (
    <div
      className="text-center"
      style={{ padding: '32px 0', color: 'var(--faint)', fontSize: 14 }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
      <div className="font-bold" style={{ fontSize: 15, color: 'var(--dim)', marginBottom: 8 }}>
        No teams yet
      </div>
      Create one for your school, company, or community — or join an existing one with a code.
    </div>
  )
}

function TeamCard({
  team,
  onOpen,
  onLeave,
}: {
  team: Team
  onOpen: () => void
  onLeave: () => void
}) {
  const meta = TEAM_TYPE_META[team.team_type]
  const pending = team.team_status === 'pending'
  const rejected = team.team_status === 'rejected'

  return (
    <div
      onClick={onOpen}
      className="flex flex-col gap-2.5"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 16,
        padding: '16px 18px',
        marginBottom: 10,
        cursor: 'pointer',
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
          <span style={{ fontSize: 22 }}>{meta.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div
              className="font-bold"
              style={{
                fontSize: 15,
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {team.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
              {team.member_count} member{team.member_count !== 1 ? 's' : ''}
              {team.my_role !== 'member' && ` · ${team.my_role}`}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            className="font-mono"
            style={{ fontSize: 11, color: 'var(--color-gold)', letterSpacing: '.1em' }}
          >
            {team.invite_code}
          </div>
          <div style={{ fontSize: 9, color: 'var(--faint)', letterSpacing: '.1em' }}>
            INVITE
          </div>
        </div>
      </div>
      {(pending || rejected || team.my_status === 'pending') && (
        <div
          style={{
            fontSize: 11,
            color: rejected ? '#FF6B6B' : 'var(--color-gold)',
            background: rejected ? 'rgba(255,107,107,.08)' : 'rgba(245,200,66,.08)',
            border: `1px solid ${
              rejected ? 'rgba(255,107,107,.2)' : 'rgba(245,200,66,.22)'
            }`,
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          {rejected
            ? `Rejected: ${team.team_rejection_reason ?? 'see admin'}`
            : pending
            ? '⏳ Awaiting platform approval'
            : '⏳ Awaiting team admin approval'}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onLeave()
          }}
          style={{
            background: 'none',
            border: '1px solid rgba(255,80,80,.15)',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 12,
            color: 'rgba(255,100,100,.5)',
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          🚪 Leave
        </button>
      </div>
    </div>
  )
}

function JoinForm({
  username,
  onCancel,
  onJoined,
}: {
  username: string | null
  onCancel: () => void
  onJoined: () => void
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!code.trim()) return setError('Enter the invite code.')
    if (!username) return setError('Pick a username first in Settings.')
    setError(null)
    setBusy(true)
    const result = await joinTeam(code.trim(), username)
    setBusy(false)
    if ('error' in result) return setError(result.error)
    alert(`✅ Joined "${result.team_name}"!`)
    onJoined()
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="font-bold" style={{ fontSize: 20, color: 'var(--text)' }}>
          🏢 Join a Team
        </div>
        <button onClick={onCancel} className="oc-btn-back">← Back</button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="oc-label-dim">INVITE CODE</div>
        <input
          autoFocus
          className="oc-input font-mono"
          style={{ letterSpacing: '.2em', textTransform: 'uppercase' }}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD1234"
          maxLength={12}
        />
      </div>
      {username && (
        <div className="oc-label-dim" style={{ fontSize: 12 }}>
          You'll appear as <strong style={{ color: 'var(--color-gold)' }}>@{username}</strong>
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
      <button onClick={submit} className="oc-btn" disabled={busy}>
        {busy ? 'Joining…' : 'Join Team ☀️'}
      </button>
    </>
  )
}
