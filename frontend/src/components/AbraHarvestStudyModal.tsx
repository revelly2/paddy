import { useState } from 'react'
import {
  X, Calendar, Clock, Sun, MapPin, Download, CheckCircle,
  AlertTriangle, Hourglass, BarChart3, Info, Sprout, Filter,
  RefreshCw, Check, Layers
} from 'lucide-react'
import {
  type AbraHarvestStudySummary,
  getHarvestWindowInfo,
  getTemporalDetail,
  ABRA_MUNICIPALITIES,
} from '../lib/harvestAnalytics'
import { type ClassificationResult, formatConfidence } from '../lib/api'

interface AbraHarvestStudyModalProps {
  isOpen: boolean
  onClose: () => void
  summary: AbraHarvestStudySummary
  scans: ClassificationResult[]
  onRefresh?: () => Promise<void> | void
}

type FilterType = 'none' | 'month' | 'day' | 'lighting' | 'maturity' | 'municipality'

export default function AbraHarvestStudyModal({
  isOpen,
  onClose,
  summary,
  scans,
  onRefresh,
}: AbraHarvestStudyModalProps) {
  const [activeTab, setActiveTab] = useState<'temporal' | 'harvest' | 'municipalities'>('temporal')
  const [filterType, setFilterType] = useState<FilterType>('none')
  const [filterValue, setFilterValue] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  if (!isOpen) return null

  // Manual refresh handler
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return
    setIsRefreshing(true)
    try {
      await onRefresh()
      setToastMessage('Harvest study data re-synced')
      setTimeout(() => setToastMessage(null), 3000)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter toggle
  const toggleFilter = (type: FilterType, val: string) => {
    if (filterType === type && filterValue === val) {
      setFilterType('none')
      setFilterValue(null)
    } else {
      setFilterType(type)
      setFilterValue(val)
    }
  }

  const clearFilter = () => {
    setFilterType('none')
    setFilterValue(null)
  }

  // Filtered scans evaluation
  const filteredScans = scans.filter((s) => {
    if (filterType === 'none' || !filterValue) return true
    const temporal = getTemporalDetail(s.created_at)

    if (filterType === 'month') {
      return temporal.monthShort === filterValue
    }
    if (filterType === 'day') {
      return temporal.dayOfWeek.startsWith(filterValue)
    }
    if (filterType === 'lighting') {
      return temporal.timePeriod === filterValue
    }
    if (filterType === 'maturity') {
      return s.label === filterValue
    }
    if (filterType === 'municipality') {
      const loc = (s.location || '').toLowerCase()
      const query = filterValue.toLowerCase().replace(', abra', '').trim()
      return loc.includes(query)
    }
    return true
  })

  // Format filter label for UI banner
  const getFilterDescription = () => {
    if (filterType === 'none' || !filterValue) return null
    if (filterType === 'month') return `Month: ${filterValue}`
    if (filterType === 'day') return `Day of Week: ${filterValue}`
    if (filterType === 'lighting') return `Lighting Condition: ${filterValue}`
    if (filterType === 'maturity') return `Maturity: ${filterValue}`
    if (filterType === 'municipality') return `Municipality: ${filterValue}`
    return null
  }

  // Comprehensive Thesis CSV Export
  const handleExportThesisData = () => {
    try {
      const headers = [
        'Scan ID',
        'Date Recorded (PH Standard Time)',
        'Created At (ISO UTC)',
        'Year',
        'Month',
        'Day of Month',
        'Day of Week',
        'Time of Day',
        'Lighting Period',
        'Abra Cropping Season',
        'Season Harvest Peak Window',
        'Maturity Classification',
        'Model Confidence',
        'Immature Probability (%)',
        'Nearly Mature Probability (%)',
        'Ready for Harvest Probability (%)',
        'Detected Panicle Count',
        'Estimated Harvest Window',
        'Management Action Advice',
        'Abra Municipality / Field Location',
        'Farmer Field Notes / Variety',
        'Original Image URL',
        'Annotated Detection Overlay URL',
      ]

      const rows = scans.map((s) => {
        const temporal = getTemporalDetail(s.created_at)
        const harvest = getHarvestWindowInfo(s.label)
        const probs = s.probabilities || { Immature: 0, Nearly_Mature: 0, Ready_for_Harvest: 0 }

        return [
          s.id,
          new Date(s.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          s.created_at,
          temporal.year,
          temporal.monthName,
          temporal.dayOfMonth,
          temporal.dayOfWeek,
          temporal.timeString,
          temporal.timePeriod,
          temporal.season,
          temporal.seasonPeak ? 'Peak Harvest Month' : 'Non-Peak',
          s.label,
          formatConfidence(s.confidence),
          (probs.Immature * 100).toFixed(1) + '%',
          (probs.Nearly_Mature * 100).toFixed(1) + '%',
          (probs.Ready_for_Harvest * 100).toFixed(1) + '%',
          s.panicle_count != null ? s.panicle_count : 'N/A',
          harvest.daysEstimate,
          harvest.actionAdvice.replace(/"/g, '""'),
          s.location ?? 'Abra (General)',
          (s.notes ?? '').replace(/"/g, '""'),
          s.image_url ?? '',
          s.annotated_image_url ?? '',
        ]
      })

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.map((col) => `"${col}"`).join(',')),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Abra_Rice_Harvest_Study_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setToastMessage(`Exported Abra Harvest Study dataset (${scans.length} records)`)
      setTimeout(() => setToastMessage(null), 3500)
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`)
    }
  }

  const maxMonthCount = Math.max(...summary.byMonth.map((m) => m.count), 1)
  const maxDayCount = Math.max(...summary.byDayOfWeek.map((d) => d.count), 1)
  const maxTimeCount = Math.max(...summary.byTimePeriod.map((t) => t.count), 1)

  return (
    <div className="abra-modal-overlay" onClick={onClose}>
      <div className="abra-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Toast feedback */}
        {toastMessage && (
          <div className="abra-toast-banner" role="status">
            <Check size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="abra-modal-header">
          <div className="abra-modal-header-title">
            <div className="abra-modal-icon-badge">
              <Sprout size={22} color="#16a34a" />
            </div>
            <div>
              <h3>Abra Province Rice Harvest Study</h3>
              <p>Temporal Analysis, Phenology & Harvest Scheduling • CAR, Philippines</p>
            </div>
          </div>
          <div className="abra-modal-header-actions">
            {onRefresh && (
              <button
                type="button"
                className="abra-modal-refresh"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Sync latest field scans"
                aria-label="Sync latest field scans"
              >
                <RefreshCw size={17} className={isRefreshing ? 'spin-icon' : ''} />
              </button>
            )}
            <button className="abra-modal-close" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Season Banner */}
        <div className="abra-season-banner">
          <div className="abra-season-banner-badge">
            <Calendar size={16} />
            <span>Active Abra Season: <strong>{summary.currentSeason}</strong></span>
          </div>
          <p className="abra-season-banner-note">{summary.currentSeasonNote}</p>
        </div>

        {/* Quick Nav Tabs */}
        <div className="abra-modal-tabs">
          <button
            className={`abra-modal-tab ${activeTab === 'temporal' ? 'active' : ''}`}
            onClick={() => setActiveTab('temporal')}
          >
            <Clock size={16} />
            Temporal Breakdown (Month / Day / Time)
          </button>
          <button
            className={`abra-modal-tab ${activeTab === 'harvest' ? 'active' : ''}`}
            onClick={() => setActiveTab('harvest')}
          >
            <BarChart3 size={16} />
            Harvest Readiness Timeline
          </button>
          <button
            className={`abra-modal-tab ${activeTab === 'municipalities' ? 'active' : ''}`}
            onClick={() => setActiveTab('municipalities')}
          >
            <MapPin size={16} />
            Abra Municipalities ({summary.byMunicipality.length || 0})
          </button>
        </div>

        {/* Body content */}
        <div className="abra-modal-body">
          {activeTab === 'temporal' && (
            <div className="abra-temporal-section">
              {/* Month Distribution */}
              <div className="abra-card">
                <div className="abra-card-header">
                  <div className="abra-card-title">
                    <Calendar size={18} color="#16a34a" />
                    <h4>Scans & Harvest By Month</h4>
                  </div>
                  <span className="abra-badge-sub">Wet Season Harvest Peak: Oct–Nov</span>
                </div>
                <p className="abra-card-desc">
                  Distribution of paddy field image captures across months. Click any month column to inspect scans recorded in that month.
                </p>
                <div className="abra-bar-chart">
                  {summary.byMonth.map((m) => {
                    const pct = Math.round((m.count / maxMonthCount) * 100)
                    const isHarvestPeak = m.month === 'Oct' || m.month === 'Nov' || m.month === 'Mar' || m.month === 'Apr'
                    const isSelected = filterType === 'month' && filterValue === m.month
                    return (
                      <div
                        key={m.month}
                        className={`abra-bar-col ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleFilter('month', m.month)}
                        role="button"
                        tabIndex={0}
                        title={`Click to filter scans from ${m.month} (${m.count} scans)`}
                        onKeyDown={(e) => e.key === 'Enter' && toggleFilter('month', m.month)}
                      >
                        <span className="abra-bar-value">{m.count > 0 ? m.count : ''}</span>
                        <div className="abra-bar-track">
                          <div
                            className={`abra-bar-fill ${isHarvestPeak ? 'peak' : ''} ${isSelected ? 'selected' : ''}`}
                            style={{ height: `${Math.max(pct, m.count > 0 ? 10 : 0)}%` }}
                          />
                        </div>
                        <span className={`abra-bar-label ${isHarvestPeak ? 'label-peak' : ''} ${isSelected ? 'label-selected' : ''}`}>{m.month}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Day of Week & Time of Day 2-col */}
              <div className="abra-two-col">
                {/* Day of Week */}
                <div className="abra-card">
                  <div className="abra-card-header">
                    <div className="abra-card-title">
                      <Calendar size={18} color="#d97706" />
                      <h4>By Day of Week</h4>
                    </div>
                  </div>
                  <p className="abra-card-desc">Field monitoring frequency across weekdays. Click to filter.</p>
                  <div className="abra-horizontal-list">
                    {summary.byDayOfWeek.map((d) => {
                      const pct = Math.round((d.count / maxDayCount) * 100)
                      const isSelected = filterType === 'day' && filterValue === d.day
                      return (
                        <div
                          key={d.day}
                          className={`abra-h-item ${isSelected ? 'active' : ''}`}
                          onClick={() => toggleFilter('day', d.day)}
                          role="button"
                          tabIndex={0}
                          title={`Filter by ${d.day} (${d.count} scans)`}
                          onKeyDown={(e) => e.key === 'Enter' && toggleFilter('day', d.day)}
                        >
                          <span className="abra-h-name">{d.day}</span>
                          <div className="abra-h-bar-wrap">
                            <div className={`abra-h-bar-fill ${isSelected ? 'selected' : ''}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="abra-h-count">{d.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Time of Day */}
                <div className="abra-card">
                  <div className="abra-card-header">
                    <div className="abra-card-title">
                      <Sun size={18} color="#f59e0b" />
                      <h4>By Time of Day (Lighting)</h4>
                    </div>
                  </div>
                  <p className="abra-card-desc">Lighting conditions during photograph acquisition. Click to filter.</p>
                  <div className="abra-horizontal-list">
                    {summary.byTimePeriod.map((t) => {
                      const pct = Math.round((t.count / maxTimeCount) * 100)
                      const isSelected = filterType === 'lighting' && filterValue === t.period
                      return (
                        <div
                          key={t.period}
                          className={`abra-h-item ${isSelected ? 'active' : ''}`}
                          onClick={() => toggleFilter('lighting', t.period)}
                          role="button"
                          tabIndex={0}
                          title={`Filter by ${t.period} (${t.count} scans)`}
                          onKeyDown={(e) => e.key === 'Enter' && toggleFilter('lighting', t.period)}
                        >
                          <div className="abra-h-info">
                            <span className="abra-h-name">{t.period}</span>
                            <span className="abra-h-sub">{t.description}</span>
                          </div>
                          <div className="abra-h-bar-wrap">
                            <div className={`abra-h-bar-fill time-fill ${isSelected ? 'selected' : ''}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="abra-h-count">{t.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'harvest' && (
            <div className="abra-harvest-section">
              {/* Readiness Breakdown Cards */}
              <div className="abra-readiness-grid">
                <div
                  className={`abra-readiness-card ready ${filterType === 'maturity' && filterValue === 'Ready for Harvest' ? 'active' : ''}`}
                  onClick={() => toggleFilter('maturity', 'Ready for Harvest')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleFilter('maturity', 'Ready for Harvest')}
                >
                  <div className="abra-readiness-icon"><CheckCircle size={24} /></div>
                  <div className="abra-readiness-metric">{summary.readyNowCount}</div>
                  <div className="abra-readiness-title">Ready for Harvest Now</div>
                  <div className="abra-readiness-window">Window: 0 – 3 Days</div>
                  <p className="abra-readiness-desc">80–85% golden yellow panicles. Recommended for immediate harvesting to avoid shattering loss.</p>
                </div>

                <div
                  className={`abra-readiness-card nearly ${filterType === 'maturity' && filterValue === 'Nearly Mature' ? 'active' : ''}`}
                  onClick={() => toggleFilter('maturity', 'Nearly Mature')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleFilter('maturity', 'Nearly Mature')}
                >
                  <div className="abra-readiness-icon"><AlertTriangle size={24} /></div>
                  <div className="abra-readiness-metric">{summary.nearlyMatureCount}</div>
                  <div className="abra-readiness-title">Nearly Mature Fields</div>
                  <div className="abra-readiness-window">Window: 7 – 14 Days</div>
                  <p className="abra-readiness-desc">Hard dough ripening phase. Drain paddy fields 7–10 days before target cutting date.</p>
                </div>

                <div
                  className={`abra-readiness-card immature ${filterType === 'maturity' && filterValue === 'Immature' ? 'active' : ''}`}
                  onClick={() => toggleFilter('maturity', 'Immature')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleFilter('maturity', 'Immature')}
                >
                  <div className="abra-readiness-icon"><Hourglass size={24} /></div>
                  <div className="abra-readiness-metric">{summary.immatureCount}</div>
                  <div className="abra-readiness-title">Immature Fields</div>
                  <div className="abra-readiness-window">Window: 21 – 35 Days</div>
                  <p className="abra-readiness-desc">Grain filling stage. Keep shallow water (3–5 cm) to support panicle development.</p>
                </div>
              </div>

              {/* Latest Field Temporal Scan */}
              {summary.latestScan && (
                <div className="abra-latest-card">
                  <div className="abra-latest-header">
                    <h4>Most Recent Abra Field Scan</h4>
                    <span className="abra-latest-tag" style={{ background: summary.latestScan.window.bgColor, color: summary.latestScan.window.color, borderColor: summary.latestScan.window.borderColor }}>
                      {summary.latestScan.result.label}
                    </span>
                  </div>
                  <div className="abra-latest-grid">
                    <div>
                      <span className="abra-latest-k">Month & Date:</span>
                      <strong className="abra-latest-v">{summary.latestScan.temporal.monthName} {summary.latestScan.temporal.dayOfMonth}, {summary.latestScan.temporal.year} ({summary.latestScan.temporal.dayOfWeek})</strong>
                    </div>
                    <div>
                      <span className="abra-latest-k">Harvest Forecast:</span>
                      <strong className="abra-latest-v" style={{ color: summary.latestScan.window.color }}>{summary.latestScan.window.daysEstimate}</strong>
                    </div>
                    <div>
                      <span className="abra-latest-k">Location:</span>
                      <strong className="abra-latest-v">{summary.latestScan.result.location || 'Abra Province, CAR'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'municipalities' && (
            <div className="abra-muni-section">
              <div className="abra-card">
                <div className="abra-card-header">
                  <div className="abra-card-title">
                    <MapPin size={18} color="#16a34a" />
                    <h4>Abra Municipalities Monitored</h4>
                  </div>
                  <span className="abra-badge-sub">
                    {summary.monitoredMuniCount} of {ABRA_MUNICIPALITIES.length} Towns ({summary.muniCoveragePct}% Coverage)
                  </span>
                </div>
                <p className="abra-card-desc">
                  Breakdown of scanned rice parcels across municipalities in Abra. Click any municipality to view its field captures.
                </p>

                {summary.byMunicipality.length === 0 ? (
                  <div className="abra-empty-muni">
                    <Info size={20} className="muted" />
                    <p>No scans with specific Abra municipalities recorded yet. Select your Abra municipality when classifying new images!</p>
                  </div>
                ) : (
                  <div className="abra-muni-grid">
                    {summary.byMunicipality.map((m) => {
                      const isSelected = filterType === 'municipality' && filterValue === m.municipality
                      return (
                        <div
                          key={m.municipality}
                          className={`abra-muni-pill ${isSelected ? 'active' : ''}`}
                          onClick={() => toggleFilter('municipality', m.municipality)}
                          role="button"
                          tabIndex={0}
                          title={`Click to filter scans from ${m.municipality}`}
                          onKeyDown={(e) => e.key === 'Enter' && toggleFilter('municipality', m.municipality)}
                        >
                          <MapPin size={14} color="#15803d" />
                          <span className="muni-name">{m.municipality}</span>
                          <span className="muni-count">{m.count} scan{m.count !== 1 ? 's' : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="abra-muni-reference">
                  <h5>Reference: All 27 Municipalities of Abra (Click town to filter)</h5>
                  <div className="abra-muni-tags">
                    {ABRA_MUNICIPALITIES.map((town) => {
                      const hasScans = summary.byMunicipality.some(m => m.municipality.toLowerCase().includes(town.toLowerCase()))
                      const isSelected = filterType === 'municipality' && filterValue?.toLowerCase().includes(town.toLowerCase())
                      return (
                        <button
                          key={town}
                          type="button"
                          className={`abra-town-tag ${hasScans ? 'has-data' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleFilter('municipality', town)}
                        >
                          {town} {hasScans ? '✓' : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* Dynamic Filter Drill-down Section                             */}
          {/* ------------------------------------------------------------- */}
          {filterType !== 'none' && (
            <div className="abra-filter-drilldown">
              <div className="abra-filter-drilldown-header">
                <div className="abra-filter-pill-label">
                  <Filter size={15} />
                  <span>Showing {filteredScans.length} scans for: <strong>{getFilterDescription()}</strong></span>
                </div>
                <button
                  type="button"
                  className="abra-filter-clear-btn"
                  onClick={clearFilter}
                >
                  <X size={14} /> Clear Filter
                </button>
              </div>

              {filteredScans.length === 0 ? (
                <div className="abra-drilldown-empty">
                  <p>No matching scans recorded for this filter criteria.</p>
                </div>
              ) : (
                <div className="abra-drilldown-grid">
                  {filteredScans.map((scan) => {
                    const temporal = getTemporalDetail(scan.created_at)
                    const isReady = scan.label === 'Ready for Harvest'
                    const isNearly = scan.label === 'Nearly Mature'
                    const badgeClass = isReady ? 'ready' : isNearly ? 'nearly' : 'immature'

                    return (
                      <div key={scan.id} className="abra-scan-mini-card">
                        <div className="abra-scan-thumb">
                          {scan.image_url ? (
                            <img src={scan.image_url} alt="Paddy scan" />
                          ) : (
                            <div className="abra-scan-placeholder">
                              <Sprout size={18} color="#16a34a" />
                            </div>
                          )}
                        </div>
                        <div className="abra-scan-body">
                          <div className="abra-scan-top-row">
                            <span className={`abra-mini-badge ${badgeClass}`}>
                              {scan.label}
                            </span>
                            <span className="abra-scan-conf">
                              {formatConfidence(scan.confidence)}
                            </span>
                          </div>
                          <div className="abra-scan-meta-row">
                            <span title="Date and time of capture">
                              <Clock size={12} /> {temporal.monthShort} {temporal.dayOfMonth}, {temporal.year} • {temporal.timeString}
                            </span>
                          </div>
                          <div className="abra-scan-meta-row">
                            <span title="Field municipality">
                              <MapPin size={12} /> {scan.location || 'Abra Province'}
                            </span>
                            {scan.panicle_count != null && (
                              <span className="abra-panicle-pill" title="Detected grain panicles">
                                <Layers size={11} /> {scan.panicle_count} panicles
                              </span>
                            )}
                          </div>
                          {scan.notes && (
                            <p className="abra-scan-notes-preview">
                              "{scan.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="abra-modal-footer">
          <div className="abra-footer-left">
            <button
              className="btn btn--secondary"
              onClick={handleExportThesisData}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              title="Download full thesis analytical dataset in CSV format"
            >
              <Download size={16} />
              Export Abra Study Dataset (.CSV)
            </button>
            {filterType !== 'none' && (
              <span className="abra-footer-filter-count">
                Active Filter: {getFilterDescription()} ({filteredScans.length})
              </span>
            )}
          </div>
          <button className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
