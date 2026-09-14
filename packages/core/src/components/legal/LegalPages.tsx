import { Link } from 'react-router-dom'
import { productConfig } from '../../product'

const SUPPORT_EMAIL = 'support@pregameopscfb.app'

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  let productName = 'GameDayOps'
  try {
    productName = productConfig().productName
  } catch {
    /* product not configured in isolation */
  }
  return (
    <div className="field-bg min-h-full w-full overflow-y-auto text-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-navy-950/95 px-5 py-3 backdrop-blur">
        <div className="font-display text-lg font-extrabold uppercase tracking-wide">{productName}</div>
        <Link to="/" className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold tracking-wider text-slate-200 hover:bg-white/10">
          ← Home
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-wide">{title}</h1>
        <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-slate-300 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-white">
          {children}
        </div>
        <p className="mt-8 border-t border-white/10 pt-4 text-xs text-slate-500">
          Questions? Contact <a className="text-team-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </main>
    </div>
  )
}

export function PrivacyPage() {
  return (
    <Shell title="Privacy Policy">
      <p>
        GameDayOps College Football (“we”, “us”) provides pre-game operations software to college football
        programs. This policy explains what we collect and how we use it.
      </p>
      <h2>What we collect</h2>
      <p>
        Account information (name, email) you provide at sign-up; the operational data you enter (schedules,
        timelines, branding, notes); and standard technical logs. Payment card details are handled entirely by
        our payment processor, Stripe — we never see or store your full card number.
      </p>
      <h2>How we use it</h2>
      <p>
        To operate the product for your organization, sync your displays, process your subscription, and provide
        support. Your organization’s data is isolated from other organizations.
      </p>
      <h2>Sharing</h2>
      <p>
        We do not sell your data. We share only with the service providers needed to run GameDayOps (hosting,
        database, and Stripe for billing), under their respective terms.
      </p>
      <h2>Retention & deletion</h2>
      <p>
        We retain your data while your account is active. Contact us to export or delete your organization’s data.
      </p>
      <h2>Security</h2>
      <p>
        Access is authenticated, and each organization’s data is protected by row-level security. No method is
        perfectly secure, but we take reasonable measures to protect your information.
      </p>
    </Shell>
  )
}

export function TermsPage() {
  return (
    <Shell title="Terms of Service">
      <p>By using GameDayOps College Football you agree to these terms.</p>
      <h2>The service</h2>
      <p>
        GameDayOps provides pre-game operations tooling — schedules, timelines, TV displays, and alerts. It is an
        operational tool and is provided “as is”; it is your responsibility to verify game times and run your
        operation.
      </p>
      <h2>Subscriptions & trial</h2>
      <p>
        A payment method is required to start your 14-day free trial. You are not charged during the trial. After
        the trial your subscription begins automatically at the plan price ($5.99/month or $60/year) unless you
        cancel beforehand. You can cancel anytime from the billing portal; cancellation stops future charges.
      </p>
      <h2>Acceptable use</h2>
      <p>Don’t misuse the service, attempt to access other organizations’ data, or disrupt the platform.</p>
      <h2>Termination</h2>
      <p>You may stop using the service anytime. We may suspend accounts that violate these terms.</p>
      <h2>Liability</h2>
      <p>
        To the extent permitted by law, GameDayOps is not liable for indirect or consequential damages arising
        from use of the service.
      </p>
    </Shell>
  )
}

export function SupportPage() {
  return (
    <Shell title="Support">
      <p>We’re here to help you run game day.</p>
      <h2>Contact</h2>
      <p>
        Email <a className="text-team-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{' '}
        and we’ll get back to you. Include your program name and a short description of what you need.
      </p>
      <h2>Getting started</h2>
      <p>
        1) Import your team’s 2026 schedule (screenshot, CSV, PDF, or paste). 2) Review the games. 3) Build your
        pre-game timeline. 4) Open a TV display link on your facility screens. Your timeline runs off kickoff
        automatically.
      </p>
      <h2>Billing</h2>
      <p>Manage your plan, payment method, and invoices anytime from Admin → Billing → Manage Billing.</p>
    </Shell>
  )
}
