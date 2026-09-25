import { useState } from 'react'
import { Leaf, Camera } from 'lucide-react'
import ImageUploader from '../components/ImageUploader'
import ResultCard    from '../components/ResultCard'
import { classifyImage, type ClassificationResult } from '../lib/api'

type PageState = 'idle' | 'loading' | 'result' | 'error'

export default function ClassifyPage() {
  const [state,  setState]  = useState<PageState>('idle')
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [error,  setError]  = useState<string | null>(null)

  const handleSubmit = async (
    file:      File,
    notes?:    string,
    location?: string,
  ) => {
    setState('loading')
    setError(null)
    try {
      const res = await classifyImage(file, notes, location)
      setResult(res)
      setState('result')
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
      <div className="dashboard-page__inner" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Page header */}
        <header className="dashboard-header-modern" style={{ borderBottom: 'none', paddingBottom: 0, marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--clr-primary-50)', color: 'var(--clr-primary-600)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={24} />
            </div>
            <div>
              <h1 className="dashboard-title-modern">Rice Maturity Classifier</h1>
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
                Upload a clear photo of your paddy rice crop to determine the optimal harvest time.
              </p>
            </div>
          </div>
        </header>

        {/* Tips banner */}
        <div style={{ marginTop: '32px', padding: '16px 20px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Camera size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, color: '#92400e', fontSize: '0.875rem', lineHeight: '1.5' }}>
            <strong>Tips for best results:</strong> Use a photo taken in daylight, focused on the rice panicles (grain heads). Avoid blurry or very dark shots.
          </p>
        </div>

        {/* Main content area */}
        <div style={{ marginTop: '24px' }}>
          {/* Uploader — always shown unless we have a result */}
          {state !== 'result' && (
            <div className="uploader-modern-card">
              <ImageUploader
                onSubmit={handleSubmit}
                loading={state === 'loading'}
              />
            </div>
          )}

          {/* Error callout */}
          {state === 'error' && error && (
            <div role="alert" style={{ marginTop: '24px', padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', textAlign: 'center' }}>
              <p style={{ fontWeight: 600, marginBottom: '8px' }}>Classification failed</p>
              <p style={{ fontSize: '0.875rem', marginBottom: '16px' }}>{error}</p>
              <button
                id="btn-retry-classify"
                className="btn btn--secondary"
                onClick={handleReset}
                style={{ background: '#fff', border: '1px solid #fca5a5', color: '#991b1b' }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Result */}
          {state === 'result' && result && (
            <div style={{ marginTop: '24px' }}>
              <ResultCard result={result} onReset={handleReset} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
