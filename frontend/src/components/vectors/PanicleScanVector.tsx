interface PanicleScanVectorProps {
  className?: string
  width?: number | string
  height?: number | string
}

export default function PanicleScanVector({
  className = '',
  width = 96,
  height = 96,
}: PanicleScanVectorProps) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="scanPulse" x1="16" y1="16" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dcfce7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#dcfce7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient background aura */}
      <circle cx="48" cy="48" r="42" fill="url(#ringGlow)" />
      
      {/* Precision Scanner Viewfinder Brackets */}
      {/* Top-Left */}
      <path d="M22 34V24C22 22.8954 22.8954 22 24 22H34" stroke="url(#scanPulse)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Top-Right */}
      <path d="M62 22H72C73.1046 22 74 22.8954 74 24V34" stroke="url(#scanPulse)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Bottom-Left */}
      <path d="M22 62V72C22 73.1046 22.8954 74 24 74H34" stroke="url(#scanPulse)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Bottom-Right */}
      <path d="M62 74H72C73.1046 74 74 73.1046 74 72V62" stroke="url(#scanPulse)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Central Rice Panicle Graphic */}
      <g transform="translate(18, 14)">
        {/* Curved Main Rachis (Stem) */}
        <path
          d="M20 54C22 42 27 30 38 18"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Minimalist Oval Grains with Alternate Cadence */}
        {/* Grain 1 - Top Tip */}
        <path
          d="M38 18C41.5 19 44 23 42 26C39.5 25 37 21 38 18Z"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth="1.2"
        />
        {/* Grain 2 - Right */}
        <path
          d="M34 26C38 27.5 40.5 31.5 38 34.5C35 33.5 33 29.5 34 26Z"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth="1.2"
        />
        {/* Grain 3 - Left */}
        <path
          d="M29 23C26 21 21.5 22.5 21 26C24 27 28 26.5 29 23Z"
          fill="#22c55e"
          stroke="#16a34a"
          strokeWidth="1.2"
        />
        {/* Grain 4 - Right lower */}
        <path
          d="M29 34C33 36 34.5 40.5 32 43C29 42 28 37.5 29 34Z"
          fill="#eab308"
          stroke="#ca8a04"
          strokeWidth="1.2"
        />
        {/* Grain 5 - Left lower */}
        <path
          d="M25 32C22 30.5 17.5 32 17 35.5C20 36.5 24 35.5 25 32Z"
          fill="#22c55e"
          stroke="#16a34a"
          strokeWidth="1.2"
        />
        {/* Grain 6 - Bottom right */}
        <path
          d="M24 43C27.5 45 28.5 49 26 51.5C23.5 50.5 23 46.5 24 43Z"
          fill="#84cc16"
          stroke="#65a30d"
          strokeWidth="1.2"
        />
      </g>

      {/* Modern Scanning Beam Line */}
      <line x1="26" y1="48" x2="70" y2="48" stroke="#10b981" strokeWidth="1.75" strokeDasharray="2 3" strokeOpacity="0.8" />
    </svg>
  )
}
