/**
 * ClassifyPage.tsx
 * ----------------
 * The core feature page — farmers upload a paddy rice image here and
 * receive the CNN maturity classification result.
 *
 * States
 * ------
 * idle     → show ImageUploader
 * loading  → show spinner overlay on uploader
 * result   → show ResultCard
 * error    → show error callout + retry
 */

import { useState } from 'react'
import { Leaf } from 'lucide-react'
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
    <div className="page classify-page">
      {/* Page header */}
      <div className="classify-page__header">
        <div className="classify-page__header-icon">
          <Leaf size={22} />
        </div>
        <div>
          <h1 className="classify-page__title">Rice Maturity Classifier</h1>
          <p className="classify-page__subtitle">
            Upload a clear photo of your paddy rice crop to determine the optimal
            harvest time.
          </p>
        </div>
      </div>

      {/* Tips banner */}
      <div className="classify-page__tips" role="note">
        <strong>📸 Tips for best results:</strong> Use a photo taken in daylight,
        focused on the rice panicles (grain heads). Avoid blurry or very dark shots.
      </div>

      {/* Main content area */}
      <div className="classify-page__body">
        {/* Uploader — always shown unless we have a result */}
        {state !== 'result' && (
          <div className="classify-page__upload-panel">
            <ImageUploader
              onSubmit={handleSubmit}
              loading={state === 'loading'}
            />
          </div>
        )}

        {/* Error callout */}
        {state === 'error' && error && (
          <div role="alert" className="classify-page__error">
            <p><strong>⚠ Classification failed</strong></p>
            <p>{error}</p>
            <button
              id="btn-retry-classify"
              className="btn btn--secondary"
              onClick={handleReset}
            >
              Try again
            </button>
          </div>
        )}

        {/* Result */}
        {state === 'result' && result && (
          <div className="classify-page__result-panel">
            <ResultCard result={result} onReset={handleReset} />
          </div>
        )}
      </div>
    </div>
  )
}
