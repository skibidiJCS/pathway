import { ArrowLeft, ArrowRight, Bookmark, Check, ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Paper } from "../../../lib/research-types";
import {
  accessText,
  authorsText,
  citationsText,
} from "../explore/paper-format";

function Key({ children }: { children: string }) {
  return <kbd className="key">{children}</kbd>;
}

export function ReadingPane({
  paper,
  note,
  saved,
  skipped,
  saving,
  collectionFull,
  canFollow,
  onSave,
  onRemove,
  onSkip,
  onUnskip,
  onFollow,
  onBack,
}: {
  paper: Paper | null;
  note: string;
  saved: boolean;
  skipped: boolean;
  saving: boolean;
  collectionFull: boolean;
  canFollow: boolean;
  onSave: () => void;
  onRemove: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onFollow: () => void;
  /** Phones only: return to the list. */
  onBack: () => void;
}) {
  const paneRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
  }, [paper?.id]);

  if (!paper) return <section className="reading-pane empty" ref={paneRef} />;
  const access = accessText(paper);

  return (
    <section className="reading-pane" ref={paneRef} aria-label="Selected paper">
      <div className="reading-content" key={paper.id}>
        <button type="button" className="pane-back" onClick={onBack}>
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
          Back to list
        </button>
        <h2 className="reading-title">{paper.title || "Loading…"}</h2>
        <p className="reading-authors">{authorsText(paper.authors)}</p>
        <p className="meta-row reading-meta tabular">
          <span>{paper.year ?? "Year unknown"}</span>
          <span>{citationsText(paper.citationCount)}</span>
          {paper.source ? <span>{paper.source}</span> : null}
          <span title={access.hint}>{access.label}</span>
          {note ? <span>{note}</span> : null}
        </p>

        <div className="reading-actions">
          {saved ? (
            <button type="button" className="button saved-toggle" onClick={onRemove}>
              <Check size={16} strokeWidth={2} aria-hidden />
              Saved
            </button>
          ) : (
            <button
              type="button"
              className="button accent"
              onClick={onSave}
              disabled={saving || collectionFull}
            >
              <Bookmark size={16} strokeWidth={1.75} aria-hidden />
              {saving ? "Saving…" : collectionFull ? "List full" : "Save"}
              <Key>S</Key>
            </button>
          )}
          {canFollow ? (
            <>
              {skipped ? (
                <button type="button" className="button" onClick={onUnskip}>
                  Skipped
                </button>
              ) : (
                <button type="button" className="button" onClick={onSkip}>
                  <X size={16} strokeWidth={1.75} aria-hidden />
                  Skip
                  <Key>X</Key>
                </button>
              )}
              <button type="button" className="button primary" onClick={onFollow}>
                Follow
                <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
                <Key>F</Key>
              </button>
            </>
          ) : null}
          <a className="button quiet" href={paper.url} target="_blank" rel="noreferrer">
            Open
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
          </a>
        </div>

        {paper.abstract ? (
          <p className="reading-abstract">{paper.abstract}</p>
        ) : (
          <p className="muted-text reading-abstract">No abstract available</p>
        )}
      </div>
    </section>
  );
}
