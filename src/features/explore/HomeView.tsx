import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Paper } from "../../../lib/research-types";

/**
 * A small, honest picture of what the app shows: one paper on a time line,
 * the papers it cites stacked before it, the papers citing it after. Same
 * marks as the real chart on the paper page. No years or numbers, so it
 * claims nothing.
 */
const columns: Array<{ cites: number; citedBy: number }> = [
  { cites: 1, citedBy: 0 },
  { cites: 0, citedBy: 0 },
  { cites: 2, citedBy: 0 },
  { cites: 1, citedBy: 0 },
  { cites: 3, citedBy: 0 },
  { cites: 2, citedBy: 0 },
  { cites: 4, citedBy: 0 },
  { cites: 0, citedBy: 0 }, // the paper itself
  { cites: 0, citedBy: 2 },
  { cites: 0, citedBy: 4 },
  { cites: 0, citedBy: 5 },
  { cites: 0, citedBy: 3 },
  { cites: 0, citedBy: 4 },
  { cites: 0, citedBy: 2 },
  { cites: 0, citedBy: 1 },
];
const CENTER = 7;

function HeroChart() {
  return (
    <figure className="hero-chart">
      <div className="hero-chart-plot" aria-hidden="true">
        <span className="hero-label cites">Papers it cites</span>
        <span className="hero-end earlier">Older</span>
        <span className="hero-end later">Newer</span>
        {columns.map((column, index) => (
          <div
            key={index}
            className={`hero-column${index === CENTER ? " center" : ""}`}
            style={{ ["--col" as string]: index }}
          >
            <div className="hero-stack above">
              {Array.from({ length: column.cites }, (_, i) => (
                <span key={i} style={{ ["--row" as string]: i }} />
              ))}
            </div>
            <div className="hero-stack below">
              {Array.from({ length: column.citedBy }, (_, i) => (
                <span key={i} style={{ ["--row" as string]: i }} />
              ))}
            </div>
            {index === CENTER ? (
              <span className="hero-center-label">Your paper</span>
            ) : null}
          </div>
        ))}
        <span className="hero-label cited-by">Papers that cite it</span>
      </div>
      <figcaption>
        Each block is one paper. Open any paper and you get this view of it
      </figcaption>
    </figure>
  );
}

export function HomeView({
  search,
  accessory,
  lastPaper,
  onContinue,
}: {
  search: ReactNode;
  accessory: ReactNode;
  lastPaper: Paper | null;
  onContinue: (paper: Paper) => void;
}) {
  return (
    <div className="home">
      {accessory ? <div className="home-topbar">{accessory}</div> : null}
      <div className="home-inner">
        <HeroChart />
        <h1 className="home-title">See what any paper cites, and what cites it</h1>
        <div className="home-search">{search}</div>
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
