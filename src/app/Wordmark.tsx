import { useId } from "react";

/**
 * P for Pathway, R for Research: an R is a P with one more stroke. The P is
 * drawn in ink; the leg that turns it into an R, in amber, starts under the
 * bowl and is cut flat on the stem's baseline. Mirrors public/icon.svg.
 */
export function BrandMark({ size = 24 }: { size?: number }) {
  const clipId = `baseline-${useId().replace(/:/g, "")}`;
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="24" height="21.5" />
        </clipPath>
      </defs>
      <g transform="translate(-0.5 0.25)">
        <path
          d="M11.2 12.2 L19.4 23.2"
          fill="none"
          stroke="var(--spark)"
          strokeWidth="3"
          clipPath={`url(#${clipId})`}
        />
        <path
          d="M6.5 21.5 V3.5 H12.25 A4.75 4.75 0 0 1 12.25 13 H6.5"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinejoin="miter"
        />
      </g>
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
