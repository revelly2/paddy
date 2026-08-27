/**
 * HomePage.tsx
 * ------------
 * Landing / dashboard page shown after login.
 *
 * Sections
 * --------
 * 1. Hero  — greeting + quick-action CTA
 * 2. Stats — aggregate scan statistics
 * 3. How it works — 3-step explainer cards
 * 4. About the maturity classes — visual guide
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, History, Leaf, BarChart2, Zap, Clock } from 'lucide-react'
import { type Session } from '../lib/supabase'
import { getUserStats, type StatsResponse } from '../lib/api'

interface HomePageProps {
  session: Session
}

const HOW_IT_WORKS = [
  {
    step:  '01',
    icon:  <Camera size={28} />,
    title: 'Take a Photo',
    text:  'Photograph your paddy rice field with any smartphone or digital camera.',
  },
  {
    step:  '02',
    icon:  <Zap size={28} />,
    title: 'Upload & Analyse',
    text:  'Upload the image to PaddyScan. Our CNN analyses it in seconds.',
  },
  {
    step:  '03',
    icon:  <Leaf size={28} />,
    title: 'Get Your Answer',
    text:  'Receive a clear maturity result with tailored harvest advice.',
  },
]

const MATURITY_CLASSES = [
  {
    emoji:   '🌱',
    label:   'Immature',
    color:   '#15803d',
    bg:      '#dcfce7',
    border:  '#86efac',
    advice:  'Wait 2–3 more weeks. Harvesting now causes high grain breakage.',
  },
  {
    emoji:   '🌾',
    label:   'Nearly Mature',
    color:   '#b45309',
    bg:      '#fef3c7',
    border:  '#fcd34d',
    advice:  'Harvest within 7–10 days. Prepare your equipment and monitor daily.',
  },
  {
    emoji:   '🏆',
    label:   'Ready for Harvest',
    color:   '#b91c1c',
    bg:      '#fee2e2',
    border:  '#fca5a5',
    advice:  'Harvest immediately! Grain moisture ≈ 20–25% — optimal milling quality.',
  },
]

export default function HomePage({ session }: HomePageProps) {
  const navigate = useNavigate()
  const [stats,        setStats]        = useState<StatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const firstName = session.user.email?.split('@')[0] ?? 'Farmer'

  useEffect(() => {
    getUserStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [])

  return (
    <div className="page home-page">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__content">
          <div className="hero__badge">
            <Leaf size={14} />
            AI-Powered Harvest Timing
          </div>
          <h1 className="hero__title">
            Welcome back,<br />
            <span className="hero__name">{firstName}</span> 👨‍🌾
          </h1>
          <p className="hero__subtitle">
            Upload a paddy rice photo and know exactly when to harvest — no guesswork,
            no wasted grain.
          </p>
          <div className="hero__actions">
            <button
              id="btn-start-classifying"
              className="btn btn--primary btn--lg"
              onClick={() => navigate('/classify')}
            >
              <Camera size={20} />
              Classify Now
            </button>
            <button
              id="btn-view-history"
              className="btn btn--ghost btn--lg"
              onClick={() => navigate('/history')}
            >
              <History size={20} />
              View History
            </button>
          </div>
        </div>
        <div className="hero__visual" aria-hidden="true">
          <div className="hero__rice-icon">🌾</div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      {(stats || statsLoading) && (
        <section className="stats-section">
          <h2 className="section-title">
            <BarChart2 size={20} /> Your Farm Summary
          </h2>
          <div className="stats-grid">
            <StatCard
              loading={statsLoading}
              value={stats?.total_scans ?? 0}
              label="Total Scans"
              icon="🔬"
            />
            <StatCard
              loading={statsLoading}
              value={stats?.ready_for_harvest ?? 0}
              label="Ready for Harvest"
              icon="🏆"
              highlight
            />
            <StatCard
              loading={statsLoading}
              value={stats?.nearly_mature ?? 0}
              label="Nearly Mature"
              icon="🌾"
            />
            <StatCard
              loading={statsLoading}
              value={`${stats?.avg_confidence_pct ?? 0}%`}
              label="Avg. Confidence"
              icon="🎯"
            />
          </div>
          {stats?.last_scan_at && (
            <p className="stats-section__last">
              <Clock size={13} />
              Last scan: {new Date(stats.last_scan_at).toLocaleString('en-PH')}
            </p>
          )}
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="how-section">
        <h2 className="section-title">How It Works</h2>
        <div className="how-grid">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="how-card">
              <div className="how-card__step">{step.step}</div>
              <div className="how-card__icon">{step.icon}</div>
              <h3 className="how-card__title">{step.title}</h3>
              <p className="how-card__text">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Maturity classes guide ───────────────────────────────── */}
      <section className="classes-section">
        <h2 className="section-title">Maturity Stages Explained</h2>
        <div className="classes-grid">
          {MATURITY_CLASSES.map((cls) => (
            <div
              key={cls.label}
              className="class-card"
              style={{
                borderColor: cls.border,
                background:  `linear-gradient(135deg, ${cls.bg} 0%, #fff 100%)`,
              }}
            >
              <span className="class-card__emoji">{cls.emoji}</span>
              <h3
                className="class-card__label"
                style={{ color: cls.color }}
              >
                {cls.label}
              </h3>
              <p className="class-card__advice">{cls.advice}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ─── Internal StatCard ───────────────────────────────────────────────────────
interface StatCardProps {
  loading:    boolean
  value:      number | string
  label:      string
  icon:       string
  highlight?: boolean
}

function StatCard({ loading, value, label, icon, highlight }: StatCardProps) {
  return (
    <div className={`stat-card ${highlight ? 'stat-card--highlight' : ''}`}>
      <span className="stat-card__icon">{icon}</span>
      {loading
        ? <div className="skeleton-block skeleton-block--value" />
        : <span className="stat-card__value">{value}</span>
      }
      <span className="stat-card__label">{label}</span>
    </div>
  )
}
