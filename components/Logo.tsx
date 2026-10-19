/** METTO & MIDALO mark: blue→cyan gateway hexagon with a mint "key" node. */
export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="METTO & MIDALO logo">
      <defs>
        <linearGradient id="mm-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0071ED" />
          <stop offset="100%" stopColor="#00BBE4" />
        </linearGradient>
      </defs>
      <path d="M16 2 28 9v14l-12 7L4 23V9z" fill="#111F36" stroke="url(#mm-logo-grad)" strokeWidth="2" />
      <path d="M10 21V11l6 6 6-6v10" fill="none" stroke="url(#mm-logo-grad)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="17" r="2" fill="#00C09A" />
    </svg>
  );
}
