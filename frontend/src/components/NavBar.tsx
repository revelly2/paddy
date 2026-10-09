import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { 
  Menu, X, Search, BarChart2, Layers, CheckSquare, 
  PieChart, Users, LifeBuoy, Settings, PlayCircle, LogOut, Camera, Sprout
} from 'lucide-react'
import { supabase, type Session } from '../lib/supabase'

interface NavBarProps {
  session: Session
}

export default function NavBar({ session }: NavBarProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('Farmer')
  const [email, setEmail] = useState('')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isPromoVisible, setIsPromoVisible] = useState(true)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)

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
  }, [session])

  const navItems = [
    { to: '/',           label: 'Dashboard', icon: BarChart2 },
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
          
          {isPromoVisible && (
            <div className="sidebar__promo">
              <div className="sidebar__promo-header">
                <span className="sidebar__promo-title">New model live!</span>
                <X size={14} className="sidebar__promo-close" onClick={() => setIsPromoVisible(false)} style={{ cursor: 'pointer' }} />
              </div>
              <p className="sidebar__promo-desc">
                PaddyScan CNN v2 is now active for more accurate maturity detection.
              </p>
              <div className="sidebar__promo-image">
                <img src="/dashboard-bg.png" alt="Promo video thumbnail" />
                <div className="sidebar__promo-play">
                  <PlayCircle size={24} fill="white" color="var(--clr-primary-700)" />
                </div>
              </div>
              <div className="sidebar__promo-actions">
                <button className="sidebar__promo-btn muted" onClick={() => setIsPromoVisible(false)}>Dismiss</button>
                <button className="sidebar__promo-btn primary" onClick={() => setIsUpdateModalOpen(true)}>What's new?</button>
              </div>
            </div>
          )}

          <div className="sidebar__user" onClick={() => setIsProfileModalOpen(true)}>
            <img src={`https://ui-avatars.com/api/?name=${name}&background=random`} alt="Avatar" className="sidebar__avatar-img" />
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
              <img src={`https://ui-avatars.com/api/?name=${name}&background=random`} alt="Avatar" className="profile-modal-avatar" />
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
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--clr-gray-900)' }}>🌾 Agriculture News Feed</h4>
                <p style={{ margin: 0, color: 'var(--clr-gray-600)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Stay up to date with the latest agriculture news right from your dashboard. We've added a new section that automatically pulls live updates from AgWeb!
                </p>
              </div>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--clr-gray-900)' }}>🤖 PaddyScan CNN v2</h4>
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
    </>
  )
}

