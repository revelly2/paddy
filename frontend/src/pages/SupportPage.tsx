import { useState, useEffect } from 'react'
import { LifeBuoy, Mail, Phone } from 'lucide-react'

export default function SupportPage() {
  const [email, setEmail] = useState('support@paddyscan.com')
  const [phone, setPhone] = useState('+63 900 000 0000')

  useEffect(() => {
    const savedEmail = localStorage.getItem('paddyscan_support_email')
    const savedPhone = localStorage.getItem('paddyscan_support_phone')
    if (savedEmail) setEmail(savedEmail)
    if (savedPhone) setPhone(savedPhone)
  }, [])

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__inner" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header className="dashboard-header-modern" style={{ borderBottom: 'none', paddingBottom: 0, marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--clr-primary-50)', color: 'var(--clr-primary-600)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LifeBuoy size={24} />
            </div>
            <div>
              <h1 className="dashboard-title-modern">Help & Support</h1>
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
                Need assistance with PaddyScan? We're here to help.
              </p>
            </div>
          </div>
        </header>

        <div style={{ marginTop: '32px', display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div className="clean-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px' }}>
            <div className="clean-card-icon" style={{ marginBottom: '16px', background: 'var(--clr-primary-50)', color: 'var(--clr-primary-600)' }}>
              <Mail size={24} />
            </div>
            <h3 className="clean-card-title">Email Us</h3>
            <p className="clean-card-desc" style={{ marginBottom: '16px' }}>Send us an email and we'll get back to you within 24 hours.</p>
            <a href={`mailto:${email}`} className="btn btn--secondary">{email}</a>
          </div>

          <div className="clean-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px' }}>
            <div className="clean-card-icon" style={{ marginBottom: '16px', background: 'var(--clr-primary-50)', color: 'var(--clr-primary-600)' }}>
              <Phone size={24} />
            </div>
            <h3 className="clean-card-title">Call Us</h3>
            <p className="clean-card-desc" style={{ marginBottom: '16px' }}>Call our hotline for immediate assistance with your crop scanning.</p>
            <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="btn btn--secondary">{phone}</a>
          </div>
        </div>

        <div style={{ marginTop: '32px', padding: '24px', background: 'var(--clr-white)', border: '1px solid var(--clr-border)', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Frequently Asked Questions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: '4px' }}>How do I get the best scan results?</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)' }}>Make sure to take photos in good daylight, focusing directly on the rice panicles. Avoid blurry or extremely dark images.</p>
            </div>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: '4px' }}>Can I use the app without an internet connection?</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)' }}>Currently, an internet connection is required to upload the image and receive AI classification results.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
