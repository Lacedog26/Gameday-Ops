import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { createTeam, getTeamStripeUrl, TEAM_TYPE_META, type TeamType } from '../lib/teams'
import { createGroup, getGroupStripeUrl } from '../lib/groups'
import { useAuth } from '../hooks/useAuth'

type Tier = {
  id: 'free' | 'small_group' | 'team' | 'growth' | 'enterprise'
  product: 'group' | 'team'
  name: string
  price: string
  members: string
  blurb: string
  emphasize?: boolean
  isFree?: boolean
}

// Free creates a casual `groups` row; every paid tier (Small Group included)
// creates a `teams` row so Small Group sits on the same SaaS pricing ladder
// as Team / Growth / Enterprise.
const TIERS: Tier[] = [
  { id: 'free',         product: 'group', name: 'Free',        price: '$0/mo',     members: 'Up to 10 members', blurb: 'Casual group with friends or family. Upgrade anytime.', isFree: true },
  { id: 'small_group',  product: 'team',  name: 'Small Group', price: '$9.99/mo',  members: '10–25 members',    blurb: 'A tight circle of friends, family, or a small club.' },
  { id: 'team',         product: 'team',  name: 'Team',        price: '$99/mo',    members: 'Up to 100',        blurb: 'For workplaces, classrooms, and small organizations.', emphasize: true },
  { id: 'growth',       product: 'team',  name: 'Growth',      price: '$299/mo',   members: 'Up to 500',        blurb: 'For mid-size orgs, larger schools, multi-team rollouts.' },
  { id: 'enterprise',   product: 'team',  name: 'Enterprise',  price: '$499/mo',   members: 'Unlimited',        blurb: 'For schools, districts, and large organizations.' },
]

// Same encoding used by mobile + TierUpgrade — keeps the stripe-webhook
// single-source-of-truth on routing. `__` separator, NOT `:` — Stripe
// Payment Links silently drop client_reference_id values with characters
// outside [a-zA-Z0-9_-].
function withRef(url: string, kind: 'team' | 'group', id: string, tierId: string): string {
  const sep = url.includes('?') ? '&' : '?'
  const ref = `${kind}_${id}__${tierId}`
  return `${url}${sep}client_reference_id=${encodeURIComponent(ref)}`
}

// Shown when a tier has no Payment Link configured — we refuse to fall
// back to another tier's checkout (the old behavior sent buyers to the
// $3.99 Pro Monthly link regardless of tier).
const CHECKOUT_UNAVAILABLE =
  'Checkout for this tier isn’t available yet. Email info@onecompliment.app and we’ll get you set up.'

export default function ChoosePlan() {
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()

  const [selected, setSelected] = useState<Tier | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [teamType, setTeamType] = useState<TeamType>('general')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const product: 'group' | 'team' | null = selected?.product ?? null
  const isFree = selected?.isFree ?? false
  const showForm = selected !== null
  const canSubmit = name.trim().length > 0 && !busy && showForm && !authLoading

  const onPick = (tier: Tier) => {
    setSelected(tier)
    setError(null)
  }

  const onSubmit = async () => {
    if (!canSubmit || !selected) return
    setBusy(true)
    setError(null)
    try {
      if (product === 'group') {
        // Resolve the Payment Link before creating anything — a missing
        // link must not leave an orphan row or fall through to a
        // wrong-price checkout.
        const stripeUrl = isFree ? null : getGroupStripeUrl('small_group')
        if (!isFree && !stripeUrl) {
          setError(CHECKOUT_UNAVAILABLE)
          return
        }
        const result = await createGroup(name.trim(), 'Member')
        if (!result.ok) {
          if (result.error.kind === 'group_limit') {
            // Hit the free 8-group cap — send them to the Pro upsell, which
            // unlocks unlimited groups, rather than a dead-end raw error.
            navigate('/pro')
            return
          }
          setError(
            result.error.kind === 'email_required'
              ? 'Link an email in Settings before creating a group.'
              : result.error.kind === 'auth'
              ? 'You need to sign in first.'
              : result.error.message || 'Could not create the group. Try again.',
          )
          return
        }
        if (isFree) {
          alert(`✓ Free group "${name.trim()}" created. Invite code: ${result.invite_code}`)
          navigate('/')
          return
        }
        // Small Group → Stripe (stripeUrl checked non-null above)
        window.location.href = withRef(stripeUrl!, 'group', result.group_id, 'small_group')
        return
      }

      // product === 'team'
      const tierId = selected.id
      const stripeUrl = getTeamStripeUrl(tierId)
      if (!stripeUrl) {
        setError(CHECKOUT_UNAVAILABLE)
        return
      }
      const result = await createTeam({
        name: name.trim(),
        teamType,
        displayName: 'Admin',
        description: description.trim() || undefined,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      window.location.href = withRef(stripeUrl, 'team', result.team_id, tierId)
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <nav
        className="flex justify-between items-center"
        style={{
          position: 'sticky', top: 0, zIndex: 50,
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
            color: 'var(--faint)', fontSize: 13, textDecoration: 'none',
            border: '1px solid var(--bord)', borderRadius: 20, padding: '7px 14px',
          }}
        >
          ← Back
        </Link>
      </nav>

      <main className="oc-wrap" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div className="flex flex-col" style={{ gap: 20 }}>
          <div>
            <div className="oc-label">CHOOSE YOUR PLAN</div>
            <h1
              className="font-bold"
              style={{ fontSize: 'clamp(24px,5vw,32px)', lineHeight: 1.2, marginTop: 6 }}
            >
              Pick a tier, then name your {product === 'team' ? 'team' : 'group'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.55, marginTop: 6 }}>
              You can rename later. Switching tiers requires a fresh payment.
            </p>
          </div>

          {/* Paid tiers — grid on wide, stacked on narrow */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {TIERS.map((t) => {
              const active = selected?.id === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => onPick(t)}
                  style={{
                    textAlign: 'left',
                    background: active ? 'rgba(245,200,66,.07)' : 'var(--surf)',
                    border: `${active ? '2px' : '1px'} solid ${
                      active ? 'var(--color-gold)' : t.emphasize ? 'rgba(245,200,66,.45)' : 'var(--bord)'
                    }`,
                    borderRadius: 14,
                    padding: active ? 15 : 16,
                    cursor: 'pointer',
                    color: 'inherit',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 16, fontWeight: 700, color: active ? 'var(--color-gold)' : 'var(--text)', flex: 1 }}>
                      {t.name}
                    </span>
                    {t.isFree && !active && (
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 9, letterSpacing: '.1em', fontWeight: 700,
                          color: '#A8E6CF',
                          background: 'rgba(168,230,207,.12)',
                          padding: '2px 6px', borderRadius: 4,
                        }}
                      >
                        FREE
                      </span>
                    )}
                    {t.emphasize && !active && (
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 9, letterSpacing: '.1em', fontWeight: 700,
                          color: 'var(--color-gold)',
                          background: 'rgba(245,200,66,.12)',
                          padding: '2px 6px', borderRadius: 4,
                        }}
                      >
                        POPULAR
                      </span>
                    )}
                    {active && (
                      <span style={{ fontSize: 16, color: 'var(--color-gold)', fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: active ? 'var(--color-gold)' : 'var(--text)' }}>
                    {t.price}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--faint)' }}>{t.members}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.5, marginTop: 4 }}>
                    {t.blurb}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Name + (for teams) type form, only after a selection */}
          {showForm && (
            <div
              style={{
                background: 'var(--surf)',
                border: '1px solid var(--bord)',
                borderRadius: 14,
                padding: 16,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
            >
              <label className="oc-label" style={{ marginBottom: 4 }}>
                NAME YOUR {product === 'team' ? 'TEAM' : 'GROUP'}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={product === 'team' ? "e.g. Mrs. Lee's 4th Grade" : 'e.g. Saturday Hike Crew'}
                maxLength={60}
                autoFocus
                style={{
                  background: 'var(--input-bg, rgba(255,255,255,.04))',
                  border: '1px solid var(--bord)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 15,
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />

              {product === 'team' && (
                <>
                  <label className="oc-label" style={{ marginTop: 6, marginBottom: 4 }}>TEAM TYPE</label>
                  {(['general', 'organization', 'school'] as TeamType[]).map((t) => {
                    const meta = TEAM_TYPE_META[t]
                    const active = teamType === t
                    return (
                      <button
                        key={t}
                        onClick={() => setTeamType(t)}
                        style={{
                          textAlign: 'left',
                          background: active ? 'rgba(245,200,66,.07)' : 'var(--bg, #0c0c0c)',
                          border: `1px solid ${active ? 'var(--color-gold)' : 'var(--bord)'}`,
                          borderRadius: 12,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          color: 'inherit',
                          display: 'flex', flexDirection: 'column', gap: 3,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 16 }}>{meta.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--color-gold)' : 'var(--text)', flex: 1 }}>
                            {meta.label}
                          </span>
                          {active && <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--faint)', lineHeight: 1.5 }}>
                          {meta.desc}
                        </div>
                      </button>
                    )
                  })}

                  <label className="oc-label" style={{ marginTop: 6, marginBottom: 4 }}>
                    DESCRIPTION (OPTIONAL)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this team for?"
                    maxLength={200}
                    rows={3}
                    style={{
                      background: 'var(--input-bg, rgba(255,255,255,.04))',
                      border: '1px solid var(--bord)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: 14,
                      color: 'var(--text)',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </>
              )}

              {error && (
                <div
                  style={{
                    background: 'rgba(255,107,107,.07)',
                    border: '1px solid rgba(255,107,107,.25)',
                    borderRadius: 10, padding: '10px 12px',
                    fontSize: 13, color: '#FF8B94',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={onSubmit}
                disabled={!canSubmit}
                style={{
                  marginTop: 4,
                  background: canSubmit ? 'var(--color-gold)' : 'rgba(245,200,66,.4)',
                  color: '#0D0D0D',
                  border: 'none', borderRadius: 14, padding: '14px 18px',
                  fontSize: 15, fontWeight: 700,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                {busy
                  ? 'Working…'
                  : isFree
                  ? 'Create free group'
                  : `Continue to payment · ${selected!.price}`}
              </button>

              {!isFree && (
                <p style={{ fontSize: 11, color: 'var(--faint)', lineHeight: 1.55, textAlign: 'center' }}>
                  You'll be redirected to Stripe to complete payment. Your {product} is created
                  immediately; full features unlock when payment confirms.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
