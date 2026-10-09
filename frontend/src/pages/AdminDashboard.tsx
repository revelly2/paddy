import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Filter, Camera, List, TrendingUp, MoreVertical, Leaf } from 'lucide-react'
import { type Session } from '../lib/supabase'
import { getUserStats, listClassifications, getAgNews, type StatsResponse, type ClassificationResult, type NewsItem } from '../lib/api'

interface AdminDashboardProps {
  session: Session
}

export default function AdminDashboard({ session }: AdminDashboardProps) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [recent, setRecent] = useState<ClassificationResult[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('30 days')
  const tabs = ['12 months', '30 days', '7 days', '24 hours']
  
  const firstName = session.user.email?.split('@')[0] ?? 'Farmer'

  useEffect(() => {
    Promise.all([
      getUserStats().catch(() => null),
      listClassifications(1, 5).catch(() => ({ data: [] })),
      getAgNews().catch(() => ({ items: [] }))
    ]).then(([statsData, historyData, newsData]) => {
      setStats(statsData)
      setRecent(historyData.data || [])
      setNews(newsData.items.slice(0, 4) || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__inner">
        {/* Header Section */}
        <header className="dashboard-header-modern">
          <div className="header-decor header-decor-1"><Leaf size={48} /></div>
          <div className="header-decor header-decor-2"><Leaf size={80} /></div>
          <div className="header-decor header-decor-3"><Leaf size={32} /></div>
          <div className="header-decor header-decor-4"><Leaf size={64} /></div>
          <h1 className="dashboard-title-modern">Welcome back, {firstName}</h1>
          <p className="dashboard-subtitle-modern">Here's your paddy field overview for today.</p>
        </header>

        {/* Filter Bar */}
        <div className="dashboard-filters">
          <div className="tabs">
            {tabs.map(t => (
              <button 
                key={t}
                className={`tab ${timeFilter === t ? 'active' : ''}`}
                onClick={() => setTimeFilter(t)}
              >
                {t}
              </button>
            ))}
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
                <path d="M0,100 L50,95 L100,90 L150,85 L200,95 L250,85 L300,90 L350,55 L400,45 L450,55 L500,40" fill="none" stroke="#16a34a" strokeWidth="2.5" />
                <path d="M0,100 L50,95 L100,90 L150,85 L200,95 L250,85 L300,90 L350,55 L400,45 L450,55 L500,40 L500,150 L0,150 Z" fill="url(#chart-gradient)" />
                <defs>
                  <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#f0fdf4" stopOpacity="0" />
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
            <div className="recent-posts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {news.length === 0 && !loading && (
                <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>No news available right now.</div>
              )}
              {news.map((item, i) => (
                <a href={item.link} target="_blank" rel="noopener noreferrer" key={i} style={{ textDecoration: 'none' }}>
                  <div className="post-card" style={{ 
                    background: item.image_url ? `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%), url(${item.image_url})` : 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    padding: '16px', 
                    color: '#fff', 
                    fontWeight: 600,
                    height: '200px',
                    borderRadius: '12px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.95rem', lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{item.title}</span>
                      <span style={{ fontSize: '0.75rem', opacity: 0.8, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        {new Date(item.pubDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
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
