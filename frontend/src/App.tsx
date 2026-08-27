/**
 * App.tsx
 * -------
 * Root React component. Sets up:
 *   - React Router for client-side navigation
 *   - Authentication state listener (Supabase)
 *   - Protected routes (redirect to /auth if not logged in)
 *   - Offline detection banner
 */

import { useEffect, useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { supabase, type Session } from './lib/supabase'
import NavBar from './components/NavBar'
import HomePage from './pages/HomePage'
import ClassifyPage from './pages/ClassifyPage'
import HistoryPage from './pages/HistoryPage'
import AuthPage from './pages/AuthPage'

// ---------------------------------------------------------------------------
// Offline banner — shown whenever the browser loses internet connectivity.
// Critical for farmers with intermittent connectivity.
// ---------------------------------------------------------------------------
function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline  = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div
      role="alert"
      style={{
        position:        'fixed',
        top:             0,
        left:            0,
        right:           0,
        zIndex:          9999,
        background:      '#7f1d1d',
        color:           '#fff',
        textAlign:       'center',
        padding:         '10px 16px',
        fontSize:        '14px',
        fontFamily:      'Inter, sans-serif',
        fontWeight:      500,
        letterSpacing:   '0.01em',
        boxShadow:       '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      ⚠️ No internet connection — some features require connectivity
    </div>
  )
}

// ---------------------------------------------------------------------------
// Protected route wrapper
// ---------------------------------------------------------------------------
interface ProtectedRouteProps {
  session: Session | null
  children: JSX.Element
}

function ProtectedRoute({ session, children }: ProtectedRouteProps) {
  if (!session) return <Navigate to="/auth" replace />
  return children
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [session, setSession]   = useState<Session | null>(null)
  const [loading, setLoading]   = useState(true)

  const handleAuthChange = useCallback((newSession: Session | null) => {
    setSession(newSession)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Get existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      handleAuthChange(data.session)
    })

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => handleAuthChange(newSession)
    )

    return () => subscription.unsubscribe()
  }, [handleAuthChange])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
        <p>Loading PaddyScan…</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <OfflineBanner />
      <div className="app-shell">
        {session && <NavBar session={session} />}
        <main className="app-content">
          <Routes>
            {/* Public route */}
            <Route
              path="/auth"
              element={session ? <Navigate to="/" replace /> : <AuthPage />}
            />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute session={session}>
                  <HomePage session={session!} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classify"
              element={
                <ProtectedRoute session={session}>
                  <ClassifyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute session={session}>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
