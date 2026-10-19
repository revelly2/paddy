interface RiceFieldHeroVectorProps {
  className?: string
  width?: number | string
  height?: number | string
}

export default function RiceFieldHeroVector({
  className = '',
  width = 280,
  height = 140,
}: RiceFieldHeroVectorProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 320 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyGrad" x1="160" y1="0" x2="160" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="sunGlow" x1="240" y1="20" x2="240" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="terraceGrad1" x1="0" y1="90" x2="320" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="terraceGrad2" x1="0" y1="110" x2="320" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {/* Sun glow & geometric solar rays */}
      <circle cx="230" cy="50" r="38" fill="url(#sunGlow)" />
      <circle cx="230" cy="50" r="18" fill="#ffffff" fillOpacity="0.2" />

      {/* Subtle Cordillera mountain silhouettes (Abra topography) */}
      <path
        d="M0 115L55 82L110 110L165 78L225 112L280 86L320 102V160H0V115Z"
        fill="url(#terraceGrad1)"
      />

      {/* Terraced Paddy Ridges */}
      <path
        d="M0 128C40 122 80 125 125 118C175 110 220 116 270 122C290 125 310 123 320 125V160H0V128Z"
        fill="url(#terraceGrad2)"
      />
      <path
        d="M0 142C60 138 120 144 190 137C245 132 290 138 320 139V160H0V142Z"
        fill="#ffffff"
        fillOpacity="0.12"
      />

      {/* Stylized Rice Stalks & Grain Heads in Foreground */}
      <g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.45">
        {/* Plant 1 */}
        <path d="M48 152C50 130 58 116 70 105" />
        <path d="M70 105C74 106 77 109 76 112C74 114 71 113 70 105Z" fill="#ffffff" fillOpacity="0.35" />
        <path d="M66 112C70 114 73 117 71 120C69 122 66 120 66 112Z" fill="#ffffff" fillOpacity="0.35" />
        <path d="M62 120C65 122 68 125 66 127C64 129 62 127 62 120Z" fill="#ffffff" fillOpacity="0.35" />

        {/* Plant 2 */}
        <path d="M85 156C87 136 84 122 78 110" />
        <path d="M78 110C75 111 73 114 75 117C77 119 79 117 78 110Z" fill="#ffffff" fillOpacity="0.3" />

        {/* Plant 3 (Right cluster) */}
        <path d="M265 154C263 132 255 118 244 108" />
        <path d="M244 108C240 109 238 112 240 115C242 117 245 115 244 108Z" fill="#ffffff" fillOpacity="0.35" />
        <path d="M248 116C244 117 243 121 245 123C247 125 250 123 248 116Z" fill="#ffffff" fillOpacity="0.35" />
        <path d="M285 158C286 138 292 126 300 115" />
      </g>

      {/* Gentle wind motion dashes */}
      <path d="M130 65C150 62 170 66 185 64" stroke="#ffffff" strokeWidth="1.25" strokeLinecap="round" strokeOpacity="0.25" strokeDasharray="3 4" />
      <path d="M145 80C165 77 185 81 200 79" stroke="#ffffff" strokeWidth="1.25" strokeLinecap="round" strokeOpacity="0.2" strokeDasharray="3 4" />
    </svg>
  )
}
