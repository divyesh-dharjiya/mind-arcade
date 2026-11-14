/**
 * Mind Arcade brand mark: a brain whose left half is thought (folds) and whose
 * right half is play (arcade buttons). Shared by the header and the app icons
 * (scripts/make-icons.mjs renders the same artwork to PNG/ICO).
 */
export const BRAIN_LEFT =
  "M247 118C214 98 170 106 157 141C119 141 96 178 110 212C82 233 80 281 110 301C98 338 122 373 159 375C176 405 220 410 247 392Z";
export const BRAIN_RIGHT =
  "M265 118C298 98 342 106 355 141C393 141 416 178 402 212C430 233 432 281 402 301C414 338 390 373 353 375C336 405 292 410 265 392Z";

export function BrandArt({ id = "ma" }: { id?: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="0.55" stopColor="#c026d3" />
          <stop offset="1" stopColor="#f43f5e" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0.25" cy="0.15" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-brain`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f3e8ff" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${id}-bg)`} />
      <rect width="512" height="512" rx="116" fill={`url(#${id}-shine)`} />
      <g transform="translate(0 6)">
        <path d={BRAIN_LEFT} fill="#3b0764" opacity="0.28" transform="translate(0 14)" />
        <path d={BRAIN_RIGHT} fill="#3b0764" opacity="0.28" transform="translate(0 14)" />
        <path d={BRAIN_LEFT} fill={`url(#${id}-brain)`} />
        <path d={BRAIN_RIGHT} fill={`url(#${id}-brain)`} />
        <g fill="none" stroke="#a21caf" strokeWidth="15" strokeLinecap="round">
          <path d="M168 176C198 172 214 196 202 222" />
          <path d="M132 262C168 248 204 266 206 298" />
          <path d="M174 336C196 318 226 328 230 350" />
        </g>
        <circle cx="330" cy="196" r="28" fill="#22d3ee" />
        <circle cx="372" cy="262" r="28" fill="#facc15" />
        <circle cx="318" cy="314" r="28" fill="#4ade80" />
        <g fill="#fff" opacity="0.7">
          <circle cx="321" cy="186" r="8" />
          <circle cx="363" cy="252" r="8" />
          <circle cx="309" cy="304" r="8" />
        </g>
      </g>
      <path d="M418 70l10 24 24 10-24 10-10 24-10-24-24-10 24-10z" fill="#fff" opacity="0.9" />
    </>
  );
}

export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={`drop-shadow-[0_6px_14px_rgba(192,38,211,0.45)] ${className}`} aria-hidden>
      <BrandArt id={`bm${size}`} />
    </svg>
  );
}
