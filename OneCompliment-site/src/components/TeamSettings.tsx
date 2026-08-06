import { useState } from 'react'
import { updateTeamSettings, type Team, type TeamSettingsPatch } from '../lib/teams'

type Props = {
  team: Team
  onSaved: () => void
  onClose: () => void
}

/**
 * Inline admin-only settings panel for a team. The five fields below
 * cover ~80% of admin needs based on the mobile TeamSettingsScreen;
 * less common toggles (content_filter_enabled, parent_visibility,
 * custom_prompts_only) are still editable via the underlying RPC but
 * not exposed on web yet — add a "More options" expandable later if
 * Joao wants them surfaced.
 */
export function TeamSettings({ team, onSaved, onClose }: Props) {
  const [name, setName] = useState(team.name)
  const [description, setDescription] = useState(team.description ?? '')
  const [pinnedChallenge, setPinnedChallenge] = useState(team.pinned_challenge ?? '')
  const [requireApproval, setRequireApproval] = useState(team.require_approval)
  const [sharedVisibility, setSharedVisibility] = useState(team.shared_visibility)
  // "More options" — relevant mostly for school teams. Stays collapsed by
  // default so casual teams don't see clutter; opens automatically when any
  // of the advanced fields is already set to a non-default value.
  const [dailyTheme, setDailyTheme] = useState(team.daily_theme ?? '')
  const [contentFilter, setContentFilter] = useState(team.content_filter_enabled)
  const [parentVisibility, setParentVisibility] = useState(team.parent_visibility)
  const [customPromptsOnly, setCustomPromptsOnly] = useState(team.custom_prompts_only)
  const [moreOpen, setMoreOpen] = useState(
    Boolean(
      team.daily_theme ||
        team.content_filter_enabled ||
        team.parent_visibility ||
        team.custom_prompts_only,
    ),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty =
    name.trim() !== team.name ||
    description.trim() !== (team.description ?? '') ||
    pinnedChallenge.trim() !== (team.pinned_challenge ?? '') ||
    requireApproval !== team.require_approval ||
    sharedVisibility !== team.shared_visibility ||
    dailyTheme.trim() !== (team.daily_theme ?? '') ||
    contentFilter !== team.content_filter_enabled ||
    parentVisibility !== team.parent_visibility ||
    customPromptsOnly !== team.custom_prompts_only

  const save = async () => {
    if (!name.trim()) {
      setError('Team name is required.')
      return
    }
    setError(null)
    setBusy(true)

    // Only send fields that actually changed — update_team_settings
    // treats null as "no change" so this minimizes audit noise.
    const patch: TeamSettingsPatch = {}
    if (name.trim() !== team.name) patch.name = name.trim()
    if (description.trim() !== (team.description ?? '')) patch.description = description.trim()
    if (pinnedChallenge.trim() !== (team.pinned_challenge ?? '')) patch.pinned_challenge = pinnedChallenge.trim()
    if (requireApproval !== team.require_approval) patch.require_approval = requireApproval
    if (sharedVisibility !== team.shared_visibility) patch.shared_visibility = sharedVisibility
    if (dailyTheme.trim() !== (team.daily_theme ?? '')) patch.daily_theme = dailyTheme.trim()
    if (contentFilter !== team.content_filter_enabled) patch.content_filter_enabled = contentFilter
    if (parentVisibility !== team.parent_visibility) patch.parent_visibility = parentVisibility
    if (customPromptsOnly !== team.custom_prompts_only) patch.custom_prompts_only = customPromptsOnly

    const result = await updateTeamSettings(team.id, patch)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '.25em',
            textTransform: 'uppercase',
            color: 'var(--faint)',
          }}
        >
          Team Settings
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--faint)',
            fontSize: 16,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="oc-label-dim">TEAM NAME</div>
        <input
          className="oc-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="oc-label-dim">DESCRIPTION</div>
        <textarea
          className="oc-input"
          rows={2}
          maxLength={240}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this team for?"
          style={{ resize: 'none', lineHeight: 1.6 }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="oc-label-dim">PINNED CHALLENGE</div>
        <input
          className="oc-input"
          value={pinnedChallenge}
          onChange={(e) => setPinnedChallenge(e.target.value)}
          placeholder="Override today's compliment for this team (leave blank to use rotation)"
          maxLength={120}
        />
      </div>

      <ToggleRow
        title="Require approval for new members"
        sub="Joins land in the pending queue until an admin approves."
        value={requireApproval}
        onChange={setRequireApproval}
      />

      <ToggleRow
        title="Share approved compliments with the team"
        sub="When off, compliments are private to the recipient."
        value={sharedVisibility}
        onChange={setSharedVisibility}
      />

      <button
        onClick={() => setMoreOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--faint)',
          fontSize: 12,
          textAlign: 'left',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'var(--font-serif)',
        }}
      >
        {moreOpen ? '× Hide advanced options' : '+ More options (school / org)'}
      </button>

      {moreOpen && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="oc-label-dim">DAILY THEME</div>
            <input
              className="oc-input"
              value={dailyTheme}
              onChange={(e) => setDailyTheme(e.target.value)}
              placeholder='e.g. "Kindness Week" or "Spring 2026"'
              maxLength={60}
            />
          </div>

          <ToggleRow
            title="Content filter"
            sub="Auto-flag submissions that contain profanity or PII for review."
            value={contentFilter}
            onChange={setContentFilter}
          />

          <ToggleRow
            title="Parent visibility"
            sub="Let parents view a read-only feed via a separate invite. School teams only."
            value={parentVisibility}
            onChange={setParentVisibility}
          />

          <ToggleRow
            title="Custom prompts only"
            sub="Use only the team's pinned challenge — skip the global daily rotation."
            value={customPromptsOnly}
            onChange={setCustomPromptsOnly}
          />
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
            padding: '8px 10px',
          }}
        >
          {error}
        </div>
      )}

      {saved && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--color-green)',
            background: 'rgba(168,230,207,.08)',
            border: '1px solid rgba(168,230,207,.22)',
            borderRadius: 10,
            padding: '8px 10px',
          }}
        >
          ✓ Saved
        </div>
      )}

      <button
        onClick={save}
        className="oc-btn"
        disabled={busy || !dirty}
      >
        {busy ? 'Saving…' : dirty ? 'Save changes ✦' : 'No changes'}
      </button>
    </div>
  )
}

function ToggleRow({
  title,
  sub,
  value,
  onChange,
}: {
  title: string
  sub: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        background: 'rgba(255,255,255,.025)',
        border: '1px solid var(--bord)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>{title}</div>
        <div
          className="font-mono"
          style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3, lineHeight: 1.5 }}
        >
          {sub}
        </div>
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 99,
          background: value ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: value ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: value ? '#0D0D0D' : 'rgba(255,255,255,0.4)',
            transition: 'left 0.2s',
          }}
        />
      </div>
    </div>
  )
}
