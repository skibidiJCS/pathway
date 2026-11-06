import { BookmarkPlus, Check } from "lucide-react";
import type { Paper } from "../../../lib/research-types";

export interface PaperLinkItem {
  paper: Paper;
  note?: string;
}

/**
 * A list of papers you can open (to explore) and, optionally, save.
 */
export function PaperLinkList({
  items,
  empty,
  savedIds,
  savingId,
  canSave,
  onExplore,
  onSave,
}: {
  items: PaperLinkItem[];
  empty: string;
  savedIds?: Set<string>;
  savingId?: string | null;
  canSave?: boolean;
  onExplore: (paper: Paper) => void;
  onSave?: (paper: Paper) => void;
}) {
  if (items.length === 0) return <p className="muted-text">{empty}</p>;
  return (
    <ul className="paper-link-list">
      {items.map(({ paper, note }) => {
        const saved = savedIds?.has(paper.id) ?? false;
        return (
          <li key={paper.id}>
            <div className="paper-link-text">
              <button
                type="button"
                className="paper-link-title"
                onClick={() => onExplore(paper)}
              >
                {paper.title}
              </button>
              <span className="meta-row tabular">
                <span>{paper.year ?? "Year unknown"}</span>
                <span>{paper.citationCount.toLocaleString()} citations</span>
                {note ? <span>{note}</span> : null}
              </span>
            </div>
            {onSave ? (
              saved ? (
                <span className="saved-mark">
                  <Check size={14} strokeWidth={1.75} aria-hidden />
                  Saved
                </span>
              ) : (
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => onSave(paper)}
                  disabled={!canSave || savingId === paper.id}
                >
                  <BookmarkPlus size={16} strokeWidth={1.5} aria-hidden />
                  {savingId === paper.id ? "Saving…" : "Save"}
                </button>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
