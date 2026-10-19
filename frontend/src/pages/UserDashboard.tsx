import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, List, Leaf, Sprout, ArrowRight, ExternalLink, Clock, ShieldCheck, Sparkles, MapPin, BarChart3 } from 'lucide-react'
import { type Session } from '../lib/supabase'
import { getUserStats, listClassifications, getAgNews, type StatsResponse, type ClassificationResult, type NewsItem } from '../lib/api'
import RiceFieldHeroVector from '../components/vectors/RiceFieldHeroVector'
import EmptyScansVector from '../components/vectors/EmptyScansVector'

interface UserDashboardProps {
  session: Session
}

export default function UserDashboard({ session }: UserDashboardProps) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [recent, setRecent] = useState<ClassificationResult[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  
  const firstName = session.user.email?.split('@')[0] ?? 'Farmer'

  useEffect(() => {
    Promise.all([
      getUserStats().catch(() => null),
      listClassifications(1, 4).catch(() => ({ data: [] })),
      getAgNews().catch(() => ({ items: [] }))
    ]).then(([statsData, historyData, newsData]) => {
      setStats(statsData)
      setRecent(historyData.data || [])
      setNews(newsData.items.slice(0, 3) || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__inner">
        {/* Modern Elevated Hero Section */}
        <header className="modern-hero-card">
          <div className="modern-hero-content">
            <div className="modern-hero-pill">
              <span className="modern-hero-pulse" />
              <Sprout size={14} className="modern-hero-pill-icon" />
              <span>Abra Rice Research Advisory</span>
            </div>
            <h1 className="modern-hero-title">Good day, {firstName}</h1>
            <p className="modern-hero-subtitle">
              Monitor your paddy fields, identify maturity stages, and harvest at peak yield with AI.
            </p>

            <div className="modern-hero-meta-strip">
              <div className="hero-meta-item">
                <Clock size={14} />
                <span>{new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', weekday: 'short' })}</span>
              </div>
              <div className="hero-meta-divider" />
              <div className="hero-meta-item">
                <ShieldCheck size={14} />
                <span>Panicle CNN Active</span>
              </div>
              <div className="hero-meta-divider" />
              <div className="hero-meta-item">
                <MapPin size={14} />
                <span>Abra Province</span>
              </div>
            </div>
          </div>

          <div className="modern-hero-illustration">
            <RiceFieldHeroVector width="100%" height={160} />
          </div>
        </header>

        {/* Quick Action Bento Cards */}
        <div className="bento-action-grid">
          <div
            className="bento-card bento-card--primary"
            onClick={() => navigate('/classify')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/classify')}
          >
            <div className="bento-card-bg-glow" />
            <div className="bento-card-header">
              <div className="bento-icon-wrapper bento-icon-wrapper--green">
                <Camera size={24} />
              </div>
              <span className="bento-action-badge">New Scan</span>
            </div>
            <div className="bento-card-body">
              <h3 className="bento-card-title">Classify Crop Maturity</h3>
              <p className="bento-card-desc">
                Upload or capture a photo of your rice panicles to calculate optimal harvest timing and maturity class.
              </p>
            </div>
            <div className="bento-card-footer">
              <span className="bento-cta-link">
                Launch Classifier <ArrowRight size={16} />
              </span>
            </div>
          </div>

          <div
            className="bento-card bento-card--secondary"
            onClick={() => navigate('/history')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/history')}
          >
            <div className="bento-card-header">
              <div className="bento-icon-wrapper bento-icon-wrapper--amber">
                <List size={24} />
              </div>
              <span className="bento-stat-chip">
                {stats?.total_scans ? `${stats.total_scans} Total` : 'Archive'}
              </span>
            </div>
            <div className="bento-card-body">
              <h3 className="bento-card-title">Field Scan History</h3>
              <p className="bento-card-desc">
                Review past classifications, confidence ratings, panicle counts, and export harvest documentation.
              </p>
            </div>
            <div className="bento-card-footer">
              <span className="bento-cta-link">
                View Records <ArrowRight size={16} />
              </span>
            </div>
          </div>

          <div
            className="bento-card bento-card--tertiary"
            onClick={() => window.dispatchEvent(new CustomEvent('paddy:open-abra-study'))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && window.dispatchEvent(new CustomEvent('paddy:open-abra-study'))}
          >
            <div className="bento-card-header">
              <div className="bento-icon-wrapper bento-icon-wrapper--emerald">
                <BarChart3 size={24} />
              </div>
              <span className="bento-stat-chip" style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac' }}>
                Abra CAR Study
              </span>
            </div>
            <div className="bento-card-body">
              <h3 className="bento-card-title">Abra Harvest Study</h3>
              <p className="bento-card-desc">
                Temporal phenology, month/day/lighting breakdown, harvest windows, and Abra municipal field research.
              </p>
            </div>
            <div className="bento-card-footer">
              <span className="bento-cta-link" style={{ color: '#16a34a' }}>
                Explore Study Analytics <ArrowRight size={16} />
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Recent Scans + Agriculture Intelligence */}
        <div className="dashboard-content-grid">
          {/* Recent Scans Panel */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <div className="panel-header-title-group">
                <h2 className="panel-title">Recent Field Scans</h2>
                <span className="panel-badge-count">{recent.length}</span>
              </div>
              {recent.length > 0 && (
                <button
                  type="button"
                  className="panel-text-btn"
                  onClick={() => navigate('/history')}
                >
                  View all
                </button>
              )}
            </div>

            <div className="recent-scans-list">
              {recent.length === 0 && !loading && (
                <div className="empty-state-panel">
                  <EmptyScansVector width={80} height={80} />
                  <p className="empty-state-panel__title">No scans recorded yet</p>
                  <p className="empty-state-panel__desc">
                    Take your first field photo to start tracking grain maturity.
                  </p>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => navigate('/classify')}
                  >
                    Start First Scan
                  </button>
                </div>
              )}

              {recent.map((scan) => {
                const isReady = scan.label === 'Ready for Harvest'
                const isNearly = scan.label === 'Nearly Mature'
                const badgeClass = isReady
                  ? 'badge--ready'
                  : isNearly
                  ? 'badge--nearly'
                  : 'badge--immature'

                return (
                  <div key={scan.id} className="recent-scan-item" onClick={() => navigate('/history')}>
                    <div className="recent-scan-thumb">
                      {scan.image_url ? (
                        <img src={scan.image_url} alt="Scan preview" />
                      ) : (
                        <div className="recent-scan-placeholder">
                          <Leaf size={16} />
                        </div>
                      )}
                    </div>
                    <div className="recent-scan-info">
                      <div className="recent-scan-primary">
                        <span className={`status-badge ${badgeClass}`}>
                          <span className="status-badge-dot" />
                          {scan.label}
                        </span>
                        <span className="recent-scan-confidence">
                          {(scan.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="recent-scan-meta">
                        <span>{new Date(scan.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {scan.location && (
                          <>
                            <span className="meta-dot" />
                            <span className="recent-scan-location">{scan.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Farming News & Agri Tips */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <div className="panel-header-title-group">
                <h2 className="panel-title">Agri News & Guidance</h2>
                <span className="panel-badge-pill">Live Updates</span>
              </div>
            </div>

            <div className="agri-news-list">
              {news.length === 0 && !loading && (
                <div className="empty-state-panel">
                  <p className="empty-state-panel__desc">No news articles found at this time.</p>
                </div>
              )}

              {news.map((item, idx) => (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={idx}
                  className="modern-news-card"
                >
                  <div className="news-card-body">
                    <div className="news-card-meta">
                      <span className="news-card-tag">Agronomy</span>
                      {item.pubDate && !isNaN(Date.parse(item.pubDate)) && (
                        <span className="news-card-date">
                          {new Date(item.pubDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h4 className="news-card-title">{item.title}</h4>
                    <span className="news-card-read-more">
                      Read report <ExternalLink size={13} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
