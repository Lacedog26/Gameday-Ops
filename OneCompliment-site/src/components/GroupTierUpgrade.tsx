import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getGroupStripeUrl,
  loadGroupSubscription,
  type GroupInfo,
  type GroupSubscription,
} from '../lib/groups'
import { loadSubscriptionTiers, type SubscriptionTier } from '../lib/teams'

const FREE_GROUP_LIMIT = 10

type Props = {
  group: GroupInfo
  /** Closes the panel. */
  onClose: () => void
  /** Reload GroupFeed after Stripe round-trip — the post-checkout state
   *  updates after the webhook fires `activate_group_subscription`. */
  onReturn: () => void
}

/**
 * Encode the group_id into Stripe's client_reference_id with a `group_`
 * prefix so the stripe-webhook can disambiguate from individual Pro
 * purchases (bare user_id) and team-tier purchases (`team_<uuid>__<tier>`).
 *
 * The tier_id rides along inside the same field as `group_<uuid>__<tier>`
 * so the webhook knows which tier was bought without having to maintain
 * a Stripe price-ID → tier-ID lookup table.
 *
 * The separator MUST stay `__`: Stripe Payment Links only accept
 * client_reference_id values matching [a-zA-Z0-9_-] as a URL param and
 * silently drop anything else (charged but never activated).
 */
function withGroupRef(url: string, groupId: string, tierId: string): string {
  const sep = url.includes('?') ? '&' : '?'
  const ref = `group_${groupId}__${tierId}`
  return `${url}${sep}client_reference_id=${encodeURIComponent(ref)}`
}

/**
 * Mirrors OneComplimentApp/src/screens/GroupSettingsScreen.tsx subscription
 * block: SUBSCRIPTION header → current-plan card with prominent seats
 * counter (free plan caps at 10) → tier list driven by the
 * team_subscription_tiers DB table (shared catalog with teams).
 */
export function GroupTierUpgrade({ group, onClose, onReturn }: Props) {
  const [sub, setSub] = useState<GroupSubscription | null>(null)
  const [tiers, setTiers] = useState<SubscriptionTier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [s, t] = await Promise.all([
        loadGroupSubscription(group.id),
        loadSubscriptionTiers(),
      ])
      if (!cancelled) {
        setSub(s)
        setTiers(t)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [group.id])

  const memberCount = sub?.current_members ?? group.member_count

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
        <div className="oc-label">SUBSCRIPTION</div>
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

      <CurrentPlanCard sub={sub} memberCount={memberCount} loading={loading} />

      {tiers.length > 0 && (
        <div className="flex flex-col gap-2">
          {tiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              group={group}
              activeTierId={sub?.subscription_tier ?? null}
              onReturn={onReturn}
            />
          ))}
        </div>
      )}

      <div
        className="text-center"
        style={{
          background: 'rgba(168,230,207,.06)',
          border: '1px solid rgba(168,230,207,.18)',
          borderRadius: 12,
          padding: '12px 14px',
          marginTop: 4,
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '.15em',
            textTransform: 'uppercase',
            color: 'var(--color-green)',
          }}
        >
          Nonprofit / school district?
        </div>
        <div
          style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6, marginTop: 6 }}
        >
          We have discounted pricing for educators, nonprofits, and large districts.
        </div>
        <Link
          to="/business"
          onClick={onClose}
          style={{
            display: 'inline-block',
            marginTop: 8,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--color-green)',
            textDecoration: 'none',
          }}
        >
          Talk to us →
        </Link>
      </div>
    </div>
  )
}

function CurrentPlanCard({
  sub,
  memberCount,
  loading,
}: {
  sub: GroupSubscription | null
  memberCount: number
  loading: boolean
}) {
  if (loading) {
    return (
      <div
        style={{
          background: 'var(--surf)',
          border: '1px solid var(--bord)',
          borderRadius: 12,
          padding: '12px 14px',
          fontSize: 12,
          color: 'var(--faint)',
        }}
      >
        Loading current plan…
      </div>
    )
  }

  // No active subscription — group is on the free plan (10-member cap,
  // enforced server-side by join_group).
  if (!sub || !sub.tier_id) {
    return (
      <div
        className="flex items-center"
        style={{
          gap: 12,
          background: 'var(--surf)',
          border: '1px solid var(--bord)',
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="font-bold" style={{ fontSize: 15, color: 'var(--text)' }}>
            Free Plan
          </div>
          <div style={{ fontSize: 12, color: 'var(--faint)' }}>
            Up to {FREE_GROUP_LIMIT} members · $0/mo
          </div>
          <div style={{ fontSize: 12, color: 'var(--faint)' }}>✓ Active</div>
        </div>
        <div
          className="font-bold"
          style={{ fontSize: 22, color: 'var(--color-gold)' }}
        >
          {memberCount}/{FREE_GROUP_LIMIT}
        </div>
      </div>
    )
  }

  const max = sub.max_members
  return (
    <div
      className="flex items-center"
      style={{
        gap: 12,
        background: 'var(--surf)',
        border: '1px solid var(--bord)',
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="font-bold" style={{ fontSize: 15, color: 'var(--text)' }}>
          {sub.tier_name ?? sub.tier_id} Plan
        </div>
        <div style={{ fontSize: 12, color: 'var(--faint)' }}>
          {max ? `Up to ${max} members` : 'Unlimited members'}
          {sub.price_monthly != null ? ` · $${sub.price_monthly}/mo` : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--faint)' }}>
          {sub.status === 'active' ? '✓ Active' : sub.status ?? '—'}
          {sub.cancel_at_period_end ? ' · Cancels at period end' : ''}
        </div>
      </div>
      <div
        className="font-bold"
        style={{ fontSize: 22, color: 'var(--color-gold)' }}
      >
        {memberCount}/{max ?? '∞'}
      </div>
    </div>
  )
}

function TierCard({
  tier,
  group,
  activeTierId,
  onReturn,
}: {
  tier: SubscriptionTier
  group: GroupInfo
  activeTierId: string | null
  onReturn: () => void
}) {
  const isCurrent = activeTierId === tier.id
  const stripeUrl = getGroupStripeUrl(tier.id)

  const inner = (
    <>
      <div className="flex items-center" style={{ gap: 8 }}>
        <span
          className="font-bold"
          style={{
            fontSize: 15,
            color: isCurrent ? 'var(--color-gold)' : 'var(--text)',
          }}
        >
          {tier.name}
        </span>
        {isCurrent && (
          <span
            className="font-mono"
            style={{
              fontSize: 9,
              letterSpacing: '.15em',
              color: 'var(--color-gold)',
              fontWeight: 700,
            }}
          >
            CURRENT
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: 'var(--dim)' }}>${tier.price_monthly}/mo</div>
      <div style={{ fontSize: 12, color: 'var(--faint)' }}>
        {tier.max_members ? `Up to ${tier.max_members} members` : 'Unlimited members'}
      </div>
    </>
  )

  const cardStyle = {
    background: isCurrent ? 'rgba(245,200,66,.08)' : 'transparent',
    border: `1px solid ${isCurrent ? 'rgba(245,200,66,.30)' : 'var(--bord)'}`,
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    textDecoration: 'none',
    color: 'inherit',
    cursor: isCurrent ? 'default' : 'pointer',
  }

  if (isCurrent) {
    return <div style={cardStyle}>{inner}</div>
  }

  // No Payment Link configured for this tier — never substitute another
  // tier's checkout (the old fallback sent buyers to the $3.99 Pro
  // Monthly link). Collapse to "Talk to sales" instead.
  if (!stripeUrl) {
    return (
      <a
        href={`mailto:info@onecompliment.app?subject=${encodeURIComponent(
          `Upgrade "${group.name}" to ${tier.name}`,
        )}`}
        style={cardStyle}
      >
        {inner}
        <div style={{ fontSize: 12, color: 'var(--color-gold)', marginTop: 4 }}>
          Talk to sales →
        </div>
      </a>
    )
  }

  return (
    <a
      href={withGroupRef(stripeUrl, group.id, tier.id)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        // Schedule a refresh ~30s out — typical Stripe-webhook→DB latency.
        setTimeout(onReturn, 30_000)
      }}
      style={cardStyle}
    >
      {inner}
    </a>
  )
}
