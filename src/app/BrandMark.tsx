/**
 * Two papers joined by a citation: a filled square for where you are,
 * an open one for where the path leads. Drawn in the accent ink.
 */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M6 14 L14 6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" fill="currentColor" />
      <rect
        x="11.75"
        y="2.75"
        width="5.5"
        height="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
