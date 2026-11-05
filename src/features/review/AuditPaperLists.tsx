import type { BridgePaper } from "../../../lib/collection";
import type { Paper } from "../../../lib/research-types";
import { compactTitle } from "./review-utils";

export function BridgePaperList({
  papers,
  onExplore,
}: {
  papers: BridgePaper[];
  onExplore: (paper: Paper) => void;
}) {
  if (papers.length === 0) {
    return (
      <p className="audit-empty-text">
        No paper links two of your saved papers yet
      </p>
    );
  }
  return (
    <ul className="bridge-paper-list">
      {papers.map((item) => (
        <li key={item.paper.id}>
          <button
            type="button"
            onClick={() => onExplore(item.paper)}
            title={item.paper.title}
          >
            {compactTitle(item.paper.title)}
          </button>
          <span className="tabular">
            Links {item.count} saved papers
            {item.referencedByCount
              ? ` · cited by ${item.referencedByCount}`
              : ""}
            {item.citesSavedCount
              ? ` · cites ${item.citesSavedCount}`
              : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AuditPaperList({
  papers,
  empty,
  onExplore,
}: {
  papers: Array<{ paper: Paper; count: number }>;
  empty: string;
  onExplore: (paper: Paper) => void;
}) {
  if (papers.length === 0) return <p className="audit-empty-text">{empty}</p>;
  return (
    <ul className="audit-paper-list">
      {papers.map((item) => (
        <li key={item.paper.id}>
          <button
            type="button"
            onClick={() => onExplore(item.paper)}
            title={item.paper.title}
          >
            {compactTitle(item.paper.title)}
          </button>
          <span className="tabular">Cited by {item.count} saved papers</span>
        </li>
      ))}
    </ul>
  );
}
