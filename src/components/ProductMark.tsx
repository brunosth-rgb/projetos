/** Product mark: a three-line checklist, the first line checked in the data hue. */
export function ProductMark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path d="M2.5 5.2 4.2 6.8 7 3.6" stroke="var(--data)" strokeWidth="1.8" />
      <path d="M10 5.2h7.5" stroke="var(--data)" strokeWidth="1.8" />
      <rect x="3" y="9" width="3.4" height="3.4" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 10.7h7.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="14.5" width="3.4" height="3.4" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 16.2h5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
