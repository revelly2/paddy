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

export interface ClassificationResult {
  id:            string
  label:         string          // "Immature" | "Nearly Mature" | "Ready for Harvest"
  label_key:     string          // "Immature" | "Nearly_Mature" | "Ready_for_Harvest"
  confidence:    number          // 0.0 – 1.0
  probabilities: ProbabilityMap
  advice:        string
  image_url:     string | null
  image_path:    string
  notes:         string | null
  location:      string | null
  created_at:    string
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

export type MaturityLabel = 'Immature' | 'Nearly Mature' | 'Ready for Harvest'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || ''

/**
 * Get the current user's Supabase JWT for Authorization headers.
 * Returns null if the user is not logged in.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated. Please log in.')
  return { Authorization: `Bearer ${token}` }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authHeaders = await getAuthHeader()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
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
  const authHeaders = await getAuthHeader()

  const formData = new FormData()
  formData.append('file', file)
  if (notes)    formData.append('notes',    notes)
  if (location) formData.append('location', location)

  // Don't set Content-Type manually — browser sets it with the correct
  // multipart boundary when using FormData.
  const res = await fetch(`${BASE_URL}/api/classify`, {
    method:  'POST',
    headers: authHeaders,
    body:    formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<ClassificationResult>
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

// ---------------------------------------------------------------------------
// Label utilities
// ---------------------------------------------------------------------------

/** Colour config for each maturity label — used in UI badges and cards */
export const LABEL_CONFIG: Record<string, {
  color:      string
  bgColor:    string
  borderColor: string
  emoji:      string
  tagline:    string
}> = {
  'Immature': {
    color:       '#15803d',
    bgColor:     '#dcfce7',
    borderColor: '#86efac',
    emoji:       '🌱',
    tagline:     'Too early to harvest',
  },
  'Nearly Mature': {
    color:       '#b45309',
    bgColor:     '#fef3c7',
    borderColor: '#fcd34d',
    emoji:       '🌾',
    tagline:     'Almost ready — monitor daily',
  },
  'Ready for Harvest': {
    color:       '#b91c1c',
    bgColor:     '#fee2e2',
    borderColor: '#fca5a5',
    emoji:       '🏆',
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
