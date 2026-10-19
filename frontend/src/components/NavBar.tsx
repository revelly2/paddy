import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { 
  Menu, X, Search, BarChart2, Layers, CheckSquare, 
  PieChart, Users, LifeBuoy, Settings, PlayCircle, LogOut, Camera, Sprout,
  Calendar, Clock, MapPin, Sparkles, ChevronRight, Newspaper, Cpu, BookOpen
} from 'lucide-react'
import { supabase, type Session } from '../lib/supabase'
import { listClassifications, type ClassificationResult } from '../lib/api'
import { calculateAbraHarvestSummary, type AbraHarvestStudySummary } from '../lib/harvestAnalytics'
import AbraHarvestStudyModal from './AbraHarvestStudyModal'

interface NavBarProps {
  session: Session
  isAdmin?: boolean
}

export default function NavBar({ session, isAdmin }: NavBarProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('Farmer')
  const [email, setEmail] = useState('')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isPromoVisible, setIsPromoVisible] = useState(true)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isAbraModalOpen, setIsAbraModalOpen] = useState(false)
  const [scans, setScans] = useState<ClassificationResult[]>([])
  const [harvestSummary, setHarvestSummary] = useState<AbraHarvestStudySummary>(() =>
    calculateAbraHarvestSummary([])
  )

  const getInitials = (fullName: string) => {
    const clean = fullName.replace(/\(.*?\)/g, '').trim()
    const parts = clean.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return clean.slice(0, 2).toUpperCase() || 'P'
  }

  const loadScans = useCallback(async () => {
    try {
      const res = await listClassifications(1, 100)
      if (res?.data) {
        setScans(res.data)
        setHarvestSummary(calculateAbraHarvestSummary(res.data))
      }
    } catch (err) {
      console.warn('Could not load scan data for sidebar:', err)
    }
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
      
      if (data?.full_name) setName(data.full_name)
      if (session.user.email) setEmail(session.user.email)
    }
    loadProfile()
    loadScans()

    const handleScanUpdated = () => loadScans()
    const handleOpenAbraStudy = () => setIsAbraModalOpen(true)

    window.addEventListener('paddy:scan-updated', handleScanUpdated)
    window.addEventListener('paddy:open-abra-study', handleOpenAbraStudy)

    return () => {
      window.removeEventListener('paddy:scan-updated', handleScanUpdated)
      window.removeEventListener('paddy:open-abra-study', handleOpenAbraStudy)
    }
  }, [session, loadScans])

  const navItems = [
    { to: '/',           label: 'Dashboard', icon: BarChart2 },
    ...(isAdmin ? [
      { to: '/admin/users',   label: 'User Accounts', icon: Users },
      { to: '/admin/content', label: 'Advisories & Content', icon: BookOpen },
    ] : []),
    { to: '/classify',   label: 'Classify',  icon: Camera },
    { to: '/history',    label: 'History',   icon: Layers },
  ]

  const bottomNavItems = [
    { to: '/support',    label: 'Support',   icon: LifeBuoy },
    { to: '/settings',   label: 'Settings',  icon: Settings },
  ]

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon" style={{ width: 44, height: 44, background: '#16a34a', borderColor: '#15803d' }}>
              <Sprout size={26} color="white" />
            </div>
            <span className="sidebar__logo-text" style={{ fontSize: '1.6rem', letterSpacing: '-0.5px' }}>
              <span style={{ color: '#16a34a', fontWeight: 900 }}>Paddy</span><span style={{ color: 'var(--clr-gray-800)', fontWeight: 600 }}>Scan</span>
            </span>
          </div>
          <div className="sidebar__search">
            <Search size={16} className="sidebar__search-icon" />
            <input type="text" placeholder="Search" className="sidebar__search-input" />
            <span className="sidebar__search-shortcut">⌘K</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <Icon size={18} className="sidebar__icon" />
              <span className="sidebar__link-text">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <nav className="sidebar__bottom-nav">
            {bottomNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
              >
                <Icon size={18} className="sidebar__icon" />
                <span className="sidebar__link-text">{label}</span>
              </NavLink>
            ))}
          </nav>
          
          {/* Abra Province Rice Study Sidebar Widget */}
          <div className="sidebar__abra-widget">
            <div className="sidebar__abra-header">
              <div className="sidebar__abra-tag">
                <span className="abra-dot" />
                <span className="abra-tag-text">Abra Rice Study</span>
              </div>
              <button
                className="sidebar__abra-expand-btn"
                onClick={() => setIsAbraModalOpen(true)}
                title="Open Abra Harvest Study Analytics"
                aria-label="Open Abra Harvest Study Analytics"
              >
                <Sparkles size={14} color="#16a34a" />
              </button>
            </div>

            <div className="sidebar__abra-season">
              <span className="abra-season-label">Active Season</span>
              <span className="abra-season-value">{harvestSummary.currentSeason}</span>
            </div>

            {/* Scanned Temporal Reading */}
            {harvestSummary.latestScan ? (
              <div className="sidebar__abra-scan-readout">
                <div className="sidebar__abra-readout-row">
                  <Clock size={13} className="abra-icon-dim" />
                  <span className="sidebar__abra-time">
                    {harvestSummary.latestScan.temporal.monthShort} {harvestSummary.latestScan.temporal.dayOfMonth} • {harvestSummary.latestScan.temporal.dayOfWeek.slice(0, 3)} • {harvestSummary.latestScan.temporal.timeString}
                  </span>
                </div>
                <div className="sidebar__abra-readout-window" style={{ color: harvestSummary.latestScan.window.color, background: harvestSummary.latestScan.window.bgColor }}>
                  {harvestSummary.latestScan.window.status}
                </div>
              </div>
            ) : (
              <div className="sidebar__abra-scan-readout muted">
                <Clock size={13} className="abra-icon-dim" />
                <span>Harvest calendar active</span>
              </div>
            )}

            {/* Harvest Readiness Quick Stats */}
            <div className="sidebar__abra-stat-grid">
              <div className="abra-stat-pill ready" title="Ready for harvest now (0-3d)">
                <span className="stat-num">{harvestSummary.readyNowCount}</span>
                <span className="stat-lbl">Ready</span>
              </div>
              <div className="abra-stat-pill nearly" title="Nearly mature (7-14d)">
                <span className="stat-num">{harvestSummary.nearlyMatureCount}</span>
                <span className="stat-lbl">7–14d</span>
              </div>
              <div className="abra-stat-pill immature" title="Immature (21-35d)">
                <span className="stat-num">{harvestSummary.immatureCount}</span>
                <span className="stat-lbl">21–35d</span>
              </div>
            </div>

            <button
              className="sidebar__abra-btn"
              onClick={() => setIsAbraModalOpen(true)}
            >
              <span>Harvest Study Data</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="sidebar__user" onClick={() => setIsProfileModalOpen(true)}>
            <div className={`sidebar__avatar-badge ${isAdmin ? 'sidebar__avatar-badge--admin' : ''}`}>
              <span>{getInitials(name)}</span>
              {isAdmin && <span className="sidebar__avatar-dot" title="Administrator" />}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{name}</span>
              <span className="sidebar__user-email">{email}</span>
            </div>
            <LogOut size={16} className="sidebar__user-logout" />
          </div>
        </div>
      </aside>

      <nav className="navbar-mobile">
        <NavLink to="/" className="navbar-mobile__logo" onClick={() => setOpen(false)}>
          <div className="sidebar__logo-icon" style={{ width: 36, height: 36, background: '#16a34a', borderColor: '#15803d' }}>
            <Sprout size={22} color="white" />
          </div>
          <span style={{ fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#16a34a', fontWeight: 900 }}>Paddy</span><span style={{ color: 'var(--clr-gray-800)', fontWeight: 600 }}>Scan</span>
          </span>
        </NavLink>
        <button
          className="navbar-mobile__toggle"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

        {open && (
          <div className="navbar-mobile__menu">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
                onClick={() => setOpen(false)}
              >
                <Icon size={18} className="sidebar__icon" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              className="sidebar__link"
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              onClick={() => {
                setOpen(false)
                setIsAbraModalOpen(true)
              }}
            >
              <Sparkles size={18} color="#16a34a" />
              <span className="sidebar__link-text">Abra Harvest Study</span>
            </button>
          </div>
        )}
      </nav>

      {isProfileModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Profile</h3>
              <button onClick={() => setIsProfileModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="profile-modal-body">
              <div className={`profile-modal-avatar-badge ${isAdmin ? 'profile-modal-avatar-badge--admin' : ''}`}>
                <span>{getInitials(name)}</span>
              </div>
              <div className="profile-modal-info">
                <h4>{name}</h4>
                <p>{email}</p>
              </div>
            </div>
            <div className="profile-modal-footer">
              <button 
                className="btn btn--secondary" 
                onClick={() => {
                  supabase.auth.signOut();
                  navigate('/auth');
                }}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {isUpdateModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsUpdateModalOpen(false)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Latest Updates</h3>
              <button onClick={() => setIsUpdateModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="profile-modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--clr-gray-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Newspaper size={18} color="#16a34a" /> Agriculture News Feed
                </h4>
                <p style={{ margin: 0, color: 'var(--clr-gray-600)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Stay up to date with the latest agriculture news right from your dashboard. We've added a new section that automatically pulls live updates from AgWeb!
                </p>
              </div>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--clr-gray-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} color="#16a34a" /> PaddyScan CNN v2
                </h4>
                <p style={{ margin: 0, color: 'var(--clr-gray-600)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Our new AI model is now active! It features improved panicle detection and more accurate HSV color analysis to better determine rice maturity.
                </p>
              </div>
            </div>
            <div className="profile-modal-footer">
              <button 
                className="btn btn--primary" 
                onClick={() => setIsUpdateModalOpen(false)}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abra Province Rice Harvest Study Modal */}
      <AbraHarvestStudyModal
        isOpen={isAbraModalOpen}
        onClose={() => setIsAbraModalOpen(false)}
        summary={harvestSummary}
        scans={scans}
        onRefresh={loadScans}
      />
    </>
  )
}


