import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Filter, Camera, List, TrendingUp, MoreVertical, Leaf } from 'lucide-react'
import { type Session } from '../lib/supabase'
import { getUserStats, listClassifications, type StatsResponse, type ClassificationResult } from '../lib/api'

interface HomePageProps {
  session: Session
}

export default function HomePage({ session }: HomePageProps) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [recent, setRecent] = useState<ClassificationResult[]>([])
  const [loading, setLoading] = useState(true)
  
  const firstName = session.user.email?.split('@')[0] ?? 'Farmer'

  useEffect(() => {
    Promise.all([
      getUserStats().catch(() => null),
      listClassifications(1, 5).catch(() => ({ data: [] }))
    ]).then(([statsData, historyData]) => {
      setStats(statsData)
      setRecent(historyData.data || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__inner">
        {/* Header Section */}
        <header className="dashboard-header-modern">
          <h1 className="dashboard-title-modern">Welcome back, {firstName}</h1>
        </header>

        {/* Filter Bar */}
        <div className="dashboard-filters">
          <div className="tabs">
            <button className="tab">12 months</button>
            <button className="tab active">30 days</button>
            <button className="tab">7 days</button>
            <button className="tab">24 hours</button>
          </div>
          <div className="filter-actions">
            <button className="filter-btn">
              <Calendar size={16} className="muted" />
              This Season
            </button>
            <button className="filter-btn">
              <Filter size={16} className="muted" />
              Filters
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          {/* Main Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-label">Total Scans</span>
              <div className="chart-value-row">
                <span className="chart-value">{stats?.total_scans ?? 0}</span>
                <span className="trend up"><TrendingUp size={14} /> +12%</span>
              </div>
            </div>
            {/* SVG placeholder for exactly matching the line chart */}
            <div className="chart-area">
              <svg viewBox="0 0 500 150" className="chart-svg" preserveAspectRatio="none">
                <path d="M0,100 L50,95 L100,90 L150,85 L200,95 L250,85 L300,90 L350,55 L400,45 L450,55 L500,40" fill="none" stroke="var(--clr-primary-600)" strokeWidth="2.5" />
                <path d="M0,100 L50,95 L100,90 L150,85 L200,95 L250,85 L300,90 L350,55 L400,45 L450,55 L500,40 L500,150 L0,150 Z" fill="url(#chart-gradient)" />
                <defs>
                  <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--clr-primary-100)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--clr-primary-50)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="chart-x-axis">
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
              </div>
            </div>
          </div>

          {/* Right Side Stats */}
          <div className="side-stats">
            <div className="side-stat">
              <span className="side-stat-label">Ready for Harvest</span>
              <div className="side-stat-val-row">
                <span className="side-stat-val">{stats?.ready_for_harvest ?? 0}</span>
                <span className="trend up"><TrendingUp size={14} /> +5%</span>
              </div>
            </div>
            <div className="side-stat">
              <span className="side-stat-label">Nearly Mature</span>
              <div className="side-stat-val-row">
                <span className="side-stat-val">{stats?.nearly_mature ?? 0}</span>
                <span className="trend up"><TrendingUp size={14} /> +2%</span>
              </div>
            </div>
            <div className="side-stat">
              <span className="side-stat-label">Avg Confidence</span>
              <div className="side-stat-val-row">
                <span className="side-stat-val">{stats ? `${stats.avg_confidence_pct}%` : '0%'}</span>
                <span className="trend up"><TrendingUp size={14} /> +1.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Content Grid */}
        <div className="lower-grid">
          <div className="main-content-area">
            {/* Start creating content */}
            <div className="section-header">
              <h2 className="section-title">Quick Actions</h2>
              <MoreVertical size={16} className="muted" />
            </div>
            <div className="action-cards">
              <div className="action-card" onClick={() => navigate('/classify')}>
                <div className="action-icon"><Camera size={20} /></div>
                <div className="action-text">
                  <h3>Take a new photo</h3>
                  <p>Upload a paddy image for CNN analysis</p>
                </div>
              </div>
              <div className="action-card" onClick={() => navigate('/history')}>
                <div className="action-icon"><List size={20} /></div>
                <div className="action-text">
                  <h3>View scan history</h3>
                  <p>Check past maturity records & charts</p>
                </div>
              </div>
            </div>

            {/* Recent posts */}
            <div className="section-header" style={{ marginTop: '40px' }}>
              <h2 className="section-title">Agriculture News</h2>
              <MoreVertical size={16} className="muted" />
            </div>
            <div className="recent-posts">
              <div className="post-card" style={{ background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', display: 'flex', alignItems: 'flex-end', padding: '16px', color: '#fff', fontWeight: 600 }}>Harvesting Best Practices</div>
              <div className="post-card" style={{ background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', display: 'flex', alignItems: 'flex-end', padding: '16px', color: '#fff', fontWeight: 600 }}>Milling Quality Updates</div>
            </div>
          </div>

          <div className="side-content-area">
            <h2 className="section-title">Recent Scans</h2>
            <div className="top-members-list">
              {recent.length === 0 && !loading && (
                <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>No scans yet.</div>
              )}
              {recent.map((scan) => (
                <div key={scan.id} className="member-item">
                  <div className="member-avatar">
                    {scan.image_url ? (
                      <img src={scan.image_url} alt="scan" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--clr-gray-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Leaf size={16} className="muted" />
                      </div>
                    )}
                    <div className="online-indicator" style={{ background: scan.label === 'Ready for Harvest' ? '#12b76a' : scan.label === 'Nearly Mature' ? '#f59e0b' : '#64748b' }}></div>
                  </div>
                  <div className="member-info">
                    <div className="member-name">{scan.label}</div>
                    <div className="member-role">{new Date(scan.created_at).toLocaleDateString()} • {(scan.confidence * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
