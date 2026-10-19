import { useState, useEffect } from 'react'
import { Settings, User, Bell, Shield, PhoneCall, Check, Sparkles } from 'lucide-react'
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
      <div className="dashboard-page__inner" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <header className="page-header-clean">
          <div className="page-header-icon-box">
            <Settings size={26} />
          </div>
          <div className="page-header-text">
            <div className="page-header-badge">
              <Sparkles size={13} />
              <span>System Preferences</span>
            </div>
            <h1 className="page-header-title">Settings & Configuration</h1>
            <p className="page-header-desc">
              Manage your farmer account credentials, notification triggers, and provincial study preferences.
            </p>
          </div>
        </header>

        <div className="settings-stack">
          {isAdmin && (
            <div className="settings-panel">
              <div className="settings-panel-header">
                <PhoneCall size={18} className="settings-header-icon" />
                <div>
                  <h2 className="settings-panel-title">Administrator Support Contacts</h2>
                  <p className="settings-panel-subtitle">Configure contact points displayed to registered farmers</p>
                </div>
              </div>
              <div className="settings-fields-body">
                <div className="settings-field">
                  <label htmlFor="settings-support-email" className="settings-field-label">Support Email Address</label>
                  <input
                    id="settings-support-email"
                    type="email"
                    className="meta-field-input"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="settings-support-phone" className="settings-field-label">Hotline Phone Number</label>
                  <input
                    id="settings-support-phone"
                    type="text"
                    className="meta-field-input"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                  />
                </div>
                <div className="settings-save-row">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={handleSaveSupportInfo}
                  >
                    {isSaved ? (
                      <>
                        <Check size={16} /> Saved
                      </>
                    ) : (
                      'Save Support Info'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Account Details Card */}
          <div className="settings-panel">
            <div className="settings-panel-header">
              <User size={18} className="settings-header-icon" />
              <div>
                <h2 className="settings-panel-title">Account Information</h2>
                <p className="settings-panel-subtitle">Your credentials and farm parcel assignment</p>
              </div>
            </div>
            <div className="settings-row-list">
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Email Account</span>
                  <span className="settings-row-desc">{session.user.email}</span>
                </div>
                <span className="settings-status-pill">Active</span>
              </div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Province Research Area</span>
                  <span className="settings-row-desc">Abra Province (Cordillera Administrative Region)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="settings-panel">
            <div className="settings-panel-header">
              <Bell size={18} className="settings-header-icon" />
              <div>
                <h2 className="settings-panel-title">Notification Alerts</h2>
                <p className="settings-panel-subtitle">Automated maturity window notifications</p>
              </div>
            </div>
            <div className="settings-row-list">
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Harvest Window Alerts</span>
                  <span className="settings-row-desc">Alert when paddy scans transition from Nearly Mature to Harvest Ready</span>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="settings-toggle-checkbox"
                />
              </div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Weekly Cropping Digest</span>
                  <span className="settings-row-desc">Receive email summaries of field observations and seasonal outlooks</span>
                </div>
                <input
                  type="checkbox"
                  className="settings-toggle-checkbox"
                />
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="settings-panel">
            <div className="settings-panel-header">
              <Shield size={18} className="settings-header-icon" />
              <div>
                <h2 className="settings-panel-title">Security & Passwords</h2>
                <p className="settings-panel-subtitle">Protect your account and research classification logs</p>
              </div>
            </div>
            <div className="settings-row-list">
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Account Password</span>
                  <span className="settings-row-desc">Regularly change your password to keep scan data secure</span>
                </div>
                <button type="button" className="btn btn--secondary btn--sm">
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
