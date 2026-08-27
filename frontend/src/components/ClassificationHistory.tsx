/**
 * ClassificationHistory.tsx
 * -------------------------
 * Displays the farmer's past classification records in a responsive table.
 *
 * Features
 * --------
 * - Paginated list of scan history
 * - Colour-coded maturity badges
 * - Confidence percentage display
 * - Delete individual records
 * - Date/time formatted for the Philippine locale
 * - Skeleton loading state
 * - Empty state with call-to-action
 */

import { useEffect, useState, useCallback } from 'react'
import { Trash2, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import {
  listClassifications,
  deleteClassification,
  getLabelConfig,
  formatConfidence,
  type ClassificationResult,
} from '../lib/api'

const PAGE_SIZE = 15

export default function ClassificationHistory() {
  const [items,   setItems]   = useState<ClassificationResult[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listClassifications(p, PAGE_SIZE)
      setItems(res.data)
      setTotal(res.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistory(page) }, [page, fetchHistory])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this classification record?')) return
    setDeleting(id)
    try {
      await deleteClassification(id)
      fetchHistory(page)
    } catch (err) {
      alert(`Failed to delete: ${(err as Error).message}`)
    } finally {
      setDeleting(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Format date for PH locale
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  // ── Skeleton loading rows ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="history">
        <div className="history__skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="history__skeleton-row">
              <div className="skeleton-block skeleton-block--wide" />
              <div className="skeleton-block" />
              <div className="skeleton-block skeleton-block--narrow" />
              <div className="skeleton-block" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="history__error">
        <p>⚠ Failed to load history: {error}</p>
        <button
          id="btn-retry-history"
          onClick={() => fetchHistory(page)}
          className="btn btn--secondary"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="history__empty">
        <div className="history__empty-icon">🌾</div>
        <h3>No scans yet</h3>
        <p>Upload a paddy rice photo on the Classify page to get started.</p>
      </div>
    )
  }

  return (
    <div className="history">
      {/* Table */}
      <div className="history__table-wrap">
        <table className="history__table" role="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Result</th>
              <th>Confidence</th>
              <th>Location</th>
              <th>Date</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const cfg = getLabelConfig(item.label)
              return (
                <tr key={item.id} className="history__row">
                  {/* Thumbnail */}
                  <td>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt="Rice paddy thumbnail"
                        className="history__thumb"
                      />
                    ) : (
                      <div className="history__thumb-placeholder">🌾</div>
                    )}
                  </td>

                  {/* Label badge */}
                  <td>
                    <span
                      className="history__badge"
                      style={{
                        color:           cfg.color,
                        background:      cfg.bgColor,
                        borderColor:     cfg.borderColor,
                      }}
                    >
                      {cfg.emoji} {item.label}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td className="history__confidence">
                    {formatConfidence(item.confidence)}
                  </td>

                  {/* Location */}
                  <td className="history__location">
                    {item.location ?? <span className="muted">—</span>}
                  </td>

                  {/* Date */}
                  <td className="history__date">
                    <Clock size={13} />
                    {formatDate(item.created_at)}
                  </td>

                  {/* Delete */}
                  <td>
                    <button
                      id={`btn-delete-${item.id}`}
                      className="history__delete"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      title="Delete this record"
                      aria-label={`Delete classification from ${formatDate(item.created_at)}`}
                    >
                      {deleting === item.id
                        ? <span className="spinner spinner--xs" />
                        : <Trash2 size={16} />
                      }
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="history__pagination">
          <button
            id="btn-prev-page"
            className="history__page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          <span className="history__page-info">
            Page {page} of {totalPages} ({total} total)
          </span>
          <button
            id="btn-next-page"
            className="history__page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
