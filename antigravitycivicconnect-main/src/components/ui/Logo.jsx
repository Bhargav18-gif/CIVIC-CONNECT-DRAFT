/**
 * CivicConnect mark: a shield silhouette (protection/civic trust) containing
 * a map-pin cut-out, ringed by a small network of connection nodes
 * (the "smart city" / AI layer). Blue → cyan gradient throughout.
 */
export default function Logo({ size = 36, withWordmark = true, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cc-grad" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>

        <path
          d="M24 3L8 9V22C8 33 14.5 40.5 24 45C33.5 40.5 40 33 40 22V9L24 3Z"
          fill="url(#cc-grad)"
          fillOpacity="0.16"
          stroke="url(#cc-grad)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <path
          d="M24 13C20.13 13 17 16.13 17 20C17 25.25 24 32 24 32C24 32 31 25.25 31 20C31 16.13 27.87 13 24 13Z"
          fill="url(#cc-grad)"
        />
        <circle cx="24" cy="20" r="3" fill="#070B14" />

        <circle cx="13" cy="14" r="1.6" fill="#22D3EE" opacity="0.85" />
        <circle cx="35" cy="14" r="1.6" fill="#22D3EE" opacity="0.85" />
        <circle cx="13" cy="30" r="1.6" fill="#8B5CF6" opacity="0.85" />
        <circle cx="35" cy="30" r="1.6" fill="#8B5CF6" opacity="0.85" />
        <path
          d="M13 14L17.5 18.5M35 14L30.5 18.5M13 30L17.5 24M35 30L30.5 24"
          stroke="url(#cc-grad)"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>

      {withWordmark && (
        <span className="font-display font-semibold text-lg tracking-tight text-white">
          Civic<span className="text-gradient">Connect</span>
        </span>
      )}
    </div>
  );
}
