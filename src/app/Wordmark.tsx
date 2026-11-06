/**
 * The mark is a P drawn as one route: it starts at the brass square, where
 * you begin, climbs and turns back like a path through papers. Fixed brand
 * colors, so it reads the same in both themes. Mirrors public/icon.svg.
 */
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect width="24" height="24" fill="#8c2f24" />
      <path
        d="M8.5 15.5V5.5H16.5V12.5H12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <rect x="6" y="15" width="5" height="5" fill="#e8a93a" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <BrandMark />
      <span className="wordmark-text">
        Pathway<span className="wordmark-second">Research</span>
      </span>
    </span>
  );
}
