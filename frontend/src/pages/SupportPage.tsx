import { useState, useEffect } from 'react'
import { LifeBuoy, Mail, Phone, HelpCircle, ChevronDown, CheckCircle2 } from 'lucide-react'

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
      <div className="dashboard-page__inner" style={{ maxWidth: '840px', margin: '0 auto' }}>
        <header className="page-header-clean">
          <div className="page-header-icon-box">
            <LifeBuoy size={26} />
          </div>
          <div className="page-header-text">
            <div className="page-header-badge">
              <HelpCircle size={13} />
              <span>Assistance & Help Center</span>
            </div>
            <h1 className="page-header-title">Help & Agronomy Support</h1>
            <p className="page-header-desc">
              Have questions about using the scanner or need advice on rice maturity analysis? Reach our technical support team.
            </p>
          </div>
        </header>

        {/* Contact Channels Grid */}
        <div className="support-channels-grid">
          <div className="support-channel-card">
            <div className="channel-icon-wrap channel-icon-wrap--green">
              <Mail size={22} />
            </div>
            <h3 className="channel-title">Email Technical Support</h3>
            <p className="channel-desc">Direct inquiries, feedback, or classification questions. Response within 24 hours.</p>
            <a href={`mailto:${email}`} className="channel-btn">
              {email}
            </a>
          </div>

          <div className="support-channel-card">
            <div className="channel-icon-wrap channel-icon-wrap--amber">
              <Phone size={22} />
            </div>
            <h3 className="channel-title">Agricultural Hotline</h3>
            <p className="channel-desc">Speak directly with an agronomy field officer or system technician during harvest hours.</p>
            <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="channel-btn">
              {phone}
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="support-faq-card">
          <div className="faq-header">
            <HelpCircle size={20} className="faq-header-icon" />
            <h3 className="faq-header-title">Frequently Asked Questions</h3>
          </div>

          <div className="faq-list">
            <div className="faq-item">
              <h4 className="faq-question">How does the CNN model determine rice harvest readiness?</h4>
              <p className="faq-answer">
                PaddyScan analyzes two visual dimensions: panicle detection (identifying the density and curvature of grain heads) and HSV color-space metrics (evaluating the percentage of golden/amber grains versus green grains). When over 85% of grains have reached golden maturity, the status triggers &ldquo;Ready for Harvest&rdquo;.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">What camera angles provide the most accurate predictions?</h4>
              <p className="faq-answer">
                Take photographs approximately 30 to 50 cm away from the rice crop under even daylight. Ensure the grain heads are in sharp focus and avoid shooting directly into blinding backlights.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Is the app tailored specifically to Abra rice farming conditions?</h4>
              <p className="faq-answer">
                Yes. PaddyScan integrates Abra provincial cropping schedules, distinguishing between Wet Season (Tag-ulan) and Dry Season (Tag-araw) cropping cycles with localized variety guidance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
