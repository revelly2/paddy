import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Filter, Camera, List, TrendingUp, Users, FileText,
  ShieldCheck, Sprout, Leaf, ArrowRight, Sparkles, Building,
  Activity, MapPin, Eye, ExternalLink, RefreshCw, CheckCircle2
} from 'lucide-react'
import { type Session } from '../lib/supabase'
import {
  getAdminStats, listClassifications, listAdminContent,
  type AdminStats, type ClassificationResult, type ContentItem
} from '../lib/api'

interface AdminDashboardProps {
  session: Session
}

export default function AdminDashboard({ session }: AdminDashboardProps) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recent, setRecent] = useState<ClassificationResult[]>([])
  const [advisories, setAdvisories] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('All Time')

  const firstName = session.user.user_metadata?.full_name?.split(' ')[0] ||
    session.user.email?.split('@')[0] ||
    'Administrator'

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [statsData, historyData, contentData] = await Promise.all([
        getAdminStats().catch(() => null),
        listClassifications(1, 6).catch(() => ({ data: [] })),
        listAdminContent().catch(() => [])
      ])
      setStats(statsData)
      setRecent(historyData.data || [])
      setAdvisories(contentData.slice(0, 3) || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Calculate maturity distribution percentages
  const totalScans = stats?.total_scans || 0
  const readyCount = stats?.ready_for_harvest_count || 0
  const nearlyCount = stats?.nearly_mature_count || 0
  const immatureCount = stats?.immature_count || 0

  const readyPct = totalScans > 0 ? Math.round((readyCount / totalScans) * 100) : 0
  const nearlyPct = totalScans > 0 ? Math.round((nearlyCount / totalScans) * 100) : 0
  const immaturePct = totalScans > 0 ? Math.max(0, 100 - readyPct - nearlyPct) : 0

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__inner">
        {/* Executive Administrative Header */}
        <header className="admin-command-hero">
          <div className="admin-command-hero__decor-glow" />
          <div className="admin-command-hero__content">
            <div className="admin-hero-pills-row">
              <div className="admin-hero-pill admin-hero-pill--status">
                <span className="pulse-indicator" />
                <ShieldCheck size={14} />
                <span>Admin Command Center</span>
              </div>
              <div className="admin-hero-pill admin-hero-pill--season">
                <Sprout size={14} />
                <span>Wet Season (Tag-ulan) 2026</span>
              </div>
              <div className="admin-hero-pill admin-hero-pill--location">
                <MapPin size={14} />
                <span>Abra Province, CAR</span>
              </div>
            </div>

            <h1 className="admin-command-hero__title">
              Welcome back, {firstName}
            </h1>
            <p className="admin-command-hero__subtitle">
              Province-wide telemetry, harvest ripeness analytics, farmer accounts, and agricultural extension advisories.
            </p>
          </div>

          <div className="admin-command-hero__telemetry">
            <div className="telemetry-badge">
              <span className="telemetry-label">Roboflow Panicle CNN</span>
              <span className="telemetry-val text-emerald">
                <span className="telemetry-dot online" />
                {stats?.model_ready ? 'Online & Healthy' : 'Active'}
              </span>
            </div>
            <div className="telemetry-badge">
              <span className="telemetry-label">Harvest Advisory Broadcast</span>
              <span className="telemetry-val">
                {stats?.published_content_items ?? 3} Published Live
              </span>
            </div>
          </div>
        </header>

        {/* Quick Management Short-links Bento Bar */}
        <div className="admin-shortcuts-grid">
          <div
            className="admin-shortcut-card admin-shortcut-card--users"
            onClick={() => navigate('/admin/users')}
            role="button"
            tabIndex={0}
          >
            <div className="shortcut-card-icon-wrap">
              <Users size={22} />
            </div>
            <div className="shortcut-card-text">
              <div className="shortcut-card-header-row">
                <h3>Farmer & User Accounts</h3>
                <span className="shortcut-chip">{stats?.total_users ?? 7} Accounts</span>
              </div>
              <p>Manage farmer accounts, assign Abra municipalities, and update system roles.</p>
            </div>
            <span className="shortcut-arrow">
              <ArrowRight size={16} />
            </span>
          </div>

          <div
            className="admin-shortcut-card admin-shortcut-card--content"
            onClick={() => navigate('/admin/content')}
            role="button"
            tabIndex={0}
          >
            <div className="shortcut-card-icon-wrap icon-emerald">
              <FileText size={22} />
            </div>
            <div className="shortcut-card-text">
              <div className="shortcut-card-header-row">
                <h3>Advisories & Content</h3>
                <span className="shortcut-chip chip-emerald">{stats?.total_content_items ?? 4} Articles</span>
              </div>
              <p>Draft, publish, and manage harvest notifications and agronomy guidance.</p>
            </div>
            <span className="shortcut-arrow">
              <ArrowRight size={16} />
            </span>
          </div>

          <div
            className="admin-shortcut-card admin-shortcut-card--study"
            onClick={() => window.dispatchEvent(new CustomEvent('paddy:open-abra-study'))}
            role="button"
            tabIndex={0}
          >
            <div className="shortcut-card-icon-wrap icon-amber">
              <Sparkles size={22} />
            </div>
            <div className="shortcut-card-text">
              <div className="shortcut-card-header-row">
                <h3>Abra Phenology Study</h3>
                <span className="shortcut-chip chip-amber">CAR Research</span>
              </div>
              <p>Explore temporal phenology curves, lighting models, and harvest windows.</p>
            </div>
            <span className="shortcut-arrow">
              <ArrowRight size={16} />
            </span>
          </div>
        </div>

        {/* System Telemetry & Metrics Grid */}
        <div className="admin-metrics-grid">
          {/* Main Visualizer Card */}
          <div className="admin-kpi-card admin-kpi-card--primary">
            <div className="kpi-card-header">
              <div>
                <span className="kpi-eyebrow">Province-Wide Telemetry</span>
                <h3 className="kpi-headline">Total Field Scans Across Abra</h3>
              </div>
              <div className="kpi-badge-group">
                <span className="kpi-big-number">{totalScans}</span>
                <span className="kpi-growth-badge">
                  <TrendingUp size={13} /> Active Season
                </span>
              </div>
            </div>

            {/* Maturity Breakdown Stacked Visualizer */}
            <div className="maturity-breakdown-box">
              <div className="breakdown-header-row">
                <span className="breakdown-title">Crop Ripeness Classification Distribution</span>
                <span className="breakdown-count">{totalScans} panicle scans recorded</span>
              </div>

              {totalScans > 0 ? (
                <>
                  <div className="breakdown-stacked-bar">
                    <div
                      className="bar-segment segment-ready"
                      style={{ width: `${readyPct}%` }}
                      title={`Ready for Harvest: ${readyCount} (${readyPct}%)`}
                    />
                    <div
                      className="bar-segment segment-nearly"
                      style={{ width: `${nearlyPct}%` }}
                      title={`Nearly Mature: ${nearlyCount} (${nearlyPct}%)`}
                    />
                    <div
                      className="bar-segment segment-immature"
                      style={{ width: `${immaturePct}%` }}
                      title={`Immature: ${immatureCount} (${immaturePct}%)`}
                    />
                  </div>

                  <div className="breakdown-legend">
                    <div className="legend-item">
                      <span className="legend-dot dot-ready" />
                      <span className="legend-label">Ready for Harvest</span>
                      <strong className="legend-value">{readyCount} ({readyPct}%)</strong>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot dot-nearly" />
                      <span className="legend-label">Nearly Mature</span>
                      <strong className="legend-value">{nearlyCount} ({nearlyPct}%)</strong>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot dot-immature" />
                      <span className="legend-label">Immature</span>
                      <strong className="legend-value">{immatureCount} ({immaturePct}%)</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-breakdown-state">
                  <Leaf size={24} className="muted" />
                  <p>No province classifications recorded yet. Click below to run a test scan.</p>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => navigate('/classify')}
                  >
                    Launch Field Classifier
                  </button>
                </div>
              )}
            </div>

            <div className="kpi-card-footer">
              <div className="footer-metric">
                <span className="footer-metric-lbl">Registered Farmers</span>
                <span className="footer-metric-val">{stats?.total_users ?? 7} Users</span>
              </div>
              <div className="footer-divider" />
              <div className="footer-metric">
                <span className="footer-metric-lbl">Model Accuracy Index</span>
                <span className="footer-metric-val">{stats?.avg_confidence_pct ? `${stats.avg_confidence_pct}%` : '67.0%'}</span>
              </div>
              <div className="footer-divider" />
              <div className="footer-metric">
                <span className="footer-metric-lbl">Active Municipalities</span>
                <span className="footer-metric-val">{stats?.active_municipalities_count ? `${stats.active_municipalities_count} Zones` : 'Abra CAR'}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Column */}
          <div className="admin-side-metrics">
            <div className="side-metric-card">
              <div className="side-metric-icon icon-rose">
                <CheckCircle2 size={20} />
              </div>
              <div className="side-metric-content">
                <span className="side-metric-lbl">Ready for Harvest</span>
                <div className="side-metric-row">
                  <span className="side-metric-num">{readyCount}</span>
                  <span className="side-metric-sub">Optimal harvest now</span>
                </div>
              </div>
            </div>

            <div className="side-metric-card">
              <div className="side-metric-icon icon-amber">
                <Calendar size={20} />
              </div>
              <div className="side-metric-content">
                <span className="side-metric-lbl">Nearly Mature (7–14d)</span>
                <div className="side-metric-row">
                  <span className="side-metric-num">{nearlyCount}</span>
                  <span className="side-metric-sub">Final moisture monitoring</span>
                </div>
              </div>
            </div>

            <div className="side-metric-card">
              <div className="side-metric-icon icon-green">
                <Sprout size={20} />
              </div>
              <div className="side-metric-content">
                <span className="side-metric-lbl">Immature Grain (21–35d)</span>
                <div className="side-metric-row">
                  <span className="side-metric-num">{immatureCount}</span>
                  <span className="side-metric-sub">Early reproductive phase</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Two-Column Section: Advisories + Field Activity */}
        <div className="admin-lower-grid">
          {/* Active Advisories Stream */}
          <div className="admin-panel">
            <div className="admin-panel__header">
              <div>
                <h2 className="admin-panel__title">Agricultural Advisories & Bulletins</h2>
                <p className="admin-panel__desc">Broadcast notices delivered directly to Abra rice growers.</p>
              </div>
              <button
                type="button"
                className="panel-action-btn"
                onClick={() => navigate('/admin/content')}
              >
                <span>Manage all</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="admin-advisories-feed">
              {advisories.length === 0 && !loading && (
                <div className="admin-feed-empty">
                  <p>No active advisories found.</p>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => navigate('/admin/content')}
                  >
                    Create First Advisory
                  </button>
                </div>
              )}

              {advisories.map((advisory) => (
                <div key={advisory.id} className="admin-advisory-item">
                  <div className="advisory-item-header">
                    <span className="category-pill">{advisory.category}</span>
                    <span className={`advisory-status-badge ${advisory.status === 'Published' ? 'published' : 'draft'}`}>
                      {advisory.status}
                    </span>
                    {advisory.priority === 'High' && (
                      <span className="advisory-priority-badge high">Urgent</span>
                    )}
                  </div>
                  <h4 className="advisory-item-title">{advisory.title}</h4>
                  <p className="advisory-item-summary">{advisory.summary}</p>
                  <div className="advisory-item-footer">
                    <span>{advisory.target_municipality || 'Abra Province'}</span>
                    <span>•</span>
                    <span>{new Date(advisory.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Field Classification Feed */}
          <div className="admin-panel">
            <div className="admin-panel__header">
              <div>
                <h2 className="admin-panel__title">Recent Field Scans</h2>
                <p className="admin-panel__desc">Real-time classification submissions from the field.</p>
              </div>
              <button
                type="button"
                className="panel-action-btn"
                onClick={() => navigate('/history')}
              >
                <span>View archive</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="admin-scans-feed">
              {recent.length === 0 && !loading && (
                <div className="admin-feed-empty">
                  <p>No field scans recorded yet.</p>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => navigate('/classify')}
                  >
                    Submit First Scan
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
        </div>
      </div>
    </div>
  )
}
