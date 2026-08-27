/**
 * AuthPage.tsx
 * ------------
 * Login and Registration page using Supabase Auth.
 *
 * Features
 * --------
 * - Toggle between Sign In and Sign Up forms
 * - Email + password authentication
 * - Sign up collects full name (stored in profiles table)
 * - Error and success messaging
 * - Loading state on submit button
 * - After sign in, App.tsx redirects to '/' via onAuthStateChange
 */

import React, { useState } from 'react'
import { Leaf, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

type AuthMode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode,      setMode]      = useState<AuthMode>('signin')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [fullName,  setFullName]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [message,   setMessage]   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Redirect handled by App.tsx onAuthStateChange

      } else {
        // Sign up — pass full_name in metadata so the DB trigger can pick it up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        })
        if (error) throw error
        setMessage(
          'Account created! Check your email for a confirmation link, ' +
          'then sign in below.'
        )
        setMode('signin')
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
    setError(null)
    setMessage(null)
  }

  return (
    <div className="auth-page">
      {/* Brand panel */}
      <div className="auth-page__brand" aria-hidden="true">
        <div className="auth-page__brand-bg" />
        <div className="auth-page__brand-content">
          <div className="auth-page__brand-logo">
            <Leaf size={36} />
          </div>
          <h2 className="auth-page__brand-name">PaddyScan</h2>
          <p className="auth-page__brand-tagline">
            AI-powered harvest timing for Filipino smallholder farmers
          </p>
          <div className="auth-page__brand-classes">
            <span className="auth-page__class auth-page__class--green">🌱 Immature</span>
            <span className="auth-page__class auth-page__class--amber">🌾 Nearly Mature</span>
            <span className="auth-page__class auth-page__class--red">🏆 Ready for Harvest</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-page__form-panel">
        <div className="auth-card">
          <div className="auth-card__header">
            <div className="auth-card__icon">
              {mode === 'signin' ? <LogIn size={24} /> : <UserPlus size={24} />}
            </div>
            <h1 className="auth-card__title">
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="auth-card__subtitle">
              {mode === 'signin'
                ? 'Sign in to your PaddyScan account'
                : 'Join PaddyScan — it\'s free'}
            </p>
          </div>

          {/* Success message (after sign-up) */}
          {message && (
            <div role="status" className="auth-card__message">
              ✅ {message}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div role="alert" className="auth-card__error">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="auth-card__form">
            {/* Full name — sign up only */}
            {mode === 'signup' && (
              <div className="auth-field">
                <label htmlFor="auth-fullname" className="auth-field__label">
                  <User size={15} /> Full Name
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  autoComplete="name"
                  className="auth-field__input"
                  placeholder="Juan dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="auth-email" className="auth-field__label">
                <Mail size={15} /> Email address
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete={mode === 'signin' ? 'email' : 'username'}
                className="auth-field__input"
                placeholder="juan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="auth-password" className="auth-field__label">
                <Lock size={15} /> Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="auth-field__input"
                placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'signup' ? 8 : 1}
                disabled={loading}
              />
            </div>

            {/* Submit */}
            <button
              id={mode === 'signin' ? 'btn-signin' : 'btn-signup'}
              type="submit"
              className="btn btn--primary btn--full"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner spinner--sm" aria-hidden="true" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Switch mode */}
          <p className="auth-card__switch">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              id={mode === 'signin' ? 'btn-go-signup' : 'btn-go-signin'}
              type="button"
              className="auth-card__switch-btn"
              onClick={switchMode}
            >
              {mode === 'signin' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
