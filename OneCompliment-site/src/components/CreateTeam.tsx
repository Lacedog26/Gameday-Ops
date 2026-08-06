import { useState } from 'react'
import { createTeam, TEAM_TYPE_META, type TeamType } from '../lib/teams'

type Props = {
  username: string | null
  onCancel: () => void
  onCreated: () => void
}

const TYPES: TeamType[] = ['general', 'organization', 'school']

/**
 * Two-step Create Team flow ported from the mobile CreateTeamScreen.
 * Step 1: pick a team type. Step 2: name + description → create. The
 * user's @username is what teammates will see — there is no separate
 * per-team display name.
 *
 * The school path on mobile shows an extra "How it works" wizard before
 * step 2; we condense that into the description hint to keep this MVP tight.
 * Server-side, the `school` team_type still triggers approval moderation.
 */
export function CreateTeam({ username, onCancel, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [teamType, setTeamType] = useState<TeamType>('general')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!name.trim()) return setError('Pick a team name.')
    if (!username) return setError('Pick a username first in Settings.')
    setError(null)
    setBusy(true)
    const result = await createTeam({
      name: name.trim(),
      teamType,
      displayName: username,
      description: description.trim() || undefined,
    })
    setBusy(false)
    if ('error' in result) return setError(result.error)
    alert(
      teamType === 'school'
        ? '⏳ Team submitted for review.\n\nSchool teams require platform approval before you can invite students.'
        : `✅ Team "${name.trim()}" created!\n\nInvite code: ${result.invite_code}`,
    )
    onCreated()
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <button
          onClick={() => (step === 1 ? onCancel() : setStep(1))}
          className="oc-btn-back"
        >
          {step === 1 ? '← Back' : '← Change type'}
        </button>
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: 'var(--faint)',
          }}
        >
          Step {step} / 2
        </div>
      </div>
      <div className="font-bold" style={{ fontSize: 22, lineHeight: 1.2 }}>
        Create a Team
      </div>

      {step === 1 && (
        <>
          <div className="oc-label">CHOOSE TEAM TYPE</div>
          {TYPES.map((t) => {
            const meta = TEAM_TYPE_META[t]
            const active = teamType === t
            return (
              <div
                key={t}
                onClick={() => setTeamType(t)}
                className="flex flex-col gap-1.5"
                style={{
                  background: active ? 'rgba(245,200,66,.08)' : 'var(--surf)',
                  border: `1px solid ${active ? 'rgba(245,200,66,.35)' : 'var(--bord)'}`,
                  borderRadius: 14,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  marginBottom: 8,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span style={{ fontSize: 22 }}>{meta.icon}</span>
                  <span
                    className="font-bold"
                    style={{
                      fontSize: 15,
                      color: active ? 'var(--color-gold)' : 'var(--text)',
                    }}
                  >
                    {meta.label}
                  </span>
                  {active && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        color: 'var(--color-gold)',
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>
                  {meta.desc}
                </div>
              </div>
            )
          })}
          <button onClick={() => setStep(2)} className="oc-btn">
            Next →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex flex-col gap-2">
            <div className="oc-label-dim">TEAM NAME</div>
            <input
              autoFocus
              className="oc-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                teamType === 'school'
                  ? 'e.g. Mr. Lopez — 5th Grade'
                  : teamType === 'organization'
                  ? 'e.g. Acme HR'
                  : 'e.g. Family, Morning Crew'
              }
              maxLength={60}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="oc-label-dim">DESCRIPTION (OPTIONAL)</div>
            <textarea
              className="oc-input"
              rows={3}
              maxLength={240}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this team for?"
              style={{ resize: 'none', lineHeight: 1.6 }}
            />
          </div>
          {username && (
            <div className="oc-label-dim" style={{ fontSize: 12 }}>
              You'll appear as <strong style={{ color: 'var(--color-gold)' }}>@{username}</strong>
            </div>
          )}

          {teamType === 'school' && (
            <div
              style={{
                background: 'rgba(168,230,207,.07)',
                border: '1px solid rgba(168,230,207,.2)',
                borderRadius: 12,
                padding: '12px 14px',
                fontSize: 12,
                color: 'var(--dim)',
                lineHeight: 1.65,
              }}
            >
              <strong style={{ color: 'var(--text)' }}>🏫 How school teams work:</strong> students
              submit privately, you approve in the dashboard, and only approved compliments are
              visible. Required for COPPA/FERPA. New school teams require platform approval before
              going live.
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
            {busy ? 'Creating…' : 'Create Team ✦'}
          </button>
        </>
      )}
    </>
  )
}
