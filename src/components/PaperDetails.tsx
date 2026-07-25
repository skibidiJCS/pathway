"use client";

import type {
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../lib/research-types";

interface PaperDetailsProps {
  paper: Paper | null;
  expanded: boolean;
  savedEntry: SavedPaper | null;
  collectionFull: boolean;
  saving: boolean;
  onToggle: () => void;
  onSave: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onStatusChange: (paperId: string, status: ReviewStatus) => void;
  onNoteChange: (paperId: string, note: string) => void;
}

const relationLabels: Record<Paper["relation"], string> = {
  selected: "Selected paper",
  reference: "Reference",
  citing: "Citing paper",
  both: "Cites each other",
};

function authorsText(authors: string[]): string {
  if (authors.length === 0) return "Authors unavailable";
  if (authors.length <= 6) return authors.join(", ");
  return `${authors.slice(0, 6).join(", ")} +${authors.length - 6} more`;
}

export function PaperDetails({
  paper,
  expanded,
  savedEntry,
  collectionFull,
  saving,
  onToggle,
  onSave,
  onRemove,
  onStatusChange,
  onNoteChange,
}: PaperDetailsProps) {
  return (
    <aside
      className={`details-panel${expanded ? " expanded" : ""}`}
      aria-label="Paper details"
    >
      <div id="paper-details-content" className="details-content">
        <div className="detail-toolbar">
          {paper ? (
            <span className={`relation-pill ${paper.relation}`}>
              {relationLabels[paper.relation]}
            </span>
          ) : (
            <span />
          )}
          <button
            className="panel-toggle"
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls="paper-details-content"
            aria-label={expanded ? "Reduce paper details" : "Open paper details"}
            title={expanded ? "Reduce details" : "Open details"}
          >
            {expanded ? "Reduce →" : "Open ←"}
          </button>
        </div>
        {!paper ? (
          <p className="detail-empty">
            Select a paper in the graph to inspect its available metadata.
          </p>
        ) : (
          <>
            <h3 className="detail-title">{paper.title}</h3>
            <p className="detail-authors">{authorsText(paper.authors)}</p>

            <div className="detail-grid">
              <div className="detail-stat">
                <span className="detail-label">Year</span>
                <span className="detail-value">{paper.year ?? "Unknown"}</span>
              </div>
              <div className="detail-stat">
                <span className="detail-label">Citations</span>
                <span className="detail-value">
                  {paper.citationCount.toLocaleString()}
                </span>
              </div>
              <div className="detail-stat">
                <span className="detail-label">Source</span>
                <span className="detail-value">
                  {paper.source ?? "Unavailable"}
                </span>
              </div>
              <div className="detail-stat">
                <span className="detail-label">Access</span>
                <span className="detail-value">
                  <span
                    className={`oa-pill ${paper.isOpenAccess ? "open" : "closed"}`}
                  >
                    {paper.isOpenAccess
                      ? paper.openAccessStatus || "Open"
                      : "Closed"}
                  </span>
                </span>
              </div>
            </div>

            <section className="abstract-section">
              <h4 className="abstract-heading">Abstract</h4>
              <p className={`abstract${paper.abstract ? "" : " unavailable"}`}>
                {paper.abstract ?? "No abstract is available from OpenAlex."}
              </p>
            </section>

            <section className="paper-review-controls">
              {savedEntry ? (
                <>
                  <div className="paper-review-row">
                    <label>
                      Status
                      <select
                        value={savedEntry.status}
                        onChange={(event) =>
                          onStatusChange(
                            paper.id,
                            event.target.value as ReviewStatus,
                          )
                        }
                      >
                        <option value="unread">Unread</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="used">Used</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => onRemove(paper.id)}>
                      Remove
                    </button>
                  </div>
                  <label className="paper-note-label">
                    Private note
                    <textarea
                      value={savedEntry.note}
                      onChange={(event) =>
                        onNoteChange(paper.id, event.target.value)
                      }
                      maxLength={2000}
                      rows={expanded ? 3 : 2}
                      placeholder="Add a note…"
                    />
                  </label>
                </>
              ) : (
                <button
                  className="save-paper-button"
                  type="button"
                  onClick={() => onSave(paper)}
                  disabled={collectionFull || saving}
                >
                  {saving
                    ? "Saving…"
                    : collectionFull
                      ? "Collection limit reached"
                      : "Save paper"}
                </button>
              )}
            </section>

            <div className="detail-actions">
              <a
                className="paper-link"
                href={paper.url}
                target="_blank"
                rel="noreferrer"
              >
                Open paper ↗
              </a>
              {paper.doi && paper.doi !== paper.url ? (
                <a
                  className="paper-link"
                  href={paper.doi}
                  target="_blank"
                  rel="noreferrer"
                >
                  View DOI ↗
                </a>
              ) : null}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
