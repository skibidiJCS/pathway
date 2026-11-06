/**
 * The mark: one paper (the brass rule) with what came before it (the block
 * above, left) and what came after (the block below, right). The same idea
 * as the chart on every paper page. Mirrors public/icon.svg.
 */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="2" y="5" width="8" height="6" fill="var(--text)" />
      <rect x="14" y="13" width="8" height="8" fill="var(--ink)" />
      <rect x="11" y="2" width="2" height="20" fill="var(--spark)" />
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
