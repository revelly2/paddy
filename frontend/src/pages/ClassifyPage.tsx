import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Camera, Sun, Focus, Layers, AlertCircle, ArrowLeft, LogIn } from 'lucide-react'
import ImageUploader from '../components/ImageUploader'
import ResultCard from '../components/ResultCard'
import { classifyImage, type ClassificationResult } from '../lib/api'
import { supabase } from '../lib/supabase'

type PageState = 'idle' | 'loading' | 'result' | 'error'

export default function ClassifyPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<PageState>('idle')
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAuthError = Boolean(
    error && (
      error.toLowerCase().includes('session') ||
      error.toLowerCase().includes('expired') ||
      error.toLowerCase().includes('log in') ||
      error.toLowerCase().includes('sign out') ||
      error.toLowerCase().includes('authenticated')
    )
  )

  const handleRelogin = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    navigate('/auth')
  }

  const handleSubmit = async (
    file: File,
    notes?: string,
    location?: string,
  ) => {
    setState('loading')
    setError(null)
    try {
      const res = await classifyImage(file, notes, location)
      setResult(res)
      setState('result')
      window.dispatchEvent(new CustomEvent('paddy:scan-updated'))
    } catch (err) {
      setError((err as Error).message)
      setState('error')
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setState('idle')
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__inner" style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Modern Crisp Page Header */}
        <header className="page-header-clean">
          <div className="page-header-icon-box">
            <Camera size={26} />
          </div>
          <div className="page-header-text">
            <div className="page-header-badge">
              <Leaf size={13} />
              <span>Vision Diagnostic Tool</span>
            </div>
            <h1 className="page-header-title">Rice Maturity Classifier</h1>
            <p className="page-header-desc">
              Upload a clear field photo of your paddy grain heads to verify maturity stage and schedule your harvest.
            </p>
          </div>
        </header>

        {/* Photography Best Practice Tips Grid */}
        <div className="classify-tips-grid">
          <div className="tip-chip">
            <Sun size={16} className="tip-icon" />
            <div className="tip-text">
              <strong>Daylight Shots</strong>
              <span>Natural field sunlight</span>
            </div>
          </div>
          <div className="tip-chip">
            <Focus size={16} className="tip-icon" />
            <div className="tip-text">
              <strong>Grain Focus</strong>
              <span>Center the panicle heads</span>
            </div>
          </div>
          <div className="tip-chip">
            <Layers size={16} className="tip-icon" />
            <div className="tip-text">
              <strong>Avoid Blur</strong>
              <span>Hold camera steady</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="classify-content-area">
          {/* Uploader — shown unless viewing result */}
          {state !== 'result' && (
            <div className="classify-uploader-card">
              <ImageUploader
                onSubmit={handleSubmit}
                loading={state === 'loading'}
                onClearError={() => {
                  if (state === 'error') {
                    setState('idle')
                    setError(null)
                  }
                }}
              />
            </div>
          )}

          {/* Error Callout */}
          {state === 'error' && error && (
            <div role="alert" className="classify-error-card">
              <div className="classify-error-icon">
                <AlertCircle size={24} />
              </div>
              <div className="classify-error-content">
                <h3 className="classify-error-title">Classification Error</h3>
                <p className="classify-error-message">{error}</p>
              </div>
              <div className="classify-error-actions">
                {isAuthError && (
                  <button
                    id="btn-relogin"
                    className="btn btn--primary btn--sm"
                    onClick={handleRelogin}
                  >
                    <LogIn size={15} /> Sign in again
                  </button>
                )}
                <button
                  id="btn-retry-classify"
                  className="btn btn--secondary btn--sm"
                  onClick={handleReset}
                >
                  <ArrowLeft size={15} /> Try again
                </button>
              </div>
            </div>
          )}

          {/* Result View */}
          {state === 'result' && result && (
            <div className="classify-result-container">
              <ResultCard result={result} onReset={handleReset} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
