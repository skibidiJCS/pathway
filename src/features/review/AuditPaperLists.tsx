import type { BridgePaper } from "../../../lib/collection";
import type { Paper } from "../../../lib/research-types";

function bridgeText(item: BridgePaper): string {
  const parts = [`Connects ${item.count} of your papers`];
  if (item.referencedByCount) parts.push(`cited by ${item.referencedByCount}`);
  if (item.citesSavedCount) parts.push(`cites ${item.citesSavedCount}`);
  return parts.join(", ");
}

export function BridgePaperList({
  papers,
  onExplore,
}: {
  papers: BridgePaper[];
  onExplore: (paper: Paper) => void;
}) {
  if (papers.length === 0) {
    return <p className="muted-text">None yet</p>;
  }
  return (
    <ul className="plain-paper-list">
      {papers.map((item) => (
        <li key={item.paper.id}>
          <button type="button" onClick={() => onExplore(item.paper)}>
            {item.paper.title}
          </button>
          <span className="tabular">{bridgeText(item)}</span>
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
  if (papers.length === 0) return <p className="muted-text">{empty}</p>;
  return (
    <ul className="plain-paper-list">
      {papers.map((item) => (
        <li key={item.paper.id}>
          <button type="button" onClick={() => onExplore(item.paper)}>
            {item.paper.title}
          </button>
          <span className="tabular">Cited by {item.count} of your papers</span>
        </li>
      ))}
    </ul>
  );
}
