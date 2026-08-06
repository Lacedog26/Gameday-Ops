import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createGroup, joinGroup, leaveGroup, buildJoinUrl, type GroupInfo } from '../lib/groups'
import { PendingInvitations } from './PendingInvitations'
import type { Invitation } from '../lib/invitations'

type Props = {
  groups: GroupInfo[]
  username: string | null
  /** Whether the user has a linked email — the server-side `create_group`
   *  RPC raises if not, so we surface that requirement up-front. */
  hasEmail: boolean
  onChange: () => void
  onBack: () => void
  onOpenGroup: (groupId: string) => void
  pendingInvites: Invitation[]
  onInvitesChange: () => void
  /** Opens the Settings sheet on the Link Email view — used when
   *  create_group rejects because the user is anonymous. */
  onOpenLinkEmail: () => void
}

type Mode = 'list' | 'create' | 'join'

export function Groups({
  groups,
  username,
  hasEmail,
  onChange,
  onBack,
  onOpenGroup,
  pendingInvites,
  onInvitesChange,
  onOpenLinkEmail,
}: Props) {
  const [mode, setMode] = useState<Mode>('list')
  const [busy, setBusy] = useState(false)

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="font-bold" style={{ fontSize: 20, color: 'var(--text)' }}>
          👥 My Groups
        </div>
        <button onClick={onBack} className="oc-btn-back">← Back</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Tag>🔒 Invite-only</Tag>
        <Tag>☁️ Synced across devices</Tag>
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

      {mode === 'list' && (
        <>
          {groups.length === 0 ? (
            <Empty />
          ) : (
            groups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                onOpen={() => onOpenGroup(g.id)}
                onLeave={async () => {
                  if (!confirm(`Leave "${g.name}"?`)) return
                  setBusy(true)
                  await leaveGroup(g.id)
                  setBusy(false)
                  onChange()
                }}
              />
            ))
          )}
          <div className="flex flex-col gap-2.5">
            {/* Create routes to the unified pricing screen (tier → name → pay). */}
            <Link to="/create" className="oc-btn" style={{ textAlign: 'center', textDecoration: 'none' }}>
              + Create a Group
            </Link>
            <button onClick={() => setMode('join')} className="oc-btn-ghost" disabled={busy}>
              Join with invite code
            </button>
          </div>
        </>
      )}

      {mode === 'create' && (
        <CreateForm
          username={username}
          hasEmail={hasEmail}
          onCancel={() => setMode('list')}
          onCreated={() => {
            setMode('list')
            onChange()
          }}
          onOpenLinkEmail={onOpenLinkEmail}
        />
      )}
      {mode === 'join' && (
        <JoinForm
          username={username}
          onCancel={() => setMode('list')}
          onJoined={() => {
            setMode('list')
            onChange()
          }}
        />
      )}
    </>
  )
}

function Empty() {
  return (
    <div
      className="text-center"
      style={{ padding: '32px 0', color: 'var(--faint)', fontSize: 14 }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
      <div className="font-bold" style={{ fontSize: 15, color: 'var(--dim)', marginBottom: 8 }}>
        No groups yet
      </div>
      Create a group and invite friends, or join one with a code.
    </div>
  )
}

function GroupCard({
  group,
  onOpen,
  onLeave,
}: {
  group: GroupInfo
  onOpen: () => void
  onLeave: () => void
}) {
  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(buildJoinUrl(group.invite_code)).catch(() => {})
    alert(`✓ Invite link copied!\n\nShare this with anyone:\n${buildJoinUrl(group.invite_code)}`)
  }

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
        <div>
          <div className="font-bold" style={{ fontSize: 15, color: 'var(--text)' }}>
            {group.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
            {group.my_role === 'admin' && ' · admin'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            className="font-mono"
            style={{ fontSize: 11, color: 'var(--color-gold)', letterSpacing: '.1em' }}
          >
            {group.invite_code}
          </div>
          <div style={{ fontSize: 9, color: 'var(--faint)', letterSpacing: '.1em' }}>
            INVITE
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          style={{
            flex: 1,
            background: 'none',
            border: '1px solid var(--bord)',
            borderRadius: 10,
            padding: 8,
            fontSize: 12,
            color: 'var(--dim)',
            fontFamily: 'var(--font-serif)',
            cursor: 'pointer',
          }}
        >
          📋 Copy invite link
        </button>
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
          }}
        >
          🚪
        </button>
      </div>
    </div>
  )
}

function CreateForm({
  username,
  hasEmail,
  onCancel,
  onCreated,
  onOpenLinkEmail,
}: {
  username: string | null
  hasEmail: boolean
  onCancel: () => void
  onCreated: () => void
  onOpenLinkEmail: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  // Inline error block — kept inside the form so the user can fix the
  // problem without losing whatever they've typed.
  const [error, setError] = useState<{ message: string; needsEmail?: boolean; needsPro?: boolean } | null>(null)

  const submit = async () => {
    if (!name.trim()) {
      setError({ message: 'Please enter a group name.' })
      return
    }
    if (!username) {
      setError({ message: 'Pick a username first in Settings.' })
      return
    }
    setError(null)
    setBusy(true)
    // The RPC still accepts a per-group display name, but we now
    // mirror the user's account-level username into it so members
    // see one consistent identity everywhere.
    const result = await createGroup(name.trim(), username)
    setBusy(false)
    if (!result.ok) {
      setError({
        message: result.error.message,
        needsEmail: result.error.kind === 'email_required',
        needsPro: result.error.kind === 'group_limit',
      })
      return
    }
    const link = buildJoinUrl(result.invite_code)
    navigator.clipboard?.writeText(link).catch(() => {})
    alert(`✅ Group "${name.trim()}" created!\n\nInvite link copied to your clipboard:\n${link}`)
    onCreated()
  }

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div className="font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>
        Create a Group
      </div>

      {/* Pre-emptive nudge: server requires an email-linked account.
          Showing this BEFORE the user submits skips the round-trip. */}
      {!hasEmail && (
        <div
          className="flex flex-col gap-2"
          style={{
            background: 'rgba(245,200,66,.07)',
            border: '1px solid rgba(245,200,66,.30)',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
            <strong style={{ fontWeight: 700 }}>Link an email first.</strong> Groups are tied to your account so they survive cleared cookies and follow you to mobile.
          </div>
          <button
            onClick={onOpenLinkEmail}
            className="oc-btn"
            style={{ alignSelf: 'flex-start', width: 'auto' }}
          >
            ✉️ Link email
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="oc-label-dim">GROUP NAME</div>
        <input
          className="oc-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning Crew, Family, Work Squad..."
          maxLength={40}
          autoFocus
        />
      </div>
      {username && (
        <div className="oc-label-dim" style={{ fontSize: 12 }}>
          You'll appear as <strong style={{ color: 'var(--color-gold)' }}>@{username}</strong>
        </div>
      )}
      {error && (
        <div
          className="flex flex-col gap-2"
          style={{
            fontSize: 13,
            color: '#FF6B6B',
            background: 'rgba(255,107,107,.08)',
            border: '1px solid rgba(255,107,107,.2)',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <span>{error.message}</span>
          {error.needsEmail && (
            <button
              onClick={onOpenLinkEmail}
              className="oc-btn"
              style={{ alignSelf: 'flex-start', width: 'auto' }}
            >
              ✉️ Link email now
            </button>
          )}
          {error.needsPro && (
            <Link
              to="/pro"
              className="oc-btn"
              style={{ alignSelf: 'flex-start', width: 'auto', textDecoration: 'none' }}
            >
              ✦ Upgrade to Pro
            </Link>
          )}
        </div>
      )}
      <div className="flex gap-2.5">
        <button onClick={onCancel} className="oc-btn-ghost" style={{ flex: 1 }} disabled={busy}>
          Cancel
        </button>
        <button onClick={submit} className="oc-btn" style={{ flex: 2 }} disabled={busy}>
          {busy ? 'Creating…' : 'Create Group ✦'}
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
    if (!code.trim()) {
      setError('Enter the invite code.')
      return
    }
    if (!username) {
      setError('Pick a username first in Settings.')
      return
    }
    setError(null)
    setBusy(true)
    const result = await joinGroup(code.trim(), username)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    alert(`✅ Joined "${result.group_name}"!`)
    onJoined()
  }

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div className="font-bold" style={{ fontSize: 16, color: 'var(--text)' }}>
        Join a Group
      </div>
      <div className="flex flex-col gap-2">
        <div className="oc-label-dim">INVITE CODE</div>
        <input
          className="oc-input font-mono"
          style={{ letterSpacing: '.2em', textTransform: 'uppercase' }}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD1234"
          maxLength={12}
          autoFocus
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
      <div className="flex gap-2.5">
        <button onClick={onCancel} className="oc-btn-ghost" style={{ flex: 1 }} disabled={busy}>
          Cancel
        </button>
        <button onClick={submit} className="oc-btn" style={{ flex: 2 }} disabled={busy}>
          {busy ? 'Joining…' : 'Join Group ☀️'}
        </button>
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono"
      style={{
        fontSize: 10,
        color: '#A8E6CF',
        background: 'rgba(168,230,207,.1)',
        border: '1px solid rgba(168,230,207,.2)',
        borderRadius: 20,
        padding: '3px 10px',
      }}
    >
      {children}
    </span>
  )
}
