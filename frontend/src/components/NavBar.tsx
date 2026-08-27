/**
 * NavBar.tsx
 * ----------
 * Top navigation bar with logo, nav links, and sign-out button.
 * Shows the farmer's name when available.
 * Fully responsive — collapses to a hamburger on small screens.
 */

import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, Leaf, LogOut, History, Camera, Home } from 'lucide-react'
import { supabase, type Session } from '../lib/supabase'

interface NavBarProps {
  session: Session
}

export default function NavBar({ session }: NavBarProps) {
  const navigate     = useNavigate()
  const [open, setOpen] = useState(false)
  const [name,  setName]  = useState('')

  // Load farmer's name from profiles table
  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
      if (data?.full_name) setName(data.full_name)
      else setName(session.user.email?.split('@')[0] ?? 'Farmer')
    }
    loadProfile()
  }, [session])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const navItems = [
    { to: '/',         label: 'Home',     icon: Home    },
    { to: '/classify', label: 'Classify', icon: Camera  },
    { to: '/history',  label: 'History',  icon: History },
  ]

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        {/* Logo */}
        <NavLink to="/" className="navbar__logo">
          <div className="navbar__logo-icon">
            <Leaf size={20} />
          </div>
          <span className="navbar__logo-text">PaddyScan</span>
        </NavLink>

        {/* Desktop links */}
        <ul className="navbar__links">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right side: user + sign out */}
        <div className="navbar__actions">
          <span className="navbar__user">👨‍🌾 {name}</span>
          <button
            id="btn-signout"
            onClick={handleSignOut}
            className="navbar__signout"
            title="Sign out"
          >
            <LogOut size={16} />
            <span className="navbar__signout-label">Sign out</span>
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          id="btn-menu-toggle"
          className="navbar__hamburger"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="navbar__mobile">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `navbar__mobile-link ${isActive ? 'navbar__mobile-link--active' : ''}`
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          <button onClick={handleSignOut} className="navbar__mobile-signout">
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
