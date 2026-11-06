/**
 * P for Pathway, R for Research: an R is a P with one more stroke. The P is
 * drawn in ink and the leg that turns it into an R in brass, so one glyph
 * carries both letters. Mirrors public/icon.svg.
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
      <path
        d="M6.5 22V3.5H13a5.25 5.25 0 0 1 0 10.5H6.5"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <path
        d="M12 14L18.5 22"
        fill="none"
        stroke="var(--spark)"
        strokeWidth="3"
        strokeLinecap="butt"
      />
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
