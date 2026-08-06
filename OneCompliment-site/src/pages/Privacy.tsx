import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

export default function Privacy() {
  return (
    <>
      <nav
        className="flex justify-between items-center"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(12,12,12,0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--bord)',
          padding: '14px 24px',
        }}
      >
        <Brand size={13} />
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: 'var(--faint)',
            border: '1px solid var(--bord)',
            borderRadius: 20,
            padding: '7px 14px',
            fontSize: 13,
          }}
        >
          ← Back to app
        </Link>
      </nav>

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 760,
          margin: '0 auto',
          padding: '40px 24px 72px',
        }}
      >
        <div className="flex flex-col gap-4" style={{ marginBottom: 28 }}>
          <div className="oc-label">Privacy Policy</div>
          <h1
            className="font-bold"
            style={{ fontSize: 'clamp(34px,7vw,48px)', lineHeight: 1.08 }}
          >
            Your privacy matters.
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: 'var(--dim)',
              maxWidth: 620,
            }}
          >
            This Privacy Policy explains what information OneC🌻mpliment collects when you use
            our iOS app, Android app, or website at onecompliment.app, how we use it, who we
            share it with, and the choices you have.
          </p>
          <div
            className="font-mono"
            style={{ fontSize: 12, color: 'var(--faint)' }}
          >
            Last updated: May 13, 2026 · Effective: May 13, 2026
          </div>
        </div>

        <div
          style={{
            background: 'rgba(245,200,66,.06)',
            border: '1px solid rgba(245,200,66,.18)',
            borderRadius: 20,
            padding: 24,
            marginTop: 18,
          }}
        >
          <p style={{ fontSize: 16, lineHeight: 1.85, color: 'var(--dim)' }}>
            <strong style={{ color: 'var(--text)', fontWeight: 700 }}>Plain-English version:</strong>{' '}
            We collect your email (for sign-in), the username and compliments you write, your
            approximate location based on your IP address (so we can show local leaderboards),
            and basic subscription status if you go Pro. We don't sell your data, we don't run
            third-party advertising, and you can delete your account and data at any time from
            Settings.
          </p>
        </div>

        <div
          style={{
            background: 'var(--surf)',
            border: '1px solid var(--bord)',
            borderRadius: 20,
            padding: 24,
            marginTop: 18,
          }}
        >
          <Section title="Who we are">
            <p>
              OneC🌻mpliment is operated by Laco Ventures LLC ("we," "us," "our"). If you have
              questions about this policy or your data, contact us at{' '}
              <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
                info@onecompliment.app
              </a>
              .
            </p>
          </Section>
          <Divider />

          <Section title="Information you give us">
            <p>When you use the app or website, you may provide:</p>
            <ul>
              <li>
                <strong>Email address</strong> — when you link your account so it can be
                restored on another device. We send a 6-digit code to verify it.
              </li>
              <li>
                <strong>Username and display name</strong> — the name other members of your
                groups, teams, and leaderboards see.
              </li>
              <li>
                <strong>Profile photo (optional)</strong> — if you choose to upload one.
              </li>
              <li>
                <strong>Compliment content</strong> — the messages you write, the recipient
                name you enter, and the daily prompt you responded to.
              </li>
              <li>
                <strong>Group and team information</strong> — names of groups or teams you
                create or join, your role within them, and any custom rules or prompts you
                configure as an admin.
              </li>
              <li>
                <strong>Inquiries</strong> — anything you send through our contact form on the
                website, including your name, email, organization, group size, and message.
              </li>
            </ul>
          </Section>
          <Divider />

          <Section title="Information we collect automatically">
            <ul>
              <li>
                <strong>Approximate location (opt-in).</strong> If you turn on Local Leaderboard
                in Settings, our server derives your city, region, and country from your IP
                address using a third-party geolocation service (ipapi.co). We do <em>not</em>{' '}
                store the raw IP address, we do <em>not</em> store latitude or longitude, and we
                do <em>not</em> use the device's GPS. Capture only happens while Local
                Leaderboard is enabled; turning it off in Settings stops further collection and
                removes your stored location. See the dedicated "Location Data" section below
                for full details.
              </li>
              <li>
                <strong>Streak and activity data.</strong> The app tracks your current streak,
                longest streak, and which days you posted, so we can show your progress and
                send you reminders.
              </li>
              <li>
                <strong>Subscription status.</strong> If you subscribe to OneCompliment Pro
                through the App Store or Google Play, we record your subscription tier, renewal
                date, and whether it's active.
              </li>
              <li>
                <strong>Basic website analytics.</strong> Our website may collect anonymous
                page-view counts, referrer information, and basic device data (such as browser
                type) so we can understand traffic patterns. The app itself does not include
                any third-party analytics, advertising, or behavioral tracking SDKs.
              </li>
            </ul>
            <p>
              <strong>We do not use the Apple Advertising Identifier (IDFA),</strong> we do
              not show ads, and we do not ask for App Tracking Transparency consent because we
              do not track you across other apps or websites.
            </p>
          </Section>
          <Divider />

          <Section title="How we use your information">
            <ul>
              <li>Operate the app and website and provide the features you request</li>
              <li>Authenticate you and let you restore your account on a new device</li>
              <li>
                Show your compliments, streak, and (optionally) location on group, team, and
                local leaderboards
              </li>
              <li>Schedule reminders so you don't break your streak</li>
              <li>Process subscription purchases and confirm Pro status</li>
              <li>Respond to your support requests and inquiries</li>
              <li>Maintain security, prevent abuse, and enforce our Terms of Use</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p>
              We do not use your information for advertising, profiling, or any form of
              automated decision-making that produces legal effects about you.
            </p>
          </Section>
          <Divider />

          <Section title="When we share information">
            <p>We share information only in the following ways:</p>
            <ul>
              <li>
                <strong>With other users you choose to interact with.</strong> Members of a
                group or team you join can see the display name, profile photo, streak,
                compliment text, and recipient name of compliments you post in that group or
                team. If you turn on Location Sharing, your display name, streak, and city
                appear on local leaderboards in your area.
              </li>
              <li>
                <strong>With service providers who run our infrastructure.</strong> We rely on
                trusted vendors who process data on our behalf and are contractually limited to
                what's needed to operate the service:
                <ul style={{ marginTop: 8 }}>
                  <li>
                    <strong>Supabase</strong> — hosts our database, authentication, and file
                    storage
                  </li>
                  <li>
                    <strong>RevenueCat</strong> — manages App Store and Google Play
                    subscription receipts; receives your account ID and purchase metadata
                  </li>
                  <li>
                    <strong>Brevo</strong> — delivers transactional email (sign-in codes and
                    invitations); receives your email address and the message body
                  </li>
                  <li>
                    <strong>ipapi.co</strong> — converts your IP address into an approximate
                    city, region, and country
                  </li>
                  <li>
                    <strong>Netlify</strong> — hosts our website and processes contact-form
                    submissions
                  </li>
                  <li>
                    <strong>Apple and Google</strong> — process payments for subscriptions
                    purchased through the App Store and Google Play
                  </li>
                </ul>
              </li>
              <li>
                <strong>If required by law</strong> — for example, in response to a valid
                subpoena, court order, or government request.
              </li>
              <li>
                <strong>In a business transfer</strong> — if OneCompliment is acquired or
                merged, your information may transfer as part of that transaction. We will
                notify you before your information becomes subject to a different privacy
                policy.
              </li>
            </ul>
            <p>
              <strong>
                We do not sell your personal information and we do not share it with advertisers
                or data brokers.
              </strong>
            </p>
          </Section>
          <Divider />

          <Section title="Location Data">
            <p>
              If you opt in to the Local Leaderboard, OneC🌻mpliment collects your approximate
              location (city-level only) to display streaks from users in your area. We do not
              collect or store precise GPS coordinates, addresses, or movement history.
            </p>
            <p>
              Location is collected only while the Local Leaderboard is enabled in Settings. You
              can disable it at any time, which immediately removes you from the leaderboard,
              stops further location collection, and clears your stored city, region, and
              country from our database. Approximate location is stored alongside your username
              and streak count, and is deleted within 30 days of you disabling the feature or
              deleting your account (whichever comes first).
            </p>
            <p>
              We do not sell or share location data with third parties. Location is not used for
              advertising, tracking, or any purpose outside the Local Leaderboard feature.
            </p>
            <p>
              Under GDPR and CCPA, you have the right to access, correct, or delete your
              location data. Contact{' '}
              <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
                info@onecompliment.app
              </a>{' '}
              to make a request.
            </p>
          </Section>
          <Divider />

          <Section title="Your choices and rights">
            <p>You can:</p>
            <ul>
              <li>
                <strong>Edit your profile</strong> — change your username, display name, or
                avatar from the app's Settings screen at any time
              </li>
              <li>
                <strong>Turn Location Sharing on or off</strong> — toggle it in Settings.
                Turning it off immediately removes you from local leaderboards
              </li>
              <li>
                <strong>Mute or leave groups and teams</strong> — from each group or team's
                Settings page
              </li>
              <li>
                <strong>Disable notifications</strong> — from your device's system Settings,
                or from inside the app
              </li>
              <li>
                <strong>Cancel your subscription</strong> — from your Apple ID or Google Play
                account at any time. Cancelling takes effect at the end of the current billing
                period
              </li>
              <li>
                <strong>Delete your account</strong> — from Settings → Delete Account. This
                removes your profile, your streak history, your group and team memberships,
                and your subscription record. Compliments you sent to other people may remain
                visible to those recipients with your name removed
              </li>
              <li>
                <strong>Request a copy of your data</strong> or ask us to correct it — email{' '}
                <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
                  info@onecompliment.app
                </a>
              </li>
            </ul>
            <p>
              <strong>If you are in the EU, UK, or Switzerland (GDPR):</strong> you also have
              the right to object to processing, to restrict processing, to data portability,
              and to lodge a complaint with your local data protection authority. The legal
              bases we rely on are your consent (for optional features like Location Sharing),
              performance of a contract (to operate the service you signed up for), and our
              legitimate interests in keeping the service secure and improving it.
            </p>
            <p>
              <strong>If you are a California resident (CCPA/CPRA):</strong> you have the right
              to know what personal information we collect, to delete it, to correct it, and to
              opt out of "sale" or "sharing" of personal information. We do not sell or share
              your personal information as those terms are defined under California law.
            </p>
          </Section>
          <Divider />

          <Section title="Data retention">
            <p>
              We keep your profile, compliments, streak history, and location data for as long
              as your account is active. When you delete your account, we delete this data
              from our active systems within 30 days. Backups containing your data are deleted
              within 90 days of the next backup-rotation cycle. We may retain limited
              information longer where required to comply with law, resolve disputes, or
              enforce our agreements.
            </p>
            <p>
              Public compliment share links (the <code>onecompliment.app/c/&lt;id&gt;</code>{' '}
              URLs) expire automatically 90 days after the compliment is sent.
            </p>
          </Section>
          <Divider />

          <Section title="Data Security">
            <p>
              Our website uses HTTPS encryption to ensure your submissions are sent securely
              to us. While we do our best to protect your data, please keep in mind that no
              method of transmission over the internet is 100% secure.
            </p>
          </Section>
          <Divider />

          <Section title="Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>Request a copy of the personal information we have about you</li>
              <li>Ask us to update or correct any information that is inaccurate</li>
              <li>Ask us to erase your data</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
                info@onecompliment.app
              </a>
              .
            </p>
          </Section>
          <Divider />

          <Section title="Children's privacy">
            <p>
              OneC🌻mpliment is not directed to children under 13, and we do not knowingly
              collect personal information from children under 13. If we learn that we have
              collected personal information from a child under 13 without verified parental
              consent, we will delete that information. If you believe a child has provided
              us with personal information, please contact us at{' '}
              <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
                info@onecompliment.app
              </a>{' '}
              and we will investigate.
            </p>
          </Section>
          <Divider />

          <Section title="International transfers">
            <p>
              We operate from the United States. If you use the app from outside the United
              States, your information will be transferred to, stored, and processed in the
              United States and other countries where our service providers operate. By using
              OneCompliment, you understand and agree to that transfer. Where required, we
              rely on appropriate safeguards such as Standard Contractual Clauses for these
              transfers.
            </p>
          </Section>
          <Divider />

          <Section title="Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. When we make material
              changes, we'll update the "Last updated" date at the top of this page and, where
              appropriate, notify you in the app or by email. Continued use of OneC🌻mpliment
              after changes take effect means you accept the revised policy.
            </p>
          </Section>
          <Divider />

          <Section title="Contact us">
            <p>
              Questions, requests, or concerns about this Privacy Policy or your personal
              information? Reach us at{' '}
              <a href="mailto:info@onecompliment.app" style={{ color: 'var(--color-gold)' }}>
                info@onecompliment.app
              </a>
              .
            </p>
            <p style={{ fontSize: 13, color: 'var(--faint)', marginTop: 10 }}>
              Laco Ventures LLC · United States
            </p>
          </Section>
        </div>

        <div
          className="flex flex-col gap-2.5"
          style={{
            marginTop: 34,
            paddingTop: 22,
            borderTop: '1px solid var(--bord)',
            alignItems: 'flex-start',
          }}
        >
          <Link
            to="/"
            style={{
              fontSize: 13,
              color: 'var(--faint)',
              textDecoration: 'none',
              border: '1px solid var(--bord)',
              borderRadius: 20,
              padding: '8px 18px',
            }}
          >
            ← Back to the app
          </Link>
        </div>
      </main>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="flex flex-col gap-3.5"
      style={{ marginTop: 20 }}
    >
      <h2
        className="font-bold"
        style={{ fontSize: 28, lineHeight: 1.2, marginTop: 18 }}
      >
        {title}
      </h2>
      <div className="oc-prose">{children}</div>
    </section>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--bord)', margin: '20px 0 8px' }} />
}
