/**
 * api.ts
 * ------
 * Typed API client for communicating with the FastAPI backend.
 *
 * All calls include the Supabase JWT in the Authorization header so the
 * backend can verify the user and enforce per-farmer data isolation.
 *
 * Base URL is read from VITE_API_BASE_URL (default: http://localhost:8000).
 * In production, point this to your deployed FastAPI server URL.
 *
 * During development, Vite proxies /api/* to localhost:8000 automatically,
 * so you can also leave VITE_API_BASE_URL empty and use relative paths.
 */

import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Types — mirror the Pydantic response schemas in backend/main.py
// ---------------------------------------------------------------------------

export interface ProbabilityMap {
  Immature:          number
  Nearly_Mature:     number
  Ready_for_Harvest: number
}

export interface PanicleDetail {
  id:              number
  bbox:            number[]
  detection_conf:  number
  green_ratio:     number
  mature_ratio:    number
  label:           string
  label_key:       string
  confidence:      number
}

export interface ClassificationResult {
  id:                   string
  label:                string          // "Immature" | "Nearly Mature" | "Ready for Harvest"
  label_key:            string          // "Immature" | "Nearly_Mature" | "Ready_for_Harvest"
  confidence:           number          // 0.0 – 1.0
  probabilities:        ProbabilityMap
  advice:               string
  image_url:            string | null
  image_path:           string
  notes:                string | null
  location:             string | null
  created_at:           string
  panicle_count?:       number | null
  panicle_details?:     PanicleDetail[] | null
  annotated_image_url?: string | null
}

export interface ClassificationListResponse {
  data:  ClassificationResult[]
  total: number
  page:  number
  limit: number
}

export interface StatsResponse {
  total_scans:        number
  ready_for_harvest:  number
  nearly_mature:      number
  immature:           number
  avg_confidence_pct: number
  last_scan_at:       string | null
}

export interface HealthResponse {
  status:       string
  model_loaded: boolean
  supabase_url: string
  timestamp:    string
}

export interface NewsItem {
  title: string
  link: string
  description: string
  pubDate: string
  image_url: string | null
}

export interface NewsResponse {
  status: string
  items: NewsItem[]
}

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user' | string
  region?: string | null
  farm_name?: string | null
  scan_count: number
  created_at: string
  last_sign_in_at?: string | null
}

export interface AdminStats {
  total_users: number
  total_scans: number
  ready_for_harvest_count: number
  nearly_mature_count: number
  immature_count: number
  avg_confidence_pct: number
  active_municipalities_count: number
  model_ready: boolean
  total_content_items: number
  published_content_items: number
}

export interface ContentItem {
  id: string
  title: string
  category: string
  summary: string
  content: string
  author: string
  status: 'Published' | 'Draft'
  priority: 'High' | 'Normal' | 'Low'
  target_municipality?: string | null
  image_url?: string | null
  created_at: string
  updated_at: string
}

export type MaturityLabel = 'Immature' | 'Nearly Mature' | 'Ready for Harvest'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || ''

/**
 * Get the current user's Supabase JWT for Authorization headers.
 * Automatically refreshes the session if expiring soon or if forced.
 */
async function getAuthHeader(forceRefresh = false): Promise<Record<string, string>> {
  let session = (await supabase.auth.getSession()).data.session

  const nowInSec = Math.floor(Date.now() / 1000)
  const isExpiringSoon = session?.expires_at ? session.expires_at <= nowInSec + 120 : false

  if (forceRefresh || !session?.access_token || isExpiringSoon) {
    try {
      const { data: refreshed, error } = await supabase.auth.refreshSession()
      if (!error && refreshed?.session) {
        session = refreshed.session
      }
    } catch {
      // Proceed with existing session if refresh fails
    }
  }

  const token = session?.access_token
  if (!token) throw new Error('Not authenticated. Please log in.')
  return { Authorization: `Bearer ${token}` }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let authHeaders = await getAuthHeader()
  const doFetch = (headers: Record<string, string>) =>
    fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers ?? {}),
      },
    })

  try {
    let res = await doFetch(authHeaders)

    // Proactively handle expired sessions: refresh Supabase token and retry once
    if (res.status === 401) {
      try {
        const freshHeaders = await getAuthHeader(true)
        res = await doFetch(freshHeaders)
      } catch {
        // Fall through to error response handling
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      const detail = (err as { detail?: string }).detail
      if (res.status === 401) {
        throw new Error('Your session has expired. Please sign out and log back in.')
      }
      throw new Error(detail ?? `HTTP ${res.status}`)
    }

    return res.json() as Promise<T>
  } catch (err: any) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      if (!BASE_URL || BASE_URL.includes('localhost')) {
        throw new Error(
          'Cannot reach backend server. Please configure VITE_API_BASE_URL in your Vercel project environment variables with your live backend URL.'
        )
      } else {
        throw new Error(
          `Unable to connect to backend at ${BASE_URL}. The server may be asleep or unreachable.`
        )
      }
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Upload an image file to the backend for CNN classification.
 *
 * @param file     - The image File object (from file input or dropzone)
 * @param notes    - Optional farmer notes
 * @param location - Optional location / barangay
 */
export async function classifyImage(
  file:     File,
  notes?:   string,
  location?: string,
): Promise<ClassificationResult> {
  let authHeaders = await getAuthHeader()

  const formData = new FormData()
  formData.append('file', file)
  if (notes)    formData.append('notes',    notes)
  if (location) formData.append('location', location)

  const url = location
    ? `${BASE_URL}/api/classify?location=${encodeURIComponent(location)}`
    : `${BASE_URL}/api/classify`

  const doUpload = (headers: Record<string, string>) =>
    fetch(url, {
      method:  'POST',
      headers: headers,
      body:    formData,
    })

  // Don't set Content-Type manually — browser sets it with the correct
  // multipart boundary when using FormData.
  try {
    let res = await doUpload(authHeaders)

    // Proactively handle expired sessions: refresh Supabase token and retry upload once
    if (res.status === 401) {
      try {
        const freshHeaders = await getAuthHeader(true)
        res = await doUpload(freshHeaders)
      } catch {
        // Fall through to error response handling
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      const detail = (err as { detail?: string }).detail
      if (res.status === 401) {
        throw new Error('Your session has expired. Please sign out and log back in.')
      }
      throw new Error(detail ?? `HTTP ${res.status}`)
    }

    return res.json() as Promise<ClassificationResult>
  } catch (err: any) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      if (!BASE_URL || BASE_URL.includes('localhost')) {
        throw new Error(
          'Cannot reach backend server. In production on Vercel, please set VITE_API_BASE_URL to your live backend URL in Vercel project settings.'
        )
      } else {
        throw new Error(
          `Unable to connect to backend at ${BASE_URL}. If hosted on Render (free tier), it may need 30-60 seconds to wake up from sleep.`
        )
      }
    }
    throw err
  }
}

/**
 * Fetch the authenticated user's classification history.
 *
 * @param page  - Page number (1-based)
 * @param limit - Results per page (max 100)
 */
export async function listClassifications(
  page  = 1,
  limit = 20,
): Promise<ClassificationListResponse> {
  return apiFetch<ClassificationListResponse>(
    `/api/classifications?page=${page}&limit=${limit}`
  )
}

/**
 * Fetch a single classification record by ID.
 */
export async function getClassification(id: string): Promise<ClassificationResult> {
  return apiFetch<ClassificationResult>(`/api/classifications/${id}`)
}

/**
 * Delete a classification record and its stored image.
 */
export async function deleteClassification(id: string): Promise<void> {
  await apiFetch(`/api/classifications/${id}`, { method: 'DELETE' })
}

/**
 * Fetch aggregate statistics for the authenticated farmer.
 */
export async function getUserStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>('/api/stats')
}

/**
 * Health check — returns model status and Supabase connectivity.
 * No auth required.
 */
export async function healthCheck(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`)
  return res.json() as Promise<HealthResponse>
}

/**
 * Fetch agricultural news from the backend.
 */
export async function getAgNews(): Promise<NewsResponse> {
  return apiFetch<NewsResponse>('/api/news')
}

// ---------------------------------------------------------------------------
// Admin & Content Management API
// ---------------------------------------------------------------------------

/**
 * Fetch province-wide system statistics (Admin only).
 */
export async function getAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>('/api/admin/stats')
}

/**
 * Fetch all registered users and their scan stats (Admin only).
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/api/admin/users')
}

/**
 * Create a new user account (Admin only).
 */
export async function createAdminUser(data: {
  email: string
  password: string
  full_name?: string
  role?: string
  region?: string
  farm_name?: string
}): Promise<AdminUser> {
  return apiFetch<AdminUser>('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/**
 * Update user details or role (Admin only).
 */
export async function updateAdminUser(
  userId: string,
  updates: Partial<Pick<AdminUser, 'full_name' | 'role' | 'region' | 'farm_name'>>
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}

/**
 * Delete a user account (Admin only).
 */
export async function deleteAdminUser(userId: string): Promise<void> {
  await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
}

/**
 * List published agricultural advisories and notices (for all authenticated users).
 */
export async function listContent(params?: { category?: string; search?: string }): Promise<ContentItem[]> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.search) query.set('search', params.search)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return apiFetch<ContentItem[]>(`/api/content${qs}`)
}

/**
 * Get details for a specific advisory.
 */
export async function getContentItem(id: string): Promise<ContentItem> {
  return apiFetch<ContentItem>(`/api/content/${id}`)
}

/**
 * List all advisories including drafts (Admin only).
 */
export async function listAdminContent(params?: {
  category?: string
  status?: string
  search?: string
}): Promise<ContentItem[]> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.status) query.set('status', params.status)
  if (params?.search) query.set('search', params.search)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return apiFetch<ContentItem[]>(`/api/admin/content${qs}`)
}

/**
 * Create a new advisory item (Admin only).
 */
export async function createAdminContent(
  data: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>
): Promise<ContentItem> {
  return apiFetch<ContentItem>('/api/admin/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing advisory item (Admin only).
 */
export async function updateAdminContent(
  id: string,
  updates: Partial<Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<ContentItem> {
  return apiFetch<ContentItem>(`/api/admin/content/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}

/**
 * Delete an advisory item (Admin only).
 */
export async function deleteAdminContent(id: string): Promise<void> {
  await apiFetch(`/api/admin/content/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Label utilities
// ---------------------------------------------------------------------------

/** Colour config for each maturity label — used in UI badges and cards */
export const LABEL_CONFIG: Record<string, {
  color:      string
  bgColor:    string
  borderColor: string
  tagline:    string
}> = {
  'Immature': {
    color:       '#15803d',
    bgColor:     '#dcfce7',
    borderColor: '#86efac',
    tagline:     'Too early to harvest',
  },
  'Nearly Mature': {
    color:       '#b45309',
    bgColor:     '#fef3c7',
    borderColor: '#fcd34d',
    tagline:     'Almost ready — monitor daily',
  },
  'Ready for Harvest': {
    color:       '#b91c1c',
    bgColor:     '#fee2e2',
    borderColor: '#fca5a5',
    tagline:     'Harvest now!',
  },
}

export function getLabelConfig(label: string) {
  return LABEL_CONFIG[label] ?? LABEL_CONFIG['Immature']
}

/** Format confidence as a percentage string */
export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`
}
