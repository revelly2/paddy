import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, List, Leaf, Sprout } from 'lucide-react'
import { type Session } from '../lib/supabase'
import { getUserStats, listClassifications, getAgNews, type StatsResponse, type ClassificationResult, type NewsItem } from '../lib/api'

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
      listClassifications(1, 3).catch(() => ({ data: [] })),
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
        {/* Header Section */}
        <header className="dashboard-header-modern" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #14532d 100%)' }}>
          <div className="header-decor header-decor-1"><Sprout size={48} /></div>
          <div className="header-decor header-decor-3"><Sprout size={32} /></div>
          <h1 className="dashboard-title-modern">Hello, {firstName} 👋</h1>
          <p className="dashboard-subtitle-modern">Ready to check your paddy field today?</p>
        </header>

        {/* Quick Actions (Bigger for users) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="action-card" onClick={() => navigate('/classify')} style={{ padding: '24px', cursor: 'pointer', background: 'var(--clr-white)', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--clr-border)' }}>
            <div className="action-icon" style={{ background: '#dcfce7', color: '#16a34a', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Camera size={24} />
            </div>
            <div className="action-text">
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--clr-gray-900)' }}>Take a Photo</h3>
              <p style={{ margin: 0, color: 'var(--clr-gray-500)', fontSize: '0.95rem' }}>Upload or take a picture of your paddy to check if it's ready for harvest.</p>
            </div>
          </div>
          <div className="action-card" onClick={() => navigate('/history')} style={{ padding: '24px', cursor: 'pointer', background: 'var(--clr-white)', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--clr-border)' }}>
            <div className="action-icon" style={{ background: '#fef3c7', color: '#d97706', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <List size={24} />
            </div>
            <div className="action-text">
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--clr-gray-900)' }}>My Scans</h3>
              <p style={{ margin: 0, color: 'var(--clr-gray-500)', fontSize: '0.95rem' }}>View your past scans and keep track of your field's progress.</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content-grid">
          {/* Recent Scans */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <h2 className="panel-title">Recent Scans</h2>
            </div>
            <div className="top-members-list" style={{ padding: '16px' }}>
              {recent.length === 0 && !loading && (
                <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>You haven't scanned anything yet.</div>
              )}
              {recent.map((scan) => (
                <div key={scan.id} className="member-item" style={{ padding: '12px 0', borderBottom: '1px solid var(--clr-gray-100)' }}>
                  <div className="member-avatar">
                    {scan.image_url ? (
                      <img src={scan.image_url} alt="scan" style={{ borderRadius: '8px' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', background: 'var(--clr-gray-100)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Leaf size={16} className="muted" />
                      </div>
                    )}
                  </div>
                  <div className="member-info">
                    <div className="member-name" style={{ fontSize: '1rem', fontWeight: 600 }}>{scan.label}</div>
                    <div className="member-role">{new Date(scan.created_at).toLocaleDateString()} • {(scan.confidence * 100).toFixed(1)}% confidence</div>
                  </div>
                </div>
              ))}
              {recent.length > 0 && (
                <button onClick={() => navigate('/history')} style={{ width: '100%', padding: '12px', marginTop: '8px', background: 'var(--clr-gray-50)', border: '1px solid var(--clr-border)', borderRadius: '8px', fontWeight: 600, color: 'var(--clr-primary-700)', cursor: 'pointer' }}>View All Scans</button>
              )}
            </div>
          </div>

          {/* Farming News */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <h2 className="panel-title">Farming News & Tips</h2>
            </div>
            <div className="recent-posts" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {news.length === 0 && !loading && (
                <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>No news available right now.</div>
              )}
              {news.map((item, i) => (
                <a href={item.link} target="_blank" rel="noopener noreferrer" key={i} style={{ textDecoration: 'none' }}>
                  <div className="post-card" style={{ 
                    background: item.image_url ? `linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 100%), url(${item.image_url})` : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px', 
                    color: '#fff', 
                    borderRadius: '12px',
                    transition: 'transform 0.2s ease',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.3 }}>{item.title}</span>
                    </div>
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
