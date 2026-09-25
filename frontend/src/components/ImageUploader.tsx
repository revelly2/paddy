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
          'uploader-modern-zone',
          isDragActive  ? 'uploader-modern-zone--drag'    : '',
          file          ? 'uploader-modern-zone--has-file' : '',
          loading       ? 'uploader__zone--disabled' : '',
        ].join(' ')}
        aria-label="Image upload area"
      >
        <input {...getInputProps()} id="file-input" aria-label="File input" />

        {preview && file ? (
          /* Image preview */
          <div className="uploader__preview" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
            <img
              src={preview}
              alt="Selected rice image"
              className="uploader__preview-img"
              style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }}
            />
            <div className="uploader__preview-overlay" style={{ marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
              <div className="uploader__preview-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--clr-text-main)' }}>
                <ImageIcon size={20} color="var(--clr-primary-600)" />
                <span style={{ fontWeight: 500 }}>{file.name}</span>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              {!loading && (
                <button
                  type="button"
                  id="btn-clear-image"
                  onClick={clearFile}
                  title="Remove image"
                  aria-label="Remove selected image"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-muted)' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="uploader-modern-icon-wrapper">
              <Upload size={24} className="uploader-modern-icon" />
            </div>
            <p className="uploader-modern-title">
              {isDragActive ? 'Drop the image here…' : 'Drop your rice photo here'}
            </p>
            <p className="uploader-modern-subtitle" style={{ marginBottom: '8px' }}>
              or <span style={{ color: 'var(--clr-primary-600)', fontWeight: 500 }}>click to browse</span>
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
              JPEG, PNG, BMP, WEBP — up to 10 MB
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p role="alert" className="uploader__error" style={{ color: '#dc2626', marginTop: '12px', fontSize: '0.875rem' }}>
          ⚠ {error}
        </p>
      )}

      {/* Optional metadata fields */}
      {file && (
        <div className="uploader__meta" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="uploader__field">
            <label htmlFor="input-location" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--clr-text-main)', marginBottom: '8px' }}>
              <MapPin size={16} color="var(--clr-text-muted)" />
              Farm location (optional)
            </label>
            <input
              id="input-location"
              type="text"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}
              placeholder="e.g. Barangay Sta. Cruz, Cagayan"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="uploader__field">
            <label htmlFor="input-notes" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--clr-text-main)', marginBottom: '8px' }}>
              <FileText size={16} color="var(--clr-text-muted)" />
              Notes (optional)
            </label>
            <textarea
              id="input-notes"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', resize: 'vertical' }}
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
        className="uploader-modern-submit"
        aria-busy={loading}
      >
        {loading ? (
          <>
            <span className="spinner spinner--sm" aria-hidden="true" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', width: '18px', height: '18px' }} />
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
