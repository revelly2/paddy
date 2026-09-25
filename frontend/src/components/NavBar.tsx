import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { 
  Menu, X, Search, BarChart2, Layers, CheckSquare, 
  PieChart, Users, LifeBuoy, Settings, PlayCircle, LogOut, Camera
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
            <div className="sidebar__logo-dot"></div>
            <span className="sidebar__logo-text">PaddyScan</span>
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
          
          <div className="sidebar__promo">
            <div className="sidebar__promo-header">
              <span className="sidebar__promo-title">New model live!</span>
              <X size={14} className="sidebar__promo-close" />
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
              <button className="sidebar__promo-btn muted">Dismiss</button>
              <button className="sidebar__promo-btn primary">What's new?</button>
            </div>
          </div>

          <div className="sidebar__user" onClick={() => {
            supabase.auth.signOut();
            navigate('/auth');
          }}>
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
          <div className="sidebar__logo-dot"></div>
          <span>PaddyScan</span>
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
    </>
  )
}

