/**
 * HistoryPage.tsx
 * ---------------
 * Displays the farmer's full classification history.
 * Wraps the ClassificationHistory component with page-level
 * header and a CSV export utility.
 */

// no React import needed — new JSX transform
import { History, Download } from 'lucide-react'
import ClassificationHistory from '../components/ClassificationHistory'
import { listClassifications, formatConfidence } from '../lib/api'

export default function HistoryPage() {
  const handleExport = async () => {
    try {
      // Fetch all records (up to 1000) for export
      const res = await listClassifications(1, 1000)
      const rows = [
        ['Date', 'Result', 'Confidence', 'Location', 'Notes'],
        ...res.data.map((r) => [
          new Date(r.created_at).toLocaleString('en-PH'),
          r.label,
          formatConfidence(r.confidence),
          r.location ?? '',
          r.notes    ?? '',
        ]),
      ]
      const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `paddyscan_history_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`)
    }
  }

  return (
    <div className="page history-page">
      <div className="history-page__header">
        <div>
          <h1 className="history-page__title">
            <History size={24} /> Scan History
          </h1>
          <p className="history-page__subtitle">
            All your paddy rice classification results, most recent first.
          </p>
        </div>
        <button
          id="btn-export-csv"
          className="btn btn--ghost btn--sm"
          onClick={handleExport}
          title="Export history as CSV"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <ClassificationHistory />
    </div>
  )
}
