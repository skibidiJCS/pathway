import {
  ArrowRight,
  BookmarkPlus,
  Check,
  ExternalLink,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { Paper } from "../../../lib/research-types";
import {
  accessText,
  authorsText,
  citationsText,
  doiText,
} from "./paper-format";

const relationLabels: Record<Paper["relation"], string> = {
  selected: "",
  reference: "Cited by the paper you are on",
  citing: "Cites the paper you are on",
  both: "Cites and is cited by the paper you are on",
};

/**
 * A look at one paper from the lists, with the one thing to do next:
 * follow it, so its own citations become the view.
 */
export function PaperPreview({
  paper,
  saved,
  saving,
  collectionFull,
  onClose,
  onFollow,
  onSave,
}: {
  paper: Paper | null;
  saved: boolean;
  saving: boolean;
  collectionFull: boolean;
  onClose: () => void;
  onFollow: (paper: Paper) => void;
  onSave: (paper: Paper) => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const open = Boolean(paper);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [paper?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  return (
    <>
      <button
        type="button"
        className={`preview-scrim${open ? " visible" : ""}`}
        aria-label="Close preview"
        tabIndex={-1}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className={`preview${open ? " open" : ""}`}
        aria-label="Paper preview"
        inert={!open}
      >
        {paper ? (
          <div className="preview-content">
            <div className="preview-toolbar">
              <span className="relation-label">{relationLabels[paper.relation]}</span>
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label="Close preview"
              >
                <X size={18} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <h2 className="preview-title">{paper.title}</h2>
            <p className="preview-authors">{authorsText(paper.authors)}</p>
            <p className="meta-row tabular">
              <span>{paper.year ?? "Year unknown"}</span>
              <span>{citationsText(paper.citationCount)}</span>
              {paper.source ? <span>{paper.source}</span> : null}
              <span title={accessText(paper).hint}>{accessText(paper).label}</span>
            </p>

            <div className="preview-actions">
              <button
                type="button"
                className="button primary follow"
                onClick={() => onFollow(paper)}
              >
                Follow this paper
                <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
              </button>
              {saved ? (
                <span className="saved-mark">
                  <Check size={14} strokeWidth={1.75} aria-hidden />
                  Saved
                </span>
              ) : (
                <button
                  type="button"
                  className="button"
                  onClick={() => onSave(paper)}
                  disabled={collectionFull || saving}
                >
                  <BookmarkPlus size={16} strokeWidth={1.5} aria-hidden />
                  {saving ? "Saving…" : collectionFull ? "List is full" : "Save"}
                </button>
              )}
            </div>
            <p className="preview-hint">
              Following opens this paper with its own references and citations
            </p>

            <section className="preview-abstract" aria-label="Abstract">
              <h3>Abstract</h3>
              <p className={paper.abstract ? "" : "muted-text"}>
                {paper.abstract ?? "OpenAlex has no abstract for this paper"}
              </p>
            </section>

            <div className="preview-links">
              <a href={paper.url} target="_blank" rel="noreferrer">
                Open paper
                <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
              </a>
              {paper.doi && paper.doi !== paper.url ? (
                <a href={paper.doi} target="_blank" rel="noreferrer">
                  {doiText(paper.doi)}
                  <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
