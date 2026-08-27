/**
 * ImageUploader.tsx
 * -----------------
 * Drag-and-drop image upload component using react-dropzone.
 *
 * Features
 * --------
 * - Drag-and-drop zone with visual feedback
 * - Click-to-browse fallback for non-drag-capable devices
 * - Image preview after selection
 * - File validation (MIME type + size < 10 MB)
 * - Optional notes and location fields
 * - Accessible (keyboard + ARIA)
 *
 * Props
 * -----
 * onSubmit(file, notes, location) — called when the user clicks Classify
 * loading                         — disables submit while classification runs
 */

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload, ImageIcon, X, MapPin, FileText, Zap } from 'lucide-react'

const MAX_SIZE_BYTES = 10 * 1024 * 1024   // 10 MB

interface ImageUploaderProps {
  onSubmit:  (file: File, notes?: string, location?: string) => void
  loading:   boolean
}

export default function ImageUploader({ onSubmit, loading }: ImageUploaderProps) {
  const [file,     setFile]     = useState<File | null>(null)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [notes,    setNotes]    = useState('')
  const [location, setLocation] = useState('')
  const [error,    setError]    = useState<string | null>(null)

  const handleDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setError(null)

    if (rejected.length > 0) {
      const reason = rejected[0].errors[0]?.message ?? 'Invalid file'
      setError(reason)
      return
    }

    const selected = accepted[0]
    if (!selected) return

    setFile(selected)

    // Create a local object URL for the preview thumbnail
    const url = URL.createObjectURL(selected)
    setPreview(url)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop:        handleDrop,
    accept:        { 'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.webp'] },
    maxSize:       MAX_SIZE_BYTES,
    multiple:      false,
    disabled:      loading,
  })

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || loading) return
    onSubmit(file, notes.trim() || undefined, location.trim() || undefined)
  }

  return (
    <form className="uploader" onSubmit={handleSubmit} noValidate>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        id="dropzone"
        className={[
          'uploader__zone',
          isDragActive  ? 'uploader__zone--drag'    : '',
          file          ? 'uploader__zone--has-file' : '',
          loading       ? 'uploader__zone--disabled' : '',
        ].join(' ')}
        aria-label="Image upload area"
      >
        <input {...getInputProps()} id="file-input" aria-label="File input" />

        {preview && file ? (
          /* Image preview */
          <div className="uploader__preview">
            <img
              src={preview}
              alt="Selected rice image"
              className="uploader__preview-img"
            />
            <div className="uploader__preview-overlay">
              <div className="uploader__preview-info">
                <ImageIcon size={16} />
                <span>{file.name}</span>
                <span className="uploader__preview-size">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              {!loading && (
                <button
                  type="button"
                  id="btn-clear-image"
                  className="uploader__clear"
                  onClick={clearFile}
                  title="Remove image"
                  aria-label="Remove selected image"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="uploader__empty">
            <div className="uploader__icon">
              <Upload size={40} />
            </div>
            <p className="uploader__heading">
              {isDragActive ? 'Drop the image here…' : 'Drop your rice photo here'}
            </p>
            <p className="uploader__subtext">
              or <span className="uploader__browse">click to browse</span>
            </p>
            <p className="uploader__hint">
              JPEG, PNG, BMP, WEBP — up to 10 MB
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p role="alert" className="uploader__error">
          ⚠ {error}
        </p>
      )}

      {/* Optional metadata fields */}
      {file && (
        <div className="uploader__meta">
          <div className="uploader__field">
            <label htmlFor="input-location" className="uploader__label">
              <MapPin size={14} />
              Farm location (optional)
            </label>
            <input
              id="input-location"
              type="text"
              className="uploader__input"
              placeholder="e.g. Barangay Sta. Cruz, Cagayan"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="uploader__field">
            <label htmlFor="input-notes" className="uploader__label">
              <FileText size={14} />
              Notes (optional)
            </label>
            <textarea
              id="input-notes"
              className="uploader__textarea"
              placeholder="e.g. NSIC Rc 222 variety, 105 days after transplanting"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        id="btn-classify"
        type="submit"
        disabled={!file || loading}
        className="uploader__submit"
        aria-busy={loading}
      >
        {loading ? (
          <>
            <span className="spinner spinner--sm" aria-hidden="true" />
            Analysing image…
          </>
        ) : (
          <>
            <Zap size={18} />
            Classify Image
          </>
        )}
      </button>
    </form>
  )
}
