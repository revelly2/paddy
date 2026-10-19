import { History, Download, Layers } from 'lucide-react'
import ClassificationHistory from '../components/ClassificationHistory'
import { listClassifications, formatConfidence } from '../lib/api'

export default function HistoryPage() {
  const handleExport = async () => {
    try {
      const res = await listClassifications(1, 1000)
      const rows = [
        ['Date', 'Result', 'Confidence', 'Location', 'Notes'],
        ...res.data.map((r) => [
          new Date(r.created_at).toLocaleString('en-PH'),
          r.label,
          formatConfidence(r.confidence),
          r.location ?? '',
          r.notes ?? '',
        ]),
      ]
      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paddyscan_history_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`)
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__inner">
        <header className="page-header-clean" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <div className="page-header-icon-box">
              <History size={26} />
            </div>
            <div className="page-header-text">
              <div className="page-header-badge">
                <Layers size={13} />
                <span>Harvest Records Archive</span>
              </div>
              <h1 className="page-header-title">Field Scan History</h1>
              <p className="page-header-desc">
                Chronological log of all paddy field image classifications, confidence levels, and harvest recommendations.
              </p>
            </div>
          </div>
          <button
            id="btn-export-csv"
            className="btn btn--secondary btn--sm"
            onClick={handleExport}
            title="Export history as CSV"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', whiteSpace: 'nowrap' }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </header>

        <ClassificationHistory />
      </div>
    </div>
  )
}
