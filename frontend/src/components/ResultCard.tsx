/**
 * ResultCard.tsx
 * --------------
 * Displays the classification result including panicle detection overlays.
 *
 * Features
 * --------
 * - Animated entry (slide-up on mount)
 * - Colour-coded badge for each maturity level
 * - Confidence percentage with animated progress bar
 * - Panicle detection count badge
 * - Toggle between raw and annotated (detection overlay) images
 * - All three class probability bars
 * - Farmer-friendly harvest advice text
 * - Share / copy result link
 *
 * Props
 * -----
 * result  — ClassificationResult from the API
 * onReset — callback to clear the result and allow a new upload
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  CheckCircle, AlertTriangle, Clock, RotateCcw, Copy, Info, Eye, EyeOff, Scan
} from 'lucide-react'
import { type ClassificationResult, getLabelConfig, formatConfidence } from '../lib/api'

interface ResultCardProps {
  result:  ClassificationResult
  onReset: () => void
}

// Icons for each maturity level
const LABEL_ICONS: Record<string, React.ReactNode> = {
  'Immature':          <Clock       size={28} />,
  'Nearly Mature':     <AlertTriangle size={28} />,
  'Ready for Harvest': <CheckCircle size={28} />,
}

export default function ResultCard({ result, onReset }: ResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const config  = getLabelConfig(result.label)
  const [showAnnotated, setShowAnnotated] = useState(true)

  // Determine which image to display
  const hasAnnotated = !!result.annotated_image_url
  const displayImage = showAnnotated && hasAnnotated
    ? result.annotated_image_url
    : result.image_url

  // Animate card into view
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    el.style.opacity   = '0'
    el.style.transform = 'translateY(24px)'
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease'
      el.style.opacity    = '1'
      el.style.transform  = 'translateY(0)'
    })
  }, [result.id])

  const handleCopy = () => {
    const text =
      `PaddyScan Result\n` +
      `Label: ${result.label}\n` +
      `Confidence: ${formatConfidence(result.confidence)}\n` +
      `Panicles Detected: ${result.panicle_count ?? 'N/A'}\n` +
      `Date: ${new Date(result.created_at).toLocaleString()}\n` +
      `Advice: ${result.advice}`
    navigator.clipboard?.writeText(text)
  }

  const probs = [
    { key: 'Immature',          label: 'Immature',           value: result.probabilities.Immature },
    { key: 'Nearly_Mature',     label: 'Nearly Mature',      value: result.probabilities.Nearly_Mature },
    { key: 'Ready_for_Harvest', label: 'Ready for Harvest',  value: result.probabilities.Ready_for_Harvest },
  ]

  return (
    <div
      ref={cardRef}
      className="result-card"
      role="region"
      aria-label="Classification result"
      style={{
        '--label-color':  config.color,
        '--label-bg':     config.bgColor,
        '--label-border': config.borderColor,
      } as React.CSSProperties}
    >
      {/* Header strip */}
      <div className="result-card__header">
        <div className="result-card__icon">
          {LABEL_ICONS[result.label] ?? LABEL_ICONS['Immature']}
        </div>
        <div className="result-card__title-block">
          <h2 className="result-card__label">{result.label}</h2>
          <p className="result-card__tagline">{config.tagline}</p>
        </div>
        <div className="result-card__badge">
          {formatConfidence(result.confidence)}
        </div>
      </div>

      {/* Panicle detection badge */}
      {result.panicle_count != null && (
        <div className="result-card__panicle-badge">
          <Scan size={16} />
          <span>
            <strong>{result.panicle_count}</strong> panicle{result.panicle_count !== 1 ? 's' : ''} detected
          </span>
        </div>
      )}

      {/* Image — with annotated/raw toggle */}
      {displayImage && (
        <div className="result-card__image-wrap">
          <img
            src={displayImage}
            alt={
              showAnnotated && hasAnnotated
                ? 'Annotated rice paddy with panicle detection overlay'
                : 'Classified rice paddy'
            }
            className="result-card__image"
          />
          {hasAnnotated && (
            <button
              type="button"
              className="result-card__image-toggle"
              onClick={() => setShowAnnotated(!showAnnotated)}
              title={showAnnotated ? 'Show original image' : 'Show detection overlay'}
            >
              {showAnnotated ? <EyeOff size={14} /> : <Eye size={14} />}
              {showAnnotated ? 'Original' : 'Detection'}
            </button>
          )}
        </div>
      )}

      {/* Confidence bar */}
      <div className="result-card__confidence">
        <div className="result-card__conf-label">
          <span>Model confidence</span>
          <strong>{formatConfidence(result.confidence)}</strong>
        </div>
        <div className="result-card__conf-bar">
          <div
            className="result-card__conf-fill"
            style={{ width: `${result.confidence * 100}%` }}
            role="progressbar"
            aria-valuenow={Math.round(result.confidence * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* All class probabilities */}
      <div className="result-card__probs">
        <p className="result-card__probs-title">
          <Info size={14} /> Class probabilities
        </p>
        {probs.map(({ key, label, value }) => (
          <div key={key} className="result-card__prob-row">
            <span className="result-card__prob-name">{label}</span>
            <div className="result-card__prob-bar">
              <div
                className={`result-card__prob-fill ${
                  result.label_key === key ? 'result-card__prob-fill--active' : ''
                }`}
                style={{ width: `${value * 100}%` }}
              />
            </div>
            <span className="result-card__prob-value">
              {(value * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Harvest advice */}
      <div className="result-card__advice">
        <p className="result-card__advice-title">Recommendation</p>
        <p className="result-card__advice-text">{result.advice}</p>
      </div>

      {/* Metadata */}
      {(result.location || result.notes) && (
        <div className="result-card__meta">
            <p><strong>Location:</strong> {result.location}</p>
            <p><strong>Notes:</strong> {result.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="result-card__actions">
        <button
          id="btn-copy-result"
          type="button"
          className="result-card__btn result-card__btn--secondary"
          onClick={handleCopy}
          title="Copy result to clipboard"
        >
          <Copy size={16} />
          Copy result
        </button>
        <button
          id="btn-classify-another"
          type="button"
          className="result-card__btn result-card__btn--primary"
          onClick={onReset}
        >
          <RotateCcw size={16} />
          Classify another
        </button>
      </div>
    </div>
  )
}
