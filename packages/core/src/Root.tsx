import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import { DashboardProvider } from './context/DashboardContext'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { OrgProvider } from './context/OrgProvider'
import AdminPage from './components/admin/AdminPage'
import Dashboard from './components/dashboard/Dashboard'
import DisplayRoute from './components/dashboard/DisplayRoute'
import HomePage from './components/home/HomePage'
import Landing from './components/landing/Landing'
import PricingPage from './components/landing/PricingPage'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import RequireAuth from './components/auth/RequireAuth'
import RequireEntitlement from './components/auth/RequireEntitlement'
import RecoveryOverlay from './components/auth/RecoveryOverlay'
import BillingPage from './components/billing/BillingPage'
import { PrivacyPage, TermsPage, SupportPage } from './components/legal/LegalPages'
import { commercialMode } from './product'
import { useAuth } from './context/AuthProvider'
import './index.css'

/**
 * The "/" index. In commercial mode a LOGGED-OUT visitor sees the public
 * marketing page (so the root URL sells the product — never a bare login),
 * while a signed-in user gets the entitlement-gated Home. Outside commercial
 * mode (NFL) "/" is simply the live board, exactly as before.
 */
function RootIndex() {
  const { user, loading } = useAuth()
  if (!commercialMode()) return <Dashboard />
  if (loading) {
    return <div className="grid min-h-full place-items-center bg-[#05070f] text-slate-400">Loading…</div>
  }
  if (!user) return <Landing />
  return (
    <RequireEntitlement>
      <HomePage />
    </RequireEntitlement>
  )
}

// The shared GameDayOps application shell. HashRouter keeps deep links working
// on static hosts / TV kiosks with no server-side routing. Product data must be
// configured (configureProduct) before this renders.
//
// Route protection (commercial mode — GameDayOps College):
//   /            operator board   → RequireAuth + RequireEntitlement
//   /admin       control center   → RequireAuth + RequireEntitlement
//   /billing     subscribe/manage → RequireAuth only (reachable when expired)
//   /login       auth screen      → public
//   /welcome     marketing        → public
//   /display/:t  TV kiosk         → public, but reads ONLY its token's org board
// Outside commercial mode (NFL) the guards are pass-throughs, so nothing changes.
export function GameDayOpsRoot() {
  return (
    <React.StrictMode>
      <AuthProvider>
        <OrgProvider>
          <DashboardProvider>
            <ThemeProvider>
              <RecoveryOverlay />
              <HashRouter>
                <Routes>
                  <Route path="/" element={<App />}>
                    {/* Commercial (College): Home dashboard at "/". Single-facility
                        NFL keeps the live board at "/" exactly as before. */}
                    {/* Logged-out "/" is the public marketing page; signed-in
                        "/" is the gated Home. See RootIndex. */}
                    <Route index element={<RootIndex />} />
                    {/* Game Day Ops — the live operator board (also mirrored to TVs). */}
                    <Route
                      path="board"
                      element={
                        <RequireAuth>
                          <RequireEntitlement>
                            <Dashboard />
                          </RequireEntitlement>
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="admin"
                      element={
                        <RequireAuth>
                          <RequireEntitlement>
                            <AdminPage />
                          </RequireEntitlement>
                        </RequireAuth>
                      }
                    />
                    {/* Billing is auth-gated but NOT entitlement-gated, so an
                        expired user can always reach it to subscribe. */}
                    <Route
                      path="billing"
                      element={
                        <RequireAuth>
                          <BillingPage />
                        </RequireAuth>
                      }
                    />
                    <Route path="login" element={<LoginPage />} />
                    {/* Public signup — starts the card-required 14-day trial. */}
                    <Route path="signup" element={<SignupPage />} />
                    {/* Public marketing page (product-branded, no customer data). */}
                    <Route path="welcome" element={<Landing />} />
                    {/* Public pricing page. */}
                    <Route path="pricing" element={<PricingPage />} />
                    {/* Public trust pages. */}
                    <Route path="privacy" element={<PrivacyPage />} />
                    <Route path="terms" element={<TermsPage />} />
                    <Route path="support" element={<SupportPage />} />
                    {/* TV kiosk display — token-scoped, read-only, no login. */}
                    <Route path="display/:token" element={<DisplayRoute />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </HashRouter>
            </ThemeProvider>
          </DashboardProvider>
        </OrgProvider>
      </AuthProvider>
    </React.StrictMode>
  )
}
