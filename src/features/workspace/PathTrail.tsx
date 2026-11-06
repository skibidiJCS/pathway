import { useMemo } from "react";
import type { Paper } from "../../../lib/research-types";

/** The papers you followed, oldest first; the current one is bold. */
export function PathTrail({
  history,
  currentId,
  onOpen,
}: {
  history: Paper[];
  currentId: string;
  onOpen: (paper: Paper) => void;
}) {
  const stops = useMemo(() => [...history].reverse().slice(-5), [history]);
  if (stops.length === 0) return null;
  return (
    <nav className="trail" aria-label="Your path">
      <ol>
        {stops.map((paper) => {
          const current = paper.id === currentId;
          return (
            <li key={paper.id} className={current ? "current" : ""}>
              <button
                type="button"
                onClick={() => onOpen(paper)}
                aria-current={current ? "step" : undefined}
                title={paper.title}
              >
                <span className="trail-node" aria-hidden />
                <span className="trail-title">{paper.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
