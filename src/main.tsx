import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import { DashboardProvider } from './context/DashboardContext'
import { ThemeProvider } from './context/ThemeProvider'
import AdminPage from './components/admin/AdminPage'
import Dashboard from './components/dashboard/Dashboard'
import './index.css'

// Training & Anatomy lives at /train/* with its own layout and chrome. It is
// code-split so the TV dashboard never pays for it at startup.
const TrainingApp = lazy(() => import('./training'))

// HashRouter keeps deep links working when the app is served from a static
// file host or opened directly on a TV kiosk (no server-side routing needed).
// The dashboard's providers wrap the dashboard routes rather than the whole
// tree: DashboardProvider opens a Supabase realtime connection, and the local
// Training & Anatomy module has no use for it. Dashboard and Admin still render
// inside both providers via App's <Outlet />, so their behaviour is unchanged.
const dashboardShell = (
  <DashboardProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </DashboardProvider>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route
          path="/train/*"
          element={
            <Suspense fallback={<div className="h-full w-full bg-[#07090E]" />}>
              <TrainingApp />
            </Suspense>
          }
        />
        <Route path="/" element={dashboardShell}>
          <Route index element={<Dashboard />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
