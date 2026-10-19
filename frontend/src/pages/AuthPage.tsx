/**
 * AuthPage.tsx
 * ------------
 * Redesigned Landing & Authentication Portal for PaddyScan.
 * 
 * Impeccable Design:
 * - Rich Agricultural Visual Storytelling with authentic Abra field imagery
 * - Interactive Panicle Maturity Spectrum Explorer (Immature, Nearly Mature, Ready for Harvest)
 * - PhilRice scientific guidance & research credentials
 * - Accessible, responsive, high-contrast authentication form
 * - Show/Hide password toggle & quick demo credential support for evaluators
 */

import React, { useState, useEffect } from 'react'
import {
  Leaf,
  Mail,
  Lock,
  User,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sprout,
  Info,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type AuthMode = 'signin' | 'signup'

interface MaturityStage {
  id: string
  name: string
  nameTagalog: string
  daysToHarvest: string
  grainColor: string
  colorHex: string
  accentColor: string
  goldenRatio: string
  philRiceRule: string
  actionAdvice: string
}

const MATURITY_STAGES: MaturityStage[] = [
  {
    id: 'immature',
    name: 'Immature Stage',
    nameTagalog: 'Hilaw Pa',
    daysToHarvest: '14 – 21 days',
    grainColor: 'Predominantly Green (Milky/Dough Phase)',
    colorHex: '#10b981',
    accentColor: 'rgba(16, 185, 129, 0.18)',
    goldenRatio: '< 40% straw yellow',
    philRiceRule: 'Maintain 3–5cm standing water in the paddy field.',
    actionAdvice: 'Grain dry matter is still filling. Do not harvest; premature cutting causes high percentage of chalky and broken grains during milling.',
  },
  {
    id: 'nearly-mature',
    name: 'Nearly Mature',
    nameTagalog: 'Malapit Nang Anihin',
    daysToHarvest: '5 – 7 days',
    grainColor: 'Golden-Green Transition (Firm Dough)',
    colorHex: '#f59e0b',
    accentColor: 'rgba(245, 158, 11, 0.18)',
    goldenRatio: '60% – 80% straw yellow',
    philRiceRule: 'Drain the paddy field 7 to 10 days before target harvest.',
    actionAdvice: 'Drain standing water to allow uniform ripening and harden the soil for sickling or mechanical reaper operations. Prepare thresher and drying facilities.',
  },
  {
    id: 'ready',
    name: 'Ready for Harvest',
    nameTagalog: 'Handa Nang Anihin',
    daysToHarvest: 'Optimal Window: Now',
    grainColor: 'Straw-Golden Panicles (Hard Grains)',
    colorHex: '#22c55e',
    accentColor: 'rgba(34, 197, 94, 0.22)',
    goldenRatio: '80% – 85% golden grains',
    philRiceRule: 'Peak PhilRice harvest maturity benchmark reached.',
    actionAdvice: 'Harvest immediately! Grains have attained maximum weight and peak milling recovery. Delaying harvest leads to severe shattering, bird damage, and grain fissuring.',
  },
]

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [activeStageIndex, setActiveStageIndex] = useState<number>(2) // default to 'Ready for Harvest'

  // Auto-cycle through maturity stages every 7 seconds if user hasn't manually interacted recently
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStageIndex((prev) => (prev + 1) % MATURITY_STAGES.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true)
    } else {
      setCapsLockOn(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Redirect handled automatically by App.tsx onAuthStateChange
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
          },
        })
        if (error) throw error
        setMessage(
          'Account created successfully! Check your email for verification, then sign in with your credentials.'
        )
        setMode('signin')
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError(null)
    setMessage(null)
  }

  const handleQuickDemo = (role: 'farmer' | 'admin' = 'admin') => {
    if (role === 'admin') {
      setEmail('paddy2@gmail.com')
      setPassword('HarvestTiming2026!')
      if (mode === 'signup') {
        setFullName('Paddy 2 (Admin)')
      }
    } else {
      setEmail('farmer.juan@paddyscan.local')
      setPassword('HarvestTiming2026!')
      if (mode === 'signup') {
        setFullName('Juan dela Cruz')
      }
    }
  }

  const scrollToPortal = () => {
    const el = document.getElementById('auth-portal-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => {
        document.getElementById('auth-email')?.focus()
      }, 350)
    }
  }

  const activeStage = MATURITY_STAGES[activeStageIndex]

  return (
    <div className="auth-canvas">
      {/* ------------------------------------------------------------------ */}
      {/* LEFT: Visually Rich Agricultural Showcase & Field Intelligence     */}
      {/* ------------------------------------------------------------------ */}
      <section className="auth-showcase">
        {/* Background photo & organic atmospheric overlays */}
        <div className="auth-showcase__media" aria-hidden="true">
          <img
            src="/images/paddy-hero.jpg"
            alt="Abra paddy field harvest sunrise"
            className="auth-showcase__image"
          />
          <div className="auth-showcase__gradient-overlay" />
          <div className="auth-showcase__ambient-glow" />
        </div>

        {/* Brand identity header */}
        <div className="auth-showcase__top">
          <div className="auth-brand-badge">
            <div className="auth-brand-badge__icon-wrap">
              <Sprout className="auth-brand-badge__icon" size={20} />
            </div>
            <div className="auth-brand-badge__meta">
              <span className="auth-brand-badge__name">PaddyScan AI</span>
              <span className="auth-brand-badge__sub">PhilRice-Aligned Panicle Vision</span>
            </div>
          </div>
          <div className="auth-showcase__top-actions">
            <div className="auth-thesis-chip">
              <span className="auth-thesis-chip__pulse" />
              <span>Abra Rice Harvest Thesis Study</span>
            </div>
            <button
              type="button"
              onClick={scrollToPortal}
              className="auth-showcase-jump-btn"
              title="Jump directly to login form"
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          </div>
        </div>

        {/* Hero Headline & Problem Statement */}
        <div className="auth-showcase__core">
          <h1 className="auth-showcase__title">
            Time your harvest with <span className="auth-highlight">scientific precision</span>.
          </h1>
          <p className="auth-showcase__desc">
            Empowering Filipino rice farmers with Roboflow panicle detection and HSV chromatic analysis. 
            Identify the precise 80–85% golden maturity window to maximize milling recovery and prevent grain shattering.
          </p>

          {/* Direct Action CTAs */}
          <div className="auth-showcase__cta-row">
            <button
              type="button"
              onClick={() => {
                switchMode('signin')
                scrollToPortal()
              }}
              className="auth-cta-btn auth-cta-btn--primary"
            >
              <LogIn size={17} />
              <span>Sign In to Farmer Portal</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                switchMode('signup')
                scrollToPortal()
              }}
              className="auth-cta-btn auth-cta-btn--outline"
            >
              <UserPlus size={16} />
              <span>Create Account</span>
            </button>
          </div>

          {/* Interactive Panicle Maturity Spectrum Widget */}
          <div className="auth-spectrum-card">
            <div className="auth-spectrum-card__header">
              <div className="auth-spectrum-card__headline">
                <Sparkles size={16} className="auth-spectrum-card__spark" />
                <span>Panicle Ripening Spectrum Explorer</span>
              </div>
              <span className="auth-spectrum-card__hint">Click a stage to inspect</span>
            </div>

            {/* Stage Selector Tabs */}
            <div className="auth-spectrum-tabs" role="tablist">
              {MATURITY_STAGES.map((stage, idx) => {
                const isSelected = idx === activeStageIndex
                return (
                  <button
                    key={stage.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveStageIndex(idx)}
                    className={`auth-spectrum-tab ${isSelected ? 'auth-spectrum-tab--active' : ''}`}
                    style={{
                      '--stage-accent': stage.colorHex,
                    } as React.CSSProperties}
                  >
                    <span
                      className="auth-spectrum-tab__dot"
                      style={{ backgroundColor: stage.colorHex }}
                    />
                    <span className="auth-spectrum-tab__label">{stage.name}</span>
                    <span className="auth-spectrum-tab__tagalog">{stage.nameTagalog}</span>
                  </button>
                )
              })}
            </div>

            {/* Active Stage Deep-Dive Details */}
            <div className="auth-stage-detail" style={{ borderColor: activeStage.colorHex }}>
              <div className="auth-stage-detail__top">
                <div className="auth-stage-detail__badge" style={{ backgroundColor: activeStage.accentColor, color: activeStage.colorHex }}>
                  <strong>{activeStage.name}</strong> • <em>{activeStage.nameTagalog}</em>
                </div>
                <div className="auth-stage-detail__window">
                  <span>Harvest Window:</span>
                  <strong>{activeStage.daysToHarvest}</strong>
                </div>
              </div>

              <div className="auth-stage-detail__meter">
                <div className="auth-stage-detail__meter-track">
                  <div
                    className="auth-stage-detail__meter-fill"
                    style={{
                      width: activeStageIndex === 0 ? '25%' : activeStageIndex === 1 ? '65%' : '100%',
                      backgroundColor: activeStage.colorHex,
                    }}
                  />
                </div>
                <div className="auth-stage-detail__meter-label">
                  <span>Maturity Ratio: {activeStage.goldenRatio}</span>
                  <span>{activeStage.grainColor}</span>
                </div>
              </div>

              <div className="auth-stage-detail__advice">
                <div className="auth-stage-detail__advice-icon">
                  <Info size={16} />
                </div>
                <div className="auth-stage-detail__advice-text">
                  <strong>PhilRice Rule:</strong> {activeStage.philRiceRule} {activeStage.actionAdvice}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Research Proof Strip */}
        <div className="auth-showcase__footer">
          <div className="auth-proof-item">
            <span className="auth-proof-item__value">5 Municipalities</span>
            <span className="auth-proof-item__label">Bangued, Bucay, Dolores, Pidigan, Tayum</span>
          </div>
          <div className="auth-proof-divider" />
          <div className="auth-proof-item">
            <span className="auth-proof-item__value">HSV + Roboflow</span>
            <span className="auth-proof-item__label">Grain chromatic segmentation</span>
          </div>
          <div className="auth-proof-divider" />
          <div className="auth-proof-item">
            <span className="auth-proof-item__value">Zero Guesswork</span>
            <span className="auth-proof-item__label">Field actionable harvest alerts</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* RIGHT: High-Craft, Accessible Authentication Portal                */}
      {/* ------------------------------------------------------------------ */}
      <section id="auth-portal-section" className="auth-portal">
        <div className="auth-portal__container">
          {/* Mobile brand header (visible only on small screens) */}
          <div className="auth-portal__mobile-brand">
            <div className="auth-brand-badge">
              <div className="auth-brand-badge__icon-wrap">
                <Leaf className="auth-brand-badge__icon" size={18} />
              </div>
              <div className="auth-brand-badge__meta">
                <span className="auth-brand-badge__name">PaddyScan</span>
                <span className="auth-brand-badge__sub">Rice Harvest AI</span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="auth-card-modern">
            {/* Segmented Mode Switcher */}
            <div className="auth-mode-switch" role="tablist" aria-label="Sign in or Sign up">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                className={`auth-mode-switch__btn ${mode === 'signin' ? 'auth-mode-switch__btn--active' : ''}`}
                onClick={() => switchMode('signin')}
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={`auth-mode-switch__btn ${mode === 'signup' ? 'auth-mode-switch__btn--active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                <UserPlus size={16} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Portal Card Header */}
            <div className="auth-card-modern__header">
              <h2 className="auth-card-modern__title">
                {mode === 'signin' ? 'Welcome to PaddyScan' : 'Create farmer account'}
              </h2>
              <p className="auth-card-modern__subtitle">
                {mode === 'signin'
                  ? 'Access your panicle scans, historical maturity logs, and farm analytics.'
                  : 'Start timing your rice harvest with AI vision diagnostic models.'}
              </p>
            </div>

            {/* Alerts */}
            {message && (
              <div role="status" className="auth-alert auth-alert--success">
                <CheckCircle2 size={18} className="auth-alert__icon" />
                <div className="auth-alert__text">{message}</div>
              </div>
            )}

            {error && (
              <div role="alert" className="auth-alert auth-alert--error">
                <AlertCircle size={18} className="auth-alert__icon" />
                <div className="auth-alert__text">{error}</div>
              </div>
            )}

            {capsLockOn && (
              <div className="auth-alert auth-alert--warning" role="alert">
                <Info size={16} className="auth-alert__icon" />
                <div className="auth-alert__text">Caps Lock is ON</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="auth-form" onKeyDown={handleKeyDown}>
              {/* Full Name (Sign Up only) */}
              {mode === 'signup' && (
                <div className="auth-group">
                  <label htmlFor="auth-fullname" className="auth-label">
                    Full Name
                  </label>
                  <div className="auth-input-wrap">
                    <User size={18} className="auth-input-icon" />
                    <input
                      id="auth-fullname"
                      type="text"
                      autoComplete="name"
                      className="auth-input"
                      placeholder="e.g. Juan dela Cruz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="auth-group">
                <label htmlFor="auth-email" className="auth-label">
                  Email Address
                </label>
                <div className="auth-input-wrap">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete={mode === 'signin' ? 'email' : 'username'}
                    className="auth-input"
                    placeholder="juan@agri.ph or farmer@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-group">
                <div className="auth-group__top">
                  <label htmlFor="auth-password" className="auth-label">
                    Password
                  </label>
                  {mode === 'signup' && (
                    <span className="auth-group__hint">Min. 8 characters</span>
                  )}
                </div>
                <div className="auth-input-wrap">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    className="auth-input auth-input--with-action"
                    placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === 'signup' ? 8 : 1}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-input-action"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                id={mode === 'signin' ? 'btn-signin' : 'btn-signup'}
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="auth-submit-btn__loading">
                    <span className="auth-submit-spinner" />
                    <span>{mode === 'signin' ? 'Verifying credentials…' : 'Setting up account…'}</span>
                  </span>
                ) : (
                  <span className="auth-submit-btn__label">
                    <span>{mode === 'signin' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                    <ArrowRight size={18} className="auth-submit-btn__arrow" />
                  </span>
                )}
              </button>
            </form>

            {/* Quick Demo Helper (Especially valuable for Thesis defense & panel testing) */}
            <div className="auth-demo-assist">
              <div className="auth-demo-assist__inner">
                <div className="auth-demo-assist__text">
                  <ShieldCheck size={16} className="auth-demo-assist__icon" />
                  <span>Thesis Evaluator Demo:</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin')}
                    className="auth-demo-assist__btn"
                    title="Sign in with Administrator credentials"
                  >
                    Fill Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('farmer')}
                    className="auth-demo-assist__btn"
                    style={{ background: 'var(--clr-gray-100)', color: 'var(--clr-gray-800)', borderColor: 'var(--clr-gray-300)' }}
                    title="Sign in with Farmer credentials"
                  >
                    Fill Farmer
                  </button>
                </div>
              </div>
            </div>

            {/* Switch Mode Prompt */}
            <div className="auth-card-modern__footer">
              <p>
                {mode === 'signin' ? "Don't have an account yet?" : 'Already registered with PaddyScan?'}
                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                >
                  {mode === 'signin' ? 'Register now' : 'Sign in here'}
                  <ChevronRight size={14} />
                </button>
              </p>
            </div>
          </div>

          {/* Trust Footnote */}
          <div className="auth-portal__trust">
            <div className="auth-trust-badge">
              <ShieldCheck size={14} />
              <span>PhilRice Harvest Index Aligned</span>
            </div>
            <span className="auth-trust-dot">•</span>
            <span>Abra Rice Research 2026</span>
          </div>
        </div>
      </section>
    </div>
  )
}
