/**
 * harvestAnalytics.ts
 * -------------------
 * Analytical engine for the Abra Province Rice Harvest Study.
 *
 * Provides:
 * - Temporal breakdown: Month, Day of week, Time-of-day (lighting context)
 * - Agro-climatic seasons in Abra (Wet season: June–Nov; Dry season: Dec–May)
 * - Harvest readiness timeline and projected harvest window
 * - Abra Province 27 Municipalities reference & distribution
 */

import { type ClassificationResult } from './api'

export const ABRA_MUNICIPALITIES = [
  'Bangued (Capital)',
  'Boliney',
  'Bucay',
  'Bucloc',
  'Daguioman',
  'Danglas',
  'Dolores',
  'La Paz',
  'Lacub',
  'Lagangilang',
  'Lagayan',
  'Langiden',
  'Licuan-Baay',
  'Luba',
  'Malibcong',
  'Manabo',
  'Peñarrubia',
  'Pidigan',
  'Pilar',
  'Sallapadan',
  'San Isidro',
  'San Juan',
  'San Quintin',
  'Tayum',
  'Tineg',
  'Tubo',
  'Villaviciosa',
] as const

export type TimeOfDayPeriod = 'Early Morning' | 'Midday' | 'Afternoon' | 'Evening / Night'

export interface HarvestWindowInfo {
  status: 'Ready Now' | 'Nearly Mature (7–14 days)' | 'Immature (21–35 days)'
  color: string
  bgColor: string
  borderColor: string
  daysEstimate: string
  actionAdvice: string
}

export interface TemporalDetail {
  monthName: string
  monthShort: string
  dayOfWeek: string
  dayOfMonth: number
  year: number
  timeString: string
  timePeriod: TimeOfDayPeriod
  season: 'Wet Season (Tag-ulan)' | 'Dry Season (Tag-araw)'
  seasonPeak: boolean
}

export interface AbraHarvestStudySummary {
  totalScans: number
  currentSeason: string
  currentSeasonNote: string
  readyNowCount: number
  nearlyMatureCount: number
  immatureCount: number
  latestScan: {
    result: ClassificationResult
    temporal: TemporalDetail
    window: HarvestWindowInfo
  } | null
  byMonth: { month: string; count: number; readyCount: number }[]
  byDayOfWeek: { day: string; count: number }[]
  byTimePeriod: { period: TimeOfDayPeriod; count: number; description: string }[]
  byMunicipality: { municipality: string; count: number }[]
  monitoredMuniCount: number
  muniCoveragePct: number
}

/**
 * Maps a classification maturity label to an estimated harvest timeline in Abra.
 */
export function getHarvestWindowInfo(label: string): HarvestWindowInfo {
  if (label === 'Ready for Harvest') {
    return {
      status: 'Ready Now',
      color: '#15803d',
      bgColor: '#dcfce7',
      borderColor: '#86efac',
      daysEstimate: '0 – 3 days (Immediate)',
      actionAdvice: 'Drain paddy water immediately and prepare threshers / mechanical harvesters.',
    }
  } else if (label === 'Nearly Mature') {
    return {
      status: 'Nearly Mature (7–14 days)',
      color: '#b45309',
      bgColor: '#fef3c7',
      borderColor: '#fde68a',
      daysEstimate: '7 – 14 days',
      actionAdvice: 'Terminal drainage recommended 7–10 days before target harvest date.',
    }
  } else {
    return {
      status: 'Immature (21–35 days)',
      color: '#1d4ed8',
      bgColor: '#dbeafe',
      borderColor: '#bfdbfe',
      daysEstimate: '21 – 35 days',
      actionAdvice: 'Grain filling stage. Maintain shallow water level (3–5 cm) to support grain formation.',
    }
  }
}

/**
 * Extracts comprehensive temporal details (Month, Day, Time, Abra Season) from an ISO timestamp.
 */
export function getTemporalDetail(isoString: string): TemporalDetail {
  const d = new Date(isoString)
  const monthIdx = d.getMonth() // 0 = Jan, 9 = Oct
  const hour = d.getHours()

  // Months in Abra
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Time-of-day classification for photography/research
  let timePeriod: TimeOfDayPeriod = 'Midday'
  if (hour >= 5 && hour < 9) {
    timePeriod = 'Early Morning'
  } else if (hour >= 9 && hour < 14) {
    timePeriod = 'Midday'
  } else if (hour >= 14 && hour < 18) {
    timePeriod = 'Afternoon'
  } else {
    timePeriod = 'Evening / Night'
  }

  // Abra Agro-climatic Cropping Cycles
  // Wet Season: June (month 5) to November (month 10), peak harvesting in Oct-Nov
  // Dry Season: December (month 11) to May (month 4), peak harvesting in Mar-Apr
  const isWetSeason = monthIdx >= 5 && monthIdx <= 10
  const isPeak = (isWetSeason && (monthIdx === 9 || monthIdx === 10)) || (!isWetSeason && (monthIdx === 2 || monthIdx === 3))

  return {
    monthName: monthNames[monthIdx],
    monthShort: monthShorts[monthIdx],
    dayOfWeek: daysOfWeek[d.getDay()],
    dayOfMonth: d.getDate(),
    year: d.getFullYear(),
    timeString: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timePeriod,
    season: isWetSeason ? 'Wet Season (Tag-ulan)' : 'Dry Season (Tag-araw)',
    seasonPeak: isPeak,
  }
}

/**
 * Computes aggregated research statistics for the Abra Province Rice Study.
 */
export function calculateAbraHarvestSummary(scans: ClassificationResult[]): AbraHarvestStudySummary {
  const now = new Date()
  const currentMonth = now.getMonth()
  const isCurrentWet = currentMonth >= 5 && currentMonth <= 10
  const currentSeason = isCurrentWet ? 'Wet Season (Tag-ulan)' : 'Dry Season (Tag-araw)'
  const currentSeasonNote = isCurrentWet
    ? 'Main crop cycle in Abra. Peak harvesting window occurs October–November.'
    : 'Irrigated dry crop cycle in Abra. Harvesting window occurs March–May.'

  let readyNowCount = 0
  let nearlyMatureCount = 0
  let immatureCount = 0

  const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthMap: Record<string, { count: number; readyCount: number }> = {}
  monthShorts.forEach(m => { monthMap[m] = { count: 0, readyCount: 0 } })

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayMap: Record<string, number> = {}
  daysOfWeek.forEach(d => { dayMap[d] = 0 })

  const timePeriodMap: Record<TimeOfDayPeriod, number> = {
    'Early Morning': 0,
    'Midday': 0,
    'Afternoon': 0,
    'Evening / Night': 0,
  }

  const muniMap: Record<string, number> = {}

  scans.forEach(scan => {
    if (scan.label === 'Ready for Harvest') readyNowCount++
    else if (scan.label === 'Nearly Mature') nearlyMatureCount++
    else immatureCount++

    const temporal = getTemporalDetail(scan.created_at)
    if (monthMap[temporal.monthShort]) {
      monthMap[temporal.monthShort].count++
      if (scan.label === 'Ready for Harvest') {
        monthMap[temporal.monthShort].readyCount++
      }
    }

    const shortDay = temporal.dayOfWeek.slice(0, 3)
    if (dayMap[shortDay] !== undefined) {
      dayMap[shortDay]++
    }

    if (timePeriodMap[temporal.timePeriod] !== undefined) {
      timePeriodMap[temporal.timePeriod]++
    }

    // Municipality extraction
    if (scan.location) {
      const loc = scan.location.trim()
      muniMap[loc] = (muniMap[loc] || 0) + 1
    }
  })

  // Latest scan
  let latestScan = null
  if (scans.length > 0) {
    const sorted = [...scans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const first = sorted[0]
    latestScan = {
      result: first,
      temporal: getTemporalDetail(first.created_at),
      window: getHarvestWindowInfo(first.label),
    }
  }

  const byMonth = monthShorts.map(m => ({
    month: m,
    count: monthMap[m].count,
    readyCount: monthMap[m].readyCount,
  }))

  const byDayOfWeek = daysOfWeek.map(d => ({
    day: d,
    count: dayMap[d],
  }))

  const byTimePeriod: { period: TimeOfDayPeriod; count: number; description: string }[] = [
    { period: 'Early Morning', count: timePeriodMap['Early Morning'], description: '05:00–09:00 (Gentle dew & morning lighting)' },
    { period: 'Midday', count: timePeriodMap['Midday'], description: '09:00–14:00 (Full sunlight / peak brightness)' },
    { period: 'Afternoon', count: timePeriodMap['Afternoon'], description: '14:00–18:00 (Golden hour lighting)' },
    { period: 'Evening / Night', count: timePeriodMap['Evening / Night'], description: '18:00–21:00 (Indoor / artificial light)' },
  ]

  const byMunicipality = Object.entries(muniMap)
    .map(([municipality, count]) => ({ municipality, count }))
    .sort((a, b) => b.count - a.count)

  const monitoredMuniCount = byMunicipality.length
  const muniCoveragePct = Math.round((monitoredMuniCount / ABRA_MUNICIPALITIES.length) * 100)

  return {
    totalScans: scans.length,
    currentSeason,
    currentSeasonNote,
    readyNowCount,
    nearlyMatureCount,
    immatureCount,
    latestScan,
    byMonth,
    byDayOfWeek,
    byTimePeriod,
    byMunicipality,
    monitoredMuniCount,
    muniCoveragePct,
  }
}

/**
 * Filter scans by month short name (e.g. 'Oct')
 */
export function filterScansByMonth(scans: ClassificationResult[], monthShort: string): ClassificationResult[] {
  return scans.filter(s => getTemporalDetail(s.created_at).monthShort === monthShort)
}

/**
 * Filter scans by day of week short name (e.g. 'Mon')
 */
export function filterScansByDay(scans: ClassificationResult[], dayShort: string): ClassificationResult[] {
  return scans.filter(s => getTemporalDetail(s.created_at).dayOfWeek.startsWith(dayShort))
}

/**
 * Filter scans by lighting period
 */
export function filterScansByTimePeriod(scans: ClassificationResult[], period: TimeOfDayPeriod): ClassificationResult[] {
  return scans.filter(s => getTemporalDetail(s.created_at).timePeriod === period)
}

/**
 * Filter scans by maturity classification label
 */
export function filterScansByMaturity(scans: ClassificationResult[], label: string): ClassificationResult[] {
  return scans.filter(s => s.label === label)
}

/**
 * Filter scans by Abra municipality or location substring
 */
export function filterScansByMunicipality(scans: ClassificationResult[], municipality: string): ClassificationResult[] {
  const query = municipality.toLowerCase()
  return scans.filter(s => s.location && s.location.toLowerCase().includes(query))
}
