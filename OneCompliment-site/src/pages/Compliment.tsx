import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { loadPublicCompliment, markComplimentRead, type PublicCompliment } from '../lib/supabase'

/**
 * Public-ish landing page for an unregistered recipient. Anyone with the
 * link can read; without the (UUID) link they can't enumerate.
 *
 * Three states:
 *   - loading: fetching the row via get_public_compliment RPC
 *   - found:   show the lift card + Get App CTA
 *   - missing: row doesn't exist or expired (>90 days) — gentle 404
 */
export default function Compliment() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PublicCompliment | null>(null)
  const [status, setStatus] = useState<'loading' | 'found' | 'missing'>('loading')

  useEffect(() => {
    if (!id) {
      setStatus('missing')
      return
    }
    let cancelled = false
    ;(async () => {
      const result = await loadPublicCompliment(id)
      if (cancelled) return
      if (result) {
        setData(result)
        setStatus('found')
        // Read receipt for the sender. Only flips when the signed-in
        // viewer actually matches the recipient (the RPC checks identity);
        // an anonymous or third-party visitor is a no-op.
        void markComplimentRead(id)
      } else {
        setStatus('missing')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  // Per-page <title> override so iMessage / WhatsApp / Slack link
  // previews show "Tap to see who lifted you" instead of the
  // app-wide default ("One compliment. Every day."). The static
  // <meta property="og:title"> in index.html already carries this
  // copy as a baseline; updating document.title in-app lets clients
  // that re-scrape on tap (and tab labels) pick up the right one.
  useEffect(() => {
    const recipient = data?.recipient_name?.trim()
    const title = recipient
      ? `${recipient}, you've been lifted 🌻 — OneCompliment`
      : 'You\'ve been lifted on OneCompliment 🌻'
    const prev = document.title
    document.title = title
    return () => {
      document.title = prev
    }
  }, [data?.recipient_name])

  return (
    <>
      <nav
        className="flex justify-between items-center"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
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
            color: 'var(--faint)',
            fontSize: 13,
            textDecoration: 'none',
            border: '1px solid var(--bord)',
            borderRadius: 20,
            padding: '7px 14px',
          }}
        >
          Open the app →
        </Link>
      </nav>
      <main className="oc-wrap" style={{ paddingTop: 32, paddingBottom: 80 }}>
        {status === 'loading' && (
          <div
            className="text-center"
            style={{
              padding: '48px 0',
              color: 'var(--faint)',
              fontSize: 14,
            }}
          >
            Loading…
          </div>
        )}
        {status === 'missing' && <MissingPanel />}
        {status === 'found' && data && <FoundPanel data={data} />}
      </main>
    </>
  )
}

function FoundPanel({ data }: { data: PublicCompliment }) {
  const sender = data.sender_display || data.sender_username || 'Someone'
  const sentDate = new Date(data.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
  return (
    <div className="flex flex-col" style={{ gap: 22, paddingTop: 12 }}>
      <div className="flex flex-col items-center text-center" style={{ gap: 14 }}>
        <div className="bob" style={{ fontSize: 64 }}>🌻</div>
        <div className="oc-label">YOU'VE BEEN LIFTED</div>
        <div
          className="font-bold"
          style={{ fontSize: 'clamp(26px,6vw,34px)', lineHeight: 1.2 }}
        >
          {data.recipient_name || 'You'}, someone wrote this for you.
        </div>
      </div>

      <div
        className="flex flex-col gap-3"
        style={{
          background:
            'linear-gradient(135deg,rgba(245,200,66,.10),rgba(245,200,66,.04))',
          border: '1px solid rgba(245,200,66,.30)',
          borderRadius: 20,
          padding: 24,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontStyle: 'italic',
            color: 'var(--text)',
            lineHeight: 1.6,
            paddingLeft: 14,
            borderLeft: '3px solid var(--color-gold)',
          }}
        >
          "{data.body}"
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 12,
            color: 'var(--faint)',
            letterSpacing: '.05em',
            marginTop: 4,
          }}
        >
          — from {data.sender_username ? `@${data.sender_username}` : sender} · {sentDate}
        </div>
      </div>

      <div
        className="flex flex-col items-center gap-3 text-center"
        style={{
          background: 'rgba(168,230,207,.06)',
          border: '1px solid rgba(168,230,207,.20)',
          borderRadius: 18,
          padding: 22,
        }}
      >
        <div
          className="font-bold"
          style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1.3 }}
        >
          Now lift someone yourself.
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--dim)',
            lineHeight: 1.6,
            maxWidth: 320,
          }}
        >
          OneCompliment is a daily topic — one specific, real compliment a day.
          Free forever. No account needed to start.
        </div>
        <Link
          to="/"
          className="oc-btn"
          style={{ textDecoration: 'none', textAlign: 'center', maxWidth: 320 }}
        >
          Give today's compliment ☀️
        </Link>
      </div>

      <div
        className="text-center"
        style={{
          fontSize: 11,
          color: 'var(--faint)',
          lineHeight: 1.6,
        }}
      >
        Want to claim @{(data.recipient_name || '').toLowerCase().replace(/\s+/g, '')} as your username?{' '}
        <Link to="/" style={{ color: 'var(--color-gold)' }}>
          Open the app
        </Link>
        .
      </div>
    </div>
  )
}

function MissingPanel() {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ gap: 14, paddingTop: 32 }}
    >
      <div style={{ fontSize: 48 }}>☀️</div>
      <div className="font-bold" style={{ fontSize: 22, lineHeight: 1.2 }}>
        This lift has expired or moved.
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--dim)',
          lineHeight: 1.65,
          maxWidth: 320,
        }}
      >
        Compliment links work for 90 days. Whoever sent it can resend, or you can
        send the next one.
      </div>
      <Link
        to="/"
        className="oc-btn"
        style={{ textDecoration: 'none', textAlign: 'center', maxWidth: 320 }}
      >
        Give today's compliment ☀️
      </Link>
    </div>
  )
}
