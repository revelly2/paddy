/**
 * ImageUploader.tsx
 * -----------------
 * Upgraded with:
 * 1. Live Field Camera Capture (with rear camera facingMode, reticle guide & snapshot)
 * 2. GPS Location Auto-Detection with reverse-geocoding to Abra municipalities
 * 3. Enforced Mandatory Location validation (cannot analyze without a valid location)
 */

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import {
  Upload,
  ImageIcon,
  X,
  MapPin,
  FileText,
  Zap,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Camera,
  RefreshCw,
  Compass,
  Check,
  Crosshair,
  Smartphone,
} from 'lucide-react'
import PanicleScanVector from './vectors/PanicleScanVector'
import { ABRA_MUNICIPALITIES } from '../lib/harvestAnalytics'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// Coordinates for Abra Province reference points to calculate closest municipality
const ABRA_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'Bangued, Abra': { lat: 17.5977, lon: 120.6189 },
  'Bucay, Abra': { lat: 17.5367, lon: 120.7208 },
  'Dolores, Abra': { lat: 17.6522, lon: 120.7092 },
  'La Paz, Abra': { lat: 17.6769, lon: 120.6833 },
  'Lagangilang, Abra': { lat: 17.6156, lon: 120.7303 },
  'Peñarrubia, Abra': { lat: 17.5683, lon: 120.6489 },
  'Pidigan, Abra': { lat: 17.5658, lon: 120.5892 },
  'San Juan, Abra': { lat: 17.7289, lon: 120.7389 },
  'Tayum, Abra': { lat: 17.6186, lon: 120.6558 },
  'Villaviciosa, Abra': { lat: 17.4397, lon: 120.6272 },
  'Pilar, Abra': { lat: 17.4194, lon: 120.5972 },
  'Manabo, Abra': { lat: 17.4308, lon: 120.7039 },
  'San Quintin, Abra': { lat: 17.5383, lon: 120.5217 },
  'Langiden, Abra': { lat: 17.5833, lon: 120.5667 },
  'Danglas, Abra': { lat: 17.6978, lon: 120.6861 },
}

interface ImageUploaderProps {
  onSubmit: (file: File, notes?: string, location?: string) => void
  loading: boolean
  onClearError?: () => void
}

export default function ImageUploader({ onSubmit, loading, onClearError }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [locationError, setLocationError] = useState(false)

  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Geolocation states
  const [detectingGps, setDetectingGps] = useState(false)
  const [gpsSuccess, setGpsSuccess] = useState<string | null>(null)

  // Auto-detect GPS location helper
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setDetectingGps(true)
    setError(null)
    setLocationError(false)
    onClearError?.()

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        let formattedLocation = ''

        // 1. Try reverse geocoding via OpenStreetMap with timeout
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 4000)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`,
            { signal: controller.signal }
          )
          clearTimeout(timeoutId)

          if (res.ok) {
            const data = await res.json()
            const addr = data.address || {}
            const town = addr.town || addr.municipality || addr.city || addr.suburb || addr.village
            const state = addr.state || addr.province
            if (town) {
              formattedLocation = state ? `${town}, ${state}` : `${town}, Abra`
            }
          }
        } catch {
          // Timeout or offline fallback
        }

        // 2. If reverse geocoding did not return a town, calculate nearest Abra municipality
        if (!formattedLocation) {
          let closest = 'Bangued, Abra'
          let minDistance = Infinity

          for (const [name, coords] of Object.entries(ABRA_COORDINATES)) {
            const dist = Math.hypot(coords.lat - latitude, coords.lon - longitude)
            if (dist < minDistance) {
              minDistance = dist
              closest = name
            }
          }

          if (minDistance < 0.6) {
            formattedLocation = closest
          } else {
            formattedLocation = `Field GPS: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`
          }
        }

        setLocation(formattedLocation)
        setDetectingGps(false)
        setLocationError(false)
        setGpsSuccess(`GPS Detected: ${formattedLocation}`)
        setTimeout(() => setGpsSuccess(null), 5000)
      },
      (geoErr) => {
        setDetectingGps(false)
        console.warn('Geolocation warning:', geoErr.message)
        // Friendly notice without blocking manual entry
        setError('GPS coordinates could not be retrieved. Please type or pick your municipality.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }, [])

  // Start Camera Stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraLoading(true)
    setCameraError(null)
    setCameraOpen(true)

    // Automatically trigger GPS detection when opening camera if location is empty
    if (!location.trim()) {
      detectLocation()
    }

    try {
      // Stop any existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = newStream

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        await videoRef.current.play()
      }
    } catch (err: unknown) {
      console.error('Camera stream error:', err)
      const errName = (err as { name?: string }).name
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera permissions in your browser or use the file upload.')
      } else {
        setCameraError('Unable to access camera on this device. You can still upload photos from storage.')
      }
    } finally {
      setCameraLoading(false)
    }
  }

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
    setCameraError(null)
  }

  // Toggle Camera (Front / Back)
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  // Snap photo from video element
  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const photoFile = new File([blob], `panicle-cam-${timestamp}.jpg`, {
          type: 'image/jpeg',
        })

        setFile(photoFile)
        const url = URL.createObjectURL(photoFile)
        setPreview(url)
        stopCamera()
        onClearError?.()

        // Ensure location detection runs if still empty
        if (!location.trim()) {
          detectLocation()
        }
      },
      'image/jpeg',
      0.95
    )
  }

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // File dropzone handler
  const handleDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setError(null)

    if (rejected.length > 0) {
      const reason = rejected[0].errors[0]?.message ?? 'Invalid file format or size'
      setError(reason)
      return
    }

    const selected = accepted[0]
    if (!selected) return

    setFile(selected)
    const url = URL.createObjectURL(selected)
    setPreview(url)
    onClearError?.()

    // Prompt location auto-fill if empty
    if (!location.trim()) {
      detectLocation()
    }
  }, [location, detectLocation, onClearError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.webp'] },
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
    disabled: loading,
  })

  // Clear selected image
  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError(null)
    onClearError?.()
  }

  // Handle native mobile camera file input change
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      const captured = files[0]
      setFile(captured)
      setPreview(URL.createObjectURL(captured))
      onClearError?.()
      if (!location.trim()) {
        detectLocation()
      }
    }
  }

  // Strict Submit Form Validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!file) {
      setError('Please capture or upload a rice paddy photo before analyzing.')
      return
    }

    // MANDATORY LOCATION CHECK
    if (!location.trim()) {
      setError('Location is strictly required before running analysis. Please specify your Abra municipality or click Auto-Detect GPS.')
      setLocationError(true)
      const input = document.getElementById('input-location')
      if (input) {
        input.focus()
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setError(null)
    setLocationError(false)
    onSubmit(file, notes.trim() || undefined, location.trim())
  }

  return (
    <div className="uploader-root">
      {/* ---------------------------------------------------------------- */}
      {/* Live Camera Viewfinder Modal                                      */}
      {/* ---------------------------------------------------------------- */}
      {cameraOpen && (
        <div className="camera-modal-overlay" role="dialog" aria-modal="true">
          <div className="camera-modal-box">
            {/* Viewfinder Header */}
            <div className="camera-modal-header">
              <div className="camera-modal-badge">
                <Camera size={16} />
                <span>Field Camera Mode</span>
              </div>
              <button
                type="button"
                className="camera-close-btn"
                onClick={stopCamera}
                aria-label="Close camera"
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Viewfinder Area */}
            <div className="camera-viewfinder-wrap">
              {cameraLoading && (
                <div className="camera-viewfinder-loading">
                  <RefreshCw size={32} className="spin-icon" />
                  <p>Initializing camera sensors…</p>
                </div>
              )}

              {cameraError ? (
                <div className="camera-viewfinder-error">
                  <AlertCircle size={36} />
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => startCamera(facingMode)}
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  className="camera-video-stream"
                  playsInline
                  autoPlay
                  muted
                />
              )}

              {/* Reticle / Framing Target Guide */}
              {!cameraError && !cameraLoading && (
                <div className="camera-reticle-overlay">
                  <div className="camera-reticle-box">
                    <Crosshair size={28} className="camera-reticle-center" />
                    <span className="camera-reticle-hint">
                      Center grain heads here • Natural daylight
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Viewfinder Controls */}
            <div className="camera-modal-footer">
              <button
                type="button"
                className="camera-action-btn"
                onClick={toggleCameraFacing}
                title="Switch Camera (Front/Rear)"
              >
                <RefreshCw size={20} />
                <span>Flip</span>
              </button>

              <button
                type="button"
                className="camera-shutter-btn"
                onClick={capturePhoto}
                disabled={cameraLoading || !!cameraError}
                aria-label="Capture photo"
              >
                <div className="camera-shutter-inner" />
              </button>

              <button
                type="button"
                className="camera-action-btn"
                onClick={stopCamera}
              >
                <X size={20} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for native mobile device camera capture */}
      <input
        type="file"
        id="camera-native-input"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleNativeCameraCapture}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Main Upload / Camera Selector Form                                */}
      {/* ---------------------------------------------------------------- */}
      <form className="uploader-form-container" onSubmit={handleSubmit} noValidate>
        {/* Drop zone & capture triggers */}
        <div
          {...getRootProps()}
          id="dropzone"
          className={[
            'modern-dropzone',
            isDragActive ? 'modern-dropzone--drag' : '',
            file ? 'modern-dropzone--has-file' : '',
            loading ? 'modern-dropzone--disabled' : '',
          ].join(' ')}
          aria-label="Rice photo upload or camera area"
        >
          <input {...getInputProps()} id="file-input" aria-label="Rice photo file input" />

          {preview && file ? (
            /* Selected Image Preview */
            <div className="dropzone-preview-wrap">
              <div className="preview-image-box">
                <img src={preview} alt="Selected rice paddy panicle" className="preview-img-element" />
                <div className="preview-ready-chip">
                  <CheckCircle2 size={14} /> Ready for CNN Analysis
                </div>
              </div>

              <div className="preview-file-bar">
                <div className="preview-file-info">
                  <ImageIcon size={18} className="preview-icon" />
                  <span className="preview-filename">{file.name}</span>
                  <span className="preview-filesize">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                {!loading && (
                  <button
                    type="button"
                    id="btn-clear-image"
                    onClick={clearFile}
                    title="Remove selected image"
                    aria-label="Remove selected image"
                    className="preview-clear-btn"
                  >
                    <X size={18} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Empty State with Dual Triggers: Live Camera & File Upload */
            <div className="dropzone-empty-state">
              <div className="dropzone-vector-wrap">
                <PanicleScanVector width={88} height={88} />
              </div>

              <p className="dropzone-primary-text">
                {isDragActive ? 'Release to upload rice photo' : 'Capture or upload paddy photo'}
              </p>

              {/* Primary Dual Actions: Field Camera vs Browse File */}
              <div className="dropzone-actions-dual" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  id="btn-open-camera"
                  className="dropzone-btn-primary"
                  onClick={() => startCamera('environment')}
                >
                  <Camera size={16} />
                  <span>Take Photo with Camera</span>
                </button>

                <button
                  type="button"
                  className="dropzone-btn-secondary"
                  onClick={() => {
                    const input = document.getElementById('file-input')
                    if (input) input.click()
                  }}
                >
                  <Upload size={15} />
                  <span>Browse Storage</span>
                </button>

                <button
                  type="button"
                  className="dropzone-btn-mobile-cam"
                  title="Use mobile native camera"
                  onClick={() => {
                    const camInput = document.getElementById('camera-native-input')
                    if (camInput) camInput.click()
                  }}
                >
                  <Smartphone size={15} />
                  <span>Phone App</span>
                </button>
              </div>

              <div className="dropzone-pills">
                <span className="dropzone-pill">JPEG, PNG, WEBP</span>
                <span className="dropzone-pill-dot" />
                <span className="dropzone-pill">Max 10 MB</span>
                <span className="dropzone-pill-dot" />
                <span className="dropzone-pill">Direct Sun / Daylight</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div role="alert" className="uploader-alert uploader-alert--error">
            <AlertCircle size={18} className="alert-icon-shrink" />
            <span>{error}</span>
          </div>
        )}

        {/* Field Metadata Grid (Always visible so location can be prepared or auto-filled) */}
        <div className="uploader-meta-grid">
          <div className="meta-study-indicator">
            <Sliders size={15} />
            <span>
              <strong>Abra Provincial Field Study</strong> — Location is required to calibrate local agro-climatic maturity thresholds.
            </span>
          </div>

          {/* Mandatory Location Input with GPS Auto-Fill */}
          <div className="meta-field-group">
            <div className="meta-field-header-row">
              <label htmlFor="input-location" className="meta-field-label">
                <MapPin size={16} className="text-primary-emerald" />
                <span>Field Municipality / Barangay</span>
                <span className="meta-badge-required">* Strictly Required</span>
              </label>

              {/* GPS Auto-Fill Button */}
              <button
                type="button"
                id="btn-autodetect-gps"
                className={`meta-gps-btn ${detectingGps ? 'meta-gps-btn--loading' : ''}`}
                onClick={detectLocation}
                disabled={detectingGps}
                title="Auto-detect current GPS field coordinates"
              >
                {detectingGps ? (
                  <>
                    <RefreshCw size={14} className="spin-icon" />
                    <span>Detecting GPS…</span>
                  </>
                ) : (
                  <>
                    <Compass size={14} />
                    <span>Auto-Fill GPS Location</span>
                  </>
                )}
              </button>
            </div>

            <div className="meta-location-input-wrap">
              <input
                id="input-location"
                type="text"
                list="abra-municipalities-list"
                className={`meta-field-input ${locationError ? 'meta-field-input--error' : ''}`}
                placeholder="e.g. Bangued, Abra (or click Auto-Fill GPS above)"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value)
                  onClearError?.()
                  if (e.target.value.trim()) {
                    setLocationError(false)
                    setError(null)
                  }
                }}
                disabled={loading || detectingGps}
                required
              />
              {location.trim() && (
                <div className="meta-location-check" title="Location specified">
                  <Check size={16} />
                </div>
              )}
            </div>

            {/* GPS Detection Confirmation Banner */}
            {gpsSuccess && (
              <div className="meta-gps-success-chip">
                <CheckCircle2 size={14} />
                <span>{gpsSuccess}</span>
              </div>
            )}

            {locationError && (
              <p className="meta-field-error-text">
                <AlertCircle size={14} />
                Field location is required. Please type your Abra municipality or click Auto-Fill GPS.
              </p>
            )}

            <datalist id="abra-municipalities-list">
              {ABRA_MUNICIPALITIES.map((mun) => (
                <option key={mun} value={`${mun}, Abra`} />
              ))}
            </datalist>
          </div>

          {/* Optional Notes */}
          <div className="meta-field-group">
            <label htmlFor="input-notes" className="meta-field-label">
              <FileText size={15} />
              <span>Field Notes & Rice Variety (Optional)</span>
            </label>
            <textarea
              id="input-notes"
              className="meta-field-textarea"
              placeholder="e.g. NSIC Rc 222, 105 days after transplanting, plot A-2"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                onClearError?.()
              }}
              disabled={loading}
              rows={2}
            />
          </div>
        </div>

        {/* Action Bar / Submit Trigger */}
        <div className="uploader-action-bar">
          <button
            id="btn-classify"
            type="submit"
            disabled={!file || !location.trim() || loading}
            className={`uploader-submit-btn ${!location.trim() && file ? 'uploader-submit-btn--locked' : ''}`}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner spinner--sm" aria-hidden="true" />
                <span>Running CNN Panicle & Color Analysis…</span>
              </>
            ) : !location.trim() && file ? (
              <>
                <MapPin size={18} />
                <span>Enter Location Above to Proceed</span>
              </>
            ) : (
              <>
                <Zap size={18} />
                <span>Analyze Rice Maturity</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
