import { useEffect, useRef, useState } from 'react'
import type { Challenge } from '../lib/data'
import { searchUsers, type UserSearchResult } from '../lib/supabase'

type Props = {
  challenge: Challenge
  langFlag: string
  onOpenLang: () => void
  onBack: () => void
  /**
   * Submit hands back the recipient name (free-form OR @username of a
   * picked registered user) plus the user_id when one was picked. Home
   * uses recipientUserId to decide whether the share card on Done shows
   * the public link path or the in-app one.
   */
  onSubmit: (
    recipient: string,
    recipientUserId: string | null,
    response: string,
  ) => void
}

/**
 * Lift-anyone flow:
 *   - Type a name. As you type, registered users matching the query
 *     appear in a dropdown. Picking one populates recipient_id so the
 *     compliment lands in their app instantly (recipient sees it in
 *     Recap, realtime delivers).
 *   - Or just type a free-form name (a friend's first name, a nickname,
 *     a contact label) and submit without picking. The compliment still
 *     saves; Done shows a "Send to <name>" share card with a public
 *     link the sender forwards via iMessage / WhatsApp / DM.
 */
export function Write({ challenge, langFlag, onOpenLang, onBack, onSubmit }: Props) {
  const [recipientQuery, setRecipientQuery] = useState('')
  const [selected, setSelected] = useState<UserSearchResult | null>(null)
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [response, setResponse] = useState('')

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (selected || recipientQuery.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const found = await searchUsers(recipientQuery)
      setResults(found)
      setSearching(false)
    }, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [recipientQuery, selected])

  // Submit needs a recipient name (selected OR typed) and a real compliment.
  // Strip a leading '@' from the free-text name: usernames are stored WITHOUT
  // it, so a "@handle" stored as recipient_name never matches the recipient's
  // username (LOWER(recipient_name)=LOWER(username)) and the compliment is
  // invisible in their Received tab (the Received·0 bug). A picked user's
  // username is already bare; stripping is a harmless no-op there.
  const recipientText = (selected ? selected.username : recipientQuery.trim()).replace(/^@+/, '')
  const canSubmit = response.trim().length > 4 && recipientText.length > 0

  const submit = () => {
    if (!canSubmit) return
    onSubmit(recipientText, selected?.user_id ?? null, response.trim())
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="oc-btn-back">← Back to Rules</button>
        <button onClick={onOpenLang} className="oc-settings-btn">
          <span>{langFlag}</span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-bold" style={{ fontSize: 22, lineHeight: 1.25 }}>
          {challenge.prompt}
        </div>
        <div
          style={{
            background: 'rgba(245,200,66,.07)',
            border: '1px solid rgba(245,200,66,.18)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 13,
            color: 'var(--dim)',
            lineHeight: 1.6,
          }}
        >
          {challenge.rule}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="oc-label-dim">WHO ARE YOU LIFTING?</div>
        {selected ? (
          <SelectedChip
            user={selected}
            onClear={() => {
              setSelected(null)
              setRecipientQuery('')
            }}
          />
        ) : (
          <>
            <input
              className="oc-input"
              placeholder="Their name, @handle, or anyone…"
              value={recipientQuery}
              onChange={(e) => setRecipientQuery(e.target.value)}
              maxLength={40}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {searching && (
              <div
                className="flex items-center gap-2"
                style={{ padding: '10px 4px', fontSize: 13, color: 'var(--faint)' }}
              >
                <span>Searching…</span>
              </div>
            )}
            {!searching && results.length > 0 && (
              <div
                style={{
                  background: 'var(--surf)',
                  border: '1px solid var(--bord)',
                  borderRadius: 12,
                  marginTop: 4,
                  overflow: 'hidden',
                }}
              >
                {results.map((u, i) => (
                  <button
                    key={u.user_id}
                    onClick={() => {
                      setSelected(u)
                      setRecipientQuery(u.username)
                      setResults([])
                    }}
                    className="flex items-center gap-3 text-left w-full"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      borderBottom: i < results.length - 1 ? '1px solid var(--bord)' : 'none',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-serif)',
                    }}
                  >
                    <Avatar name={u.username} bg="#C3B1E1" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        @{u.username}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {/* Free-form fallback — never blocks submit, just clarifies what'll happen. */}
            {!searching && recipientQuery.trim().length >= 2 && results.length === 0 && (
              <div
                className="flex flex-col gap-1"
                style={{
                  background: 'rgba(168,230,207,.06)',
                  border: '1px solid rgba(168,230,207,.18)',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                  Lift "{recipientQuery.trim()}" anyway
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: 11, color: 'var(--faint)', lineHeight: 1.5 }}
                >
                  They're not on OneCompliment yet — we'll make a card you can text them.
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="oc-label-dim">YOUR COMPLIMENT</div>
        {/* Word/character count + "Your words belong to you" line
            removed per design feedback (the maxLength caps the field
            anyway, the counts were metadata noise, and the privacy
            line was unclear about whether the recipient sees the
            text). */}
        <textarea
          className="oc-input"
          rows={5}
          placeholder="Write it here..."
          maxLength={280}
          style={{ resize: 'none', lineHeight: 1.65 }}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
      </div>

      <button className="oc-btn" disabled={!canSubmit} onClick={submit}>
        Submit
      </button>
    </>
  )
}

function SelectedChip({ user, onClear }: { user: UserSearchResult; onClear: () => void }) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: 'rgba(245,200,66,.08)',
        border: '1px solid rgba(245,200,66,.30)',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Avatar name={user.username} bg="#F5C842" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          @{user.username}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-gold)', marginTop: 1 }}>
          they'll see it in their app
        </div>
      </div>
      <button
        onClick={onClear}
        aria-label="Clear recipient"
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          background: 'rgba(255,255,255,.08)',
          border: 'none',
          color: 'var(--faint)',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  )
}

function Avatar({ name, bg }: { name: string; bg: string }) {
  return (
    <div
      className="font-bold flex items-center justify-center"
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: bg,
        fontSize: 13,
        color: '#0D0D0D',
        flexShrink: 0,
      }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  )
}
