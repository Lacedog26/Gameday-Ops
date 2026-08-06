import { useCallback, useEffect, useState } from 'react'
import {
  approveGroupMember,
  getGroupFeed,
  getGroupLeaderboard,
  getGroupPendingMembers,
  getGroupStats,
  leaveGroup,
  removeGroupMember,
  toggleReaction,
  buildJoinUrl,
  type FeedItem,
  type GroupInfo,
  type GroupMemberInfo,
  type GroupStats,
  type PendingGroupMember,
} from '../lib/groups'
import { InviteByEmail } from './InviteByEmail'
import { GroupTierUpgrade } from './GroupTierUpgrade'
import { useGroupRealtime } from '../hooks/useRealtime'

type Props = {
  group: GroupInfo
  currentUserId: string | null
  onChange: () => void
  onBack: () => void
}

export function GroupFeed({ group, currentUserId, onChange, onBack }: Props) {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [members, setMembers] = useState<GroupMemberInfo[]>([])
  const [stats, setStats] = useState<GroupStats | null>(null)
  const [pendingMembers, setPendingMembers] = useState<PendingGroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tierOpen, setTierOpen] = useState(false)
  const isAdmin = group.my_role === 'admin'

  const refresh = useCallback(async () => {
    const [f, m, s, p] = await Promise.all([
      getGroupFeed(group.id),
      getGroupLeaderboard(group.id),
      getGroupStats(group.id),
      isAdmin ? getGroupPendingMembers(group.id) : Promise.resolve([]),
    ])
    setFeed(f)
    setMembers(m)
    setStats(s)
    setPendingMembers(p)
    setLoading(false)
  }, [group.id, isAdmin])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  // Live updates: members join/leave, compliments come in, reactions toggle.
  // If THIS user is removed, bounce them back to the groups list.
  useGroupRealtime(group.id, currentUserId, refresh, () => {
    onChange()
    onBack()
  })

  const onLeave = async () => {
    if (!confirm(`Leave "${group.name}"?`)) return
    await leaveGroup(group.id)
    onChange()
    onBack()
  }

  const copyInvite = () => {
    navigator.clipboard?.writeText(buildJoinUrl(group.invite_code)).catch(() => {})
    alert(`✓ Invite link copied!\n\n${buildJoinUrl(group.invite_code)}`)
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <div
            className="font-mono"
            style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '.1em' }}
          >
            GROUP · {group.invite_code}
          </div>
          <div className="font-bold" style={{ fontSize: 20, color: 'var(--text)' }}>
            {group.name}
          </div>
        </div>
        <button onClick={onBack} className="oc-btn-back">← Groups</button>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <FeedStat value={stats?.combined_streak ?? 0} label="combined streak" />
        <FeedStat value={stats?.member_count ?? group.member_count} label="members" />
        <FeedStat value={stats?.today_completions ?? 0} label="today" />
      </div>

      <div className="oc-label-dim">LEADERBOARD</div>
      <GroupLeaderboard members={members} currentUserId={currentUserId} />

      <div className="flex flex-col gap-2">
        <button
          onClick={copyInvite}
          className="oc-btn-ghost"
          style={{ width: '100%' }}
        >
          📋 Copy invite link · {group.invite_code}
        </button>
        {isAdmin && (
          <button
            onClick={() => setInviteOpen((v) => !v)}
            className="oc-btn-ghost"
            style={{ width: '100%' }}
          >
            {inviteOpen ? '× Close invite panel' : '✉️ Invite by email'}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setTierOpen((v) => !v)}
            className="oc-btn-ghost"
            style={{ width: '100%' }}
          >
            {tierOpen ? '× Close subscription' : '✦ Subscription & upgrades'}
          </button>
        )}
      </div>
      {isAdmin && inviteOpen && (
        <InviteByEmail
          entityType="group"
          entityId={group.id}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {isAdmin && tierOpen && (
        <GroupTierUpgrade
          group={group}
          onClose={() => setTierOpen(false)}
          onReturn={() => {
            onChange()
            refresh()
          }}
        />
      )}

      {isAdmin && pendingMembers.length > 0 && (
        <PendingMembersPanel
          members={pendingMembers}
          onApprove={async (userId) => {
            await approveGroupMember(group.id, userId)
            refresh()
          }}
          onRemove={async (userId) => {
            await removeGroupMember(group.id, userId)
            refresh()
          }}
        />
      )}

      <div className="oc-label-dim">RECENT COMPLIMENTS</div>
      {loading ? (
        <div
          className="text-center"
          style={{ padding: '20px 0', color: 'var(--faint)', fontSize: 14 }}
        >
          Loading…
        </div>
      ) : feed.length === 0 ? (
        <div
          className="text-center"
          style={{ padding: '24px 0', color: 'var(--faint)', fontSize: 14 }}
        >
          No compliments yet. Be the first! 🌻
        </div>
      ) : (
        feed.map((f) => (
          <FeedRow key={f.id} item={f} currentUserId={currentUserId} onChange={refresh} />
        ))
      )}

      <button
        onClick={onLeave}
        style={{
          background: 'none',
          border: '1px solid rgba(255,80,80,.18)',
          borderRadius: 12,
          padding: 12,
          fontSize: 13,
          color: 'rgba(255,100,100,.55)',
          fontFamily: 'var(--font-serif)',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Leave Group
      </button>
    </>
  )
}

function GroupLeaderboard({
  members,
  currentUserId,
}: {
  members: GroupMemberInfo[]
  currentUserId: string | null
}) {
  // Sort defensively even though the server-side RPC already returns
  // members ranked by current_streak desc.
  const ranked = [...members].sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))

  const rankLabel = (idx: number, streak: number) => {
    if (streak <= 0) return `#${idx + 1}`
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    return `#${idx + 1}`
  }

  return (
    <div className="flex flex-col gap-2">
      {ranked.map((m, idx) => {
        const streak = m.streak ?? 0
        const isTop = idx < 3 && streak > 0
        return (
          <div
            key={m.user_id}
            className="flex items-center gap-3"
            style={{
              background: isTop ? 'rgba(245,200,66,.06)' : 'var(--surf)',
              border: `1px solid ${isTop ? 'rgba(245,200,66,.30)' : 'var(--bord)'}`,
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                width: 32,
                textAlign: 'center',
                fontSize: isTop ? 18 : 14,
                fontWeight: 700,
                color: isTop ? 'var(--color-gold)' : 'var(--faint)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {rankLabel(idx, streak)}
            </div>
            <div
              className="font-bold flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: m.color,
                fontSize: 14,
                color: '#0D0D0D',
                flexShrink: 0,
              }}
            >
              {(m.display_name || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.user_id === currentUserId ? 'You' : m.display_name || 'member'}
                </span>
                {m.role === 'admin' && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: '.1em',
                      color: 'var(--color-gold)',
                      background: 'rgba(245,200,66,.12)',
                      borderRadius: 4,
                      padding: '2px 6px',
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>
                {streak} day streak · Best: {m.best_streak}d ·{' '}
                {m.bloomed_today ? '🌻 Bloomed' : '☀️ Not yet'}
              </div>
            </div>
            <div style={{ fontSize: 18 }}>{m.bloomed_today ? '🌻' : '☀️'}</div>
          </div>
        )
      })}
    </div>
  )
}

function FeedStat({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="text-center"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 10px',
      }}
    >
      <div
        className="font-bold font-mono"
        style={{ fontSize: 22, color: 'var(--color-gold)' }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 5 }}>{label}</div>
    </div>
  )
}

function FeedRow({
  item,
  currentUserId,
  onChange,
}: {
  item: FeedItem
  currentUserId: string | null
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const reactions = item.reactions ?? []
  const myHearted = reactions.some((r) => r.user_id === currentUserId && r.emoji === '❤️')
  const heartCount = reactions.filter((r) => r.emoji === '❤️').length

  const heart = async () => {
    if (busy) return
    setBusy(true)
    await toggleReaction(item.id, '❤️')
    setBusy(false)
    onChange()
  }

  return (
    <div
      className="flex flex-col gap-2"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 10,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="font-bold"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: item.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: '#0D0D0D',
          }}
        >
          {(item.display_name || '?').charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {item.display_name}
        </span>
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>
          lifted {item.recipient_name}
        </span>
        <span style={{ marginLeft: 'auto' }}>🌻</span>
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--dim)',
          fontStyle: 'italic',
          lineHeight: 1.6,
          paddingLeft: 12,
          borderLeft: '2px solid rgba(245,200,66,.3)',
        }}
      >
        "{item.body}"
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={heart}
          disabled={busy}
          style={{
            background: myHearted ? 'rgba(255,107,107,.12)' : 'none',
            border: `1px solid ${myHearted ? 'rgba(255,107,107,.3)' : 'var(--bord)'}`,
            borderRadius: 99,
            padding: '4px 12px',
            fontSize: 12,
            color: myHearted ? '#FF6B6B' : 'var(--faint)',
            fontFamily: 'var(--font-serif)',
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {myHearted ? '❤️' : '🤍'} {heartCount > 0 ? heartCount : ''}
        </button>
        <span className="font-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function PendingMembersPanel({
  members,
  onApprove,
  onRemove,
}: {
  members: PendingGroupMember[]
  onApprove: (userId: string) => Promise<void>
  onRemove: (userId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const wrap = async (id: string, fn: () => Promise<void>) => {
    setBusy(id)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }
  return (
    <div
      className="flex flex-col gap-2.5"
      style={{
        background: 'rgba(245,200,66,.07)',
        border: '1px solid rgba(245,200,66,.22)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div className="oc-label">PENDING REQUESTS · {members.length}</div>
      {members.map((m) => (
        <div
          key={m.user_id}
          className="flex items-center gap-2.5"
          style={{
            background: 'var(--surf)',
            border: '1px solid var(--bord)',
            borderRadius: 12,
            padding: '10px 12px',
          }}
        >
          <div
            className="font-bold flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: m.color,
              fontSize: 13,
              color: '#0D0D0D',
              flexShrink: 0,
            }}
          >
            {(m.display_name || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {m.display_name || '(unnamed)'}
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}
            >
              joined {new Date(m.joined_at).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={() => wrap(m.user_id, () => onRemove(m.user_id))}
            disabled={busy === m.user_id}
            style={{
              background: 'none',
              border: '1px solid rgba(255,80,80,.2)',
              borderRadius: 10,
              padding: '6px 10px',
              fontSize: 12,
              color: 'rgba(255,100,100,.7)',
              fontFamily: 'var(--font-serif)',
              cursor: 'pointer',
            }}
          >
            Deny
          </button>
          <button
            onClick={() => wrap(m.user_id, () => onApprove(m.user_id))}
            disabled={busy === m.user_id}
            style={{
              background: 'var(--color-green)',
              color: '#0C0C0C',
              border: 'none',
              borderRadius: 10,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              cursor: 'pointer',
            }}
          >
            {busy === m.user_id ? '…' : 'Approve'}
          </button>
        </div>
      ))}
    </div>
  )
}
