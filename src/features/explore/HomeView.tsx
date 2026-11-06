import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Paper } from "../../../lib/research-types";

export function HomeView({
  search,
  accessory,
  lastPaper,
  suggestedCount,
  onSuggested,
  onContinue,
}: {
  search: ReactNode;
  accessory: ReactNode;
  lastPaper: Paper | null;
  suggestedCount: number;
  onSuggested: () => void;
  onContinue: (paper: Paper) => void;
}) {
  return (
    <div className="home">
      {accessory ? <div className="home-topbar">{accessory}</div> : null}
      <div className="home-inner">
        <h1 className="home-title">See what any paper cites, and what cites it</h1>
        <div className="home-search">{search}</div>
        {suggestedCount > 0 ? (
          <button type="button" className="home-suggested" onClick={onSuggested}>
            {suggestedCount} suggested paper{suggestedCount === 1 ? "" : "s"}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
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
