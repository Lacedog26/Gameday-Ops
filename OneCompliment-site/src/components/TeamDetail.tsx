import { useCallback, useEffect, useState } from 'react'
import {
  approveTeamMember,
  buildTeamJoinUrl,
  getTeamPendingMembers,
  leaveTeam,
  loadTeamDashboard,
  moderateCompletion,
  removeTeamMember,
  TEAM_TYPE_META,
  type PendingTeamMember,
  type Team,
  type TeamCompletion,
  type TeamDashboard,
} from '../lib/teams'
import { InviteByEmail } from './InviteByEmail'
import { TeamSettings } from './TeamSettings'
import { TierUpgrade } from './TierUpgrade'
import { useTeamRealtime } from '../hooks/useRealtime'

type Props = {
  team: Team
  currentUserId: string | null
  onChange: () => void
  onBack: () => void
}

export function TeamDetail({ team, currentUserId, onChange, onBack }: Props) {
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null)
  const [pendingMembers, setPendingMembers] = useState<PendingTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tierOpen, setTierOpen] = useState(false)

  const isModerator = team.my_role === 'admin' || team.my_role === 'moderator'
  const isAdmin = team.my_role === 'admin'

  const refresh = useCallback(async () => {
    setLoading(true)
    const [dash, pending] = await Promise.all([
      loadTeamDashboard(team.id),
      isModerator ? getTeamPendingMembers(team.id) : Promise.resolve([]),
    ])
    setDashboard(dash)
    setPendingMembers(pending)
    setLoading(false)
  }, [team.id, isModerator])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Live: new members, completions, moderation actions, team_streaks bumps.
  // If the current user is removed, bounce back to the teams list.
  useTeamRealtime(team.id, currentUserId, refresh, () => {
    onChange()
    onBack()
  })

  const meta = TEAM_TYPE_META[team.team_type]

  const copyInvite = () => {
    const url = buildTeamJoinUrl(team.invite_code)
    navigator.clipboard?.writeText(url).catch(() => {})
    alert(`✓ Invite link copied!\n\n${url}`)
  }

  const onLeave = async () => {
    if (!confirm(`Leave "${team.name}"?`)) return
    await leaveTeam(team.id)
    onChange()
    onBack()
  }

  const stats = dashboard?.stats
  const members = dashboard?.members ?? []
  const feed = dashboard?.feed ?? []
  const pendingCompletions = dashboard?.pending ?? []

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5" style={{ minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 24 }}>{meta.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div
              className="font-mono"
              style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '.1em' }}
            >
              {meta.label.toUpperCase()} · {team.invite_code}
            </div>
            <div
              className="font-bold"
              style={{
                fontSize: 20,
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {team.name}
            </div>
          </div>
        </div>
        <button onClick={onBack} className="oc-btn-back">← Teams</button>
      </div>

      {team.description && (
        <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.65 }}>{team.description}</div>
      )}

      {team.team_status === 'pending' && (
        <div
          style={{
            background: 'rgba(245,200,66,.08)',
            border: '1px solid rgba(245,200,66,.22)',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 13,
            color: 'var(--dim)',
            lineHeight: 1.6,
          }}
        >
          ⏳ This team is awaiting platform approval. Members can be invited but compliments
          can't post until it's approved.
        </div>
      )}
      {team.team_status === 'rejected' && (
        <div
          style={{
            background: 'rgba(255,107,107,.08)',
            border: '1px solid rgba(255,107,107,.2)',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 13,
            color: '#FF6B6B',
            lineHeight: 1.6,
          }}
        >
          Team rejected: {team.team_rejection_reason ?? 'see admin'}
        </div>
      )}

      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Stat value={stats?.member_count ?? team.member_count} label="members" />
        <Stat value={stats?.today_completions ?? 0} label="today" />
        <Stat value={stats?.completion_rate ?? 0} label="% rate" />
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={copyInvite} className="oc-btn-ghost" style={{ width: '100%' }}>
          📋 Copy invite link · {team.invite_code}
        </button>
        {isModerator && (
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
            onClick={() => setSettingsOpen((v) => !v)}
            className="oc-btn-ghost"
            style={{ width: '100%' }}
          >
            {settingsOpen ? '× Close settings' : '⚙️ Team settings'}
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
      {isModerator && inviteOpen && (
        <InviteByEmail
          entityType="team"
          entityId={team.id}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {isAdmin && settingsOpen && (
        <TeamSettings
          team={team}
          onSaved={() => {
            // Bubble up so Home reloads the team list and the next render
            // of TeamDetail picks up the new fields (name / description /
            // pinned_challenge / require_approval / shared_visibility).
            onChange()
            refresh()
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {isAdmin && tierOpen && (
        <TierUpgrade
          team={team}
          onClose={() => setTierOpen(false)}
          onReturn={() => {
            onChange()
            refresh()
          }}
        />
      )}

      {/* Moderation panels — admin/moderator only.
          Schools fan members and completions through approval gates;
          general/organization teams typically don't but show these
          panels too if `require_approval` is on. The RPCs themselves
          enforce role + setting on the server side. */}
      {isModerator && pendingMembers.length > 0 && (
        <PendingMembersPanel
          members={pendingMembers}
          onApprove={async (userId) => {
            await approveTeamMember(team.id, userId)
            refresh()
          }}
          onRemove={async (userId) => {
            await removeTeamMember(team.id, userId)
            refresh()
          }}
        />
      )}

      {isModerator && pendingCompletions.length > 0 && (
        <PendingCompletionsPanel
          items={pendingCompletions}
          onApprove={async (id) => {
            await moderateCompletion(id, 'approve')
            refresh()
          }}
          onReject={async (id) => {
            const reason = prompt('Reason (optional, shown to the author):') ?? undefined
            await moderateCompletion(id, 'reject', reason)
            refresh()
          }}
        />
      )}

      <div className="oc-label-dim">LEADERBOARD</div>
      {loading ? (
        <SkeletonRow text="Loading leaderboard…" />
      ) : members.length === 0 ? (
        <SkeletonRow text="No members yet." />
      ) : (
        <Leaderboard members={members} currentUserId={currentUserId} />
      )}

      <div className="oc-label-dim">RECENT COMPLIMENTS</div>
      {loading ? (
        <SkeletonRow text="Loading feed…" />
      ) : feed.length === 0 ? (
        <SkeletonRow text="No compliments yet. Submit your daily challenge — it'll fan out here." />
      ) : (
        feed.map((f) => <FeedItem key={f.id} item={f} />)
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
        Leave Team
      </button>
    </>
  )
}

function PendingMembersPanel({
  members,
  onApprove,
  onRemove,
}: {
  members: PendingTeamMember[]
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
      <div className="oc-label">PENDING MEMBERS · {members.length}</div>
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

function PendingCompletionsPanel({
  items,
  onApprove,
  onReject,
}: {
  items: TeamCompletion[]
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
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
        background: 'rgba(168,230,207,.07)',
        border: '1px solid rgba(168,230,207,.22)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '.25em',
          textTransform: 'uppercase',
          color: 'var(--color-green)',
        }}
      >
        AWAITING REVIEW · {items.length}
      </div>
      {items.map((c) => (
        <div
          key={c.id}
          className="flex flex-col gap-2"
          style={{
            background: 'var(--surf)',
            border: '1px solid var(--bord)',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="font-bold flex items-center justify-center"
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: c.color,
                fontSize: 11,
                color: '#0D0D0D',
              }}
            >
              {(c.display_name || '?').charAt(0).toUpperCase()}
            </div>
            <span
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}
            >
              {c.display_name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--faint)' }}>
              → {c.recipient_name}
            </span>
            <span
              className="font-mono"
              style={{
                marginLeft: 'auto',
                fontSize: 10,
                color: 'var(--faint)',
              }}
            >
              {new Date(c.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--dim)',
              fontStyle: 'italic',
              lineHeight: 1.6,
              paddingLeft: 12,
              borderLeft: '2px solid rgba(168,230,207,.4)',
            }}
          >
            "{c.body}"
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => wrap(c.id, () => onReject(c.id))}
              disabled={busy === c.id}
              style={{
                background: 'none',
                border: '1px solid rgba(255,80,80,.2)',
                borderRadius: 10,
                padding: '6px 12px',
                fontSize: 12,
                color: 'rgba(255,100,100,.7)',
                fontFamily: 'var(--font-serif)',
                cursor: 'pointer',
              }}
            >
              Reject
            </button>
            <button
              onClick={() => wrap(c.id, () => onApprove(c.id))}
              disabled={busy === c.id}
              style={{
                background: 'var(--color-gold)',
                color: '#0C0C0C',
                border: 'none',
                borderRadius: 10,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-serif)',
                cursor: 'pointer',
              }}
            >
              {busy === c.id ? '…' : 'Approve 🌻'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Leaderboard({
  members,
  currentUserId,
}: {
  members: TeamDashboard['members']
  currentUserId: string | null
}) {
  // Sort by current streak descending. Members with no streak still appear at
  // the bottom so this also serves as a member directory (matches mobile).
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
                {m.role === 'moderator' && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: '.1em',
                      color: '#C3B1E1',
                      background: 'rgba(195,177,225,.12)',
                      borderRadius: 4,
                      padding: '2px 6px',
                    }}
                  >
                    MOD
                  </span>
                )}
                {m.muted && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: '.1em',
                      color: 'rgba(255,100,100,.7)',
                      background: 'rgba(255,100,100,.10)',
                      borderRadius: 4,
                      padding: '2px 6px',
                    }}
                  >
                    MUTED
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>
                {streak} day streak · {m.bloomed_today ? '🌻 Bloomed' : '☀️ Not yet'}
              </div>
            </div>
            <div style={{ fontSize: 18 }}>{m.bloomed_today ? '🌻' : '☀️'}</div>
          </div>
        )
      })}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
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

function SkeletonRow({ text }: { text: string }) {
  return (
    <div
      className="text-center"
      style={{ padding: '20px 0', color: 'var(--faint)', fontSize: 13 }}
    >
      {text}
    </div>
  )
}

function FeedItem({
  item,
}: {
  item: TeamDashboard['feed'][number]
}) {
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
          className="font-bold flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: item.color,
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
        {item.status === 'pending' && (
          <span
            className="font-mono"
            style={{
              marginLeft: 'auto',
              fontSize: 9,
              color: 'var(--color-gold)',
              background: 'rgba(245,200,66,.12)',
              borderRadius: 6,
              padding: '2px 6px',
            }}
          >
            PENDING
          </span>
        )}
        {item.status === 'approved' && <span style={{ marginLeft: 'auto' }}>🌻</span>}
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
      <div
        className="font-mono"
        style={{ fontSize: 10, color: 'var(--faint)' }}
      >
        {new Date(item.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  )
}
