import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Paper } from "../../../lib/research-types";

const examples = [
  "Attention Is All You Need",
  "10.1038/nature14539",
  "Elinor Ostrom",
];

/**
 * A hand-drawn route through five papers: where you start, where it leads.
 * Squares match the app's paper markers; the last stop is the one you are on.
 */
function PathwayDrawing() {
  const stops: Array<[number, number]> = [
    [24, 96],
    [178, 44],
    [326, 82],
    [478, 36],
    [616, 58],
  ];
  return (
    <svg
      className="pathway-drawing"
      viewBox="0 0 640 128"
      role="img"
      aria-label="A path linking five papers"
    >
      <path
        className="pathway-line"
        d="M24 96 C 80 96, 112 44, 178 44 S 272 82, 326 82 S 420 36, 478 36 S 576 58, 616 58"
        pathLength={1}
      />
      {stops.map(([x, y], index) => {
        const last = index === stops.length - 1;
        const size = last ? 20 : 13;
        return (
          <rect
            key={`${x}-${y}`}
            className={`pathway-stop${last ? " current" : ""}`}
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
            style={{ animationDelay: `${300 + index * 180}ms` }}
          />
        );
      })}
    </svg>
  );
}

export function HomeView({
  search,
  accessory,
  lastPaper,
  onExample,
  onContinue,
}: {
  search: ReactNode;
  accessory: ReactNode;
  lastPaper: Paper | null;
  onExample: (query: string) => void;
  onContinue: (paper: Paper) => void;
}) {
  return (
    <div className="home">
      {accessory ? <div className="home-topbar">{accessory}</div> : null}
      <div className="home-inner">
        <PathwayDrawing />
        <h1 className="home-title">Start from one paper and follow where it leads</h1>
        <p className="home-lede">
          See what a paper builds on and what was built on it. Open the next
          one, and the next, and save the ones worth reading
        </p>
        <div className="home-search">{search}</div>
        <p className="home-examples">
          <span>Try</span>
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => onExample(example)}>
              {example}
            </button>
          ))}
        </p>
        {lastPaper ? (
          <button
            type="button"
            className="home-continue"
            onClick={() => onContinue(lastPaper)}
          >
            <span className="home-continue-label">Pick up where you left off</span>
            <span className="home-continue-title">{lastPaper.title}</span>
            <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
