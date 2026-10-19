interface EmptyScansVectorProps {
  className?: string
  width?: number | string
  height?: number | string
}

export default function EmptyScansVector({
  className = '',
  width = 120,
  height = 120,
}: EmptyScansVectorProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="emptyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="50" fill="url(#emptyGlow)" />

      {/* Modern minimalist tablet/notebook canvas */}
      <rect x="30" y="24" width="60" height="72" rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="36" y="32" width="48" height="34" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />

      {/* Minimalist rice sprout outline inside viewport */}
      <path
        d="M60 56V42C60 38 64 35 68 36C68 40 65 43 60 44"
        stroke="#16a34a"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M60 46C56 46 53 43 53 39C57 39 60 42 60 46Z"
        fill="#bbf7d0"
        stroke="#16a34a"
        strokeWidth="1.25"
      />

      {/* Subtle data lines */}
      <line x1="38" y1="74" x2="68" y2="74" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="82" x2="56" y2="82" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

      {/* Decorative dashed search arc */}
      <circle cx="78" cy="78" r="14" fill="#ffffff" stroke="#16a34a" strokeWidth="2" />
      <path d="M74 78H82M78 74V82" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
