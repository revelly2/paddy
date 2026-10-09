import { useState, useEffect } from 'react'
import { Settings, User, Bell, Shield, PhoneCall } from 'lucide-react'
import { type Session } from '../lib/supabase'

interface SettingsPageProps {
  session: Session
  isAdmin: boolean
}

export default function SettingsPage({ session, isAdmin }: SettingsPageProps) {
  const [supportEmail, setSupportEmail] = useState('support@paddyscan.com')
  const [supportPhone, setSupportPhone] = useState('+63 900 000 0000')
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem('paddyscan_support_email')
    const savedPhone = localStorage.getItem('paddyscan_support_phone')
    if (savedEmail) setSupportEmail(savedEmail)
    if (savedPhone) setSupportPhone(savedPhone)
  }, [])

  const handleSaveSupportInfo = () => {
    localStorage.setItem('paddyscan_support_email', supportEmail)
    localStorage.setItem('paddyscan_support_phone', supportPhone)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__inner" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header className="dashboard-header-modern" style={{ borderBottom: 'none', paddingBottom: 0, marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--clr-primary-50)', color: 'var(--clr-primary-600)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={24} />
            </div>
            <div>
              <h1 className="dashboard-title-modern">Settings</h1>
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
                Manage your account preferences and app settings.
              </p>
            </div>
          </div>
        </header>

        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isAdmin && (
            <div className="dashboard-panel">
              <div className="panel-header">
                <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneCall size={18} className="muted" /> App Configuration
                </h2>
              </div>
              <div className="panel-list">
                <div className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <div className="list-item-title">Support Email</div>
                  <input 
                    type="email" 
                    className="auth-field__input" 
                    style={{ width: '100%', maxWidth: '400px' }}
                    value={supportEmail} 
                    onChange={e => setSupportEmail(e.target.value)} 
                  />
                </div>
                <div className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <div className="list-item-title">Support Phone Number</div>
                  <input 
                    type="text" 
                    className="auth-field__input" 
                    style={{ width: '100%', maxWidth: '400px' }}
                    value={supportPhone} 
                    onChange={e => setSupportPhone(e.target.value)} 
                  />
                </div>
                <div className="list-item" style={{ background: 'var(--clr-gray-50)' }}>
                  <button className="btn btn--primary" onClick={handleSaveSupportInfo}>
                    {isSaved ? 'Saved!' : 'Save Support Info'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="dashboard-panel">
            <div className="panel-header">
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} className="muted" /> Account
              </h2>
            </div>
            <div className="panel-list">
              <div className="list-item" style={{ justifyContent: 'space-between' }}>
                <div className="list-item-content">
                  <div className="list-item-title">Profile Information</div>
                  <div className="list-item-desc">Update your name and contact details</div>
                </div>
                <button className="btn btn--secondary btn--sm">Edit</button>
              </div>
              <div className="list-item" style={{ justifyContent: 'space-between' }}>
                <div className="list-item-content">
                  <div className="list-item-title">Farm Details</div>
                  <div className="list-item-desc">Manage your farm location and size</div>
                </div>
                <button className="btn btn--secondary btn--sm">Edit</button>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} className="muted" /> Notifications
              </h2>
            </div>
            <div className="panel-list">
              <div className="list-item" style={{ justifyContent: 'space-between' }}>
                <div className="list-item-content">
                  <div className="list-item-title">Push Notifications</div>
                  <div className="list-item-desc">Receive alerts when it's time to harvest</div>
                </div>
                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--clr-primary-600)' }} />
              </div>
              <div className="list-item" style={{ justifyContent: 'space-between' }}>
                <div className="list-item-content">
                  <div className="list-item-title">Email Updates</div>
                  <div className="list-item-desc">Weekly summaries of your scans</div>
                </div>
                <input type="checkbox" style={{ width: '20px', height: '20px', accentColor: 'var(--clr-primary-600)' }} />
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} className="muted" /> Privacy & Security
              </h2>
            </div>
            <div className="panel-list">
              <div className="list-item" style={{ justifyContent: 'space-between' }}>
                <div className="list-item-content">
                  <div className="list-item-title">Change Password</div>
                  <div className="list-item-desc">Update your login password</div>
                </div>
                <button className="btn btn--secondary btn--sm">Update</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
