import { useEffect, useState } from 'react'
import { checkUsernameAvailable, claimUsername, loadProfile } from '../lib/supabase'

type Props = {
  /** Current username from the auth state — used as both the initial input
   *  value and the baseline for hasChanges. */
  initialUsername: string | null
  /** Linked email, if any — shown read-only below the username field. */
  email: string | null
  /** Closes the edit-profile flow and returns to the Settings main view. */
  onClose: () => void
  /** Fires after a successful save so the parent can refresh auth state. */
  onSaved?: () => void
}

/**
 * Username edit flow ported from mobile/EditProfileScreen. Validates
 * length / charset client-side, checks availability against `profiles`,
 * and calls upsert_profile via claimUsername.
 *
 * Username rules match mobile exactly:
 *   - 3–24 chars
 *   - lowercase letters, numbers, underscores only
 *   - lowercased on input so users don't fight casing
 */
export function EditProfile({ initialUsername, email, onClose, onSaved }: Props) {
  // Profile username = source of truth for hasChanges. Loaded fresh from
  // DB on mount so a stale Redux/auth-state value doesn't make Save look
  // disabled when the user actually has nothing claimed yet.
  const [profileUsername, setProfileUsername] = useState(initialUsername ?? '')
  const [usernameInput, setUsernameInput] = useState(initialUsername ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    loadProfile().then((p) => {
      if (p.username) {
        setProfileUsername(p.username)
        setUsernameInput(p.username)
      }
    })
  }, [])

  const trimmed = usernameInput.trim().toLowerCase()
  const hasChanges = trimmed !== profileUsername

  const handleSave = async () => {
    setError(null)
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (trimmed.length > 24) {
      setError('Username must be 24 characters or fewer.')
      return
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setError('Only lowercase letters, numbers, and underscores.')
      return
    }

    setSaving(true)
    const available = await checkUsernameAvailable(trimmed)
    if (!available) {
      setSaving(false)
      setError('That username is already taken. Try another.')
      return
    }

    const result = await claimUsername(trimmed)
    setSaving(false)

    if (!result.ok) {
      setError(result.error || 'Failed to save username.')
      return
    }

    setProfileUsername(trimmed)
    setSavedOk(true)
    onSaved?.()
    setTimeout(() => setSavedOk(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="oc-btn-back">← Back</button>
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'rgba(242,237,228,0.5)',
            textTransform: 'uppercase',
          }}
        >
          Edit Profile
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{
            background: hasChanges && !saving ? 'var(--color-gold)' : 'rgba(245,200,66,0.18)',
            color: hasChanges && !saving ? '#0C0C0C' : 'rgba(12,12,12,0.4)',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-serif)',
            cursor: hasChanges && !saving ? 'pointer' : 'default',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div
        className="font-bold"
        style={{ fontSize: 22, color: '#F2EDE4', lineHeight: 1.25 }}
      >
        Personal Information
      </div>
      <div style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.65 }}>
        Your @username is what other members see in groups, teams, and on
        compliments you send. 3–24 characters, lowercase letters / numbers /
        underscores only.
      </div>

      <div className="flex flex-col gap-2">
        <div className="oc-label-dim">USERNAME</div>
        <div
          className="flex items-center"
          style={{
            background: 'var(--surf)',
            border: '1px solid var(--bord)',
            borderRadius: 12,
            paddingRight: 14,
          }}
        >
          <span
            style={{
              fontSize: 16,
              color: 'var(--faint)',
              paddingLeft: 14,
              paddingRight: 2,
            }}
          >
            @
          </span>
          <input
            autoFocus
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="oc-input"
            placeholder="choose_a_username"
            value={usernameInput}
            onChange={(e) => {
              setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hasChanges && !saving) handleSave()
            }}
            maxLength={24}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              borderRadius: 0,
              padding: '14px 4px',
            }}
          />
          <span style={{ fontSize: 18, opacity: 0.5 }}>👤</span>
        </div>
      </div>

      {email ? (
        <div className="flex flex-col gap-2">
          <div className="oc-label-dim">EMAIL</div>
          <div
            className="flex items-center"
            style={{
              background: 'var(--surf)',
              border: '1px solid var(--bord)',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 15,
                color: 'var(--dim)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email}
            </span>
            <span style={{ fontSize: 16, color: '#A8E6CF', marginLeft: 8 }}>✓</span>
          </div>
        </div>
      ) : null}

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

      {savedOk && (
        <div
          style={{
            fontSize: 13,
            color: '#A8E6CF',
            background: 'rgba(168,230,207,.08)',
            border: '1px solid rgba(168,230,207,.20)',
            borderRadius: 10,
            padding: '10px 12px',
            textAlign: 'center',
          }}
        >
          Saved. Your profile has been updated.
        </div>
      )}
    </div>
  )
}
