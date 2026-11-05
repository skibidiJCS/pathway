import {
  ArrowRight,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type {
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";

interface PaperDetailsProps {
  paper: Paper | null;
  expanded: boolean;
  savedEntry: SavedPaper | null;
  isCenter: boolean;
  collectionFull: boolean;
  saving: boolean;
  onToggle: () => void;
  onExplore: (paper: Paper) => void;
  onSave: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onStatusChange: (paperId: string, status: ReviewStatus) => void;
  onNoteChange: (paperId: string, note: string) => void;
}

const relationLabels: Record<Paper["relation"], string> = {
  selected: "Center paper",
  reference: "Reference of the center paper",
  citing: "Cites the center paper",
  both: "Cites and is cited by the center paper",
};

/** OpenAlex access routes, in words a reader can act on. */
const accessLabels: Record<string, { label: string; hint: string }> = {
  gold: { label: "Open, publisher", hint: "Published open access in an open-access journal" },
  diamond: { label: "Open, no-fee journal", hint: "Open access with no fees for authors or readers" },
  hybrid: { label: "Open, hybrid journal", hint: "Open access article in a subscription journal" },
  bronze: { label: "Free to read", hint: "Free on the publisher site without an open licence" },
  green: { label: "Open, repository copy", hint: "A free copy is held in a repository such as arXiv" },
};

function accessText(paper: Paper): { label: string; hint: string } {
  if (!paper.isOpenAccess) {
    return { label: "Closed", hint: "No free copy is listed in OpenAlex" };
  }
  return (
    accessLabels[paper.openAccessStatus?.toLowerCase() ?? ""] ?? {
      label: "Open access",
      hint: "OpenAlex lists a free copy",
    }
  );
}

function authorsText(authors: string[]): string {
  if (authors.length === 0) return "Authors unavailable";
  if (authors.length <= 6) return authors.join(", ");
  return `${authors.slice(0, 6).join(", ")} and ${authors.length - 6} more`;
}

function doiText(doi: string): string {
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
}

export function PaperDetails({
  paper,
  expanded,
  savedEntry,
  isCenter,
  collectionFull,
  saving,
  onToggle,
  onExplore,
  onSave,
  onRemove,
  onStatusChange,
  onNoteChange,
}: PaperDetailsProps) {
  const access = paper ? accessText(paper) : null;
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [paper?.id]);

  return (
    <aside
      ref={panelRef}
      className={`details-panel${expanded ? " expanded" : ""}${paper ? "" : " empty"}`}
      aria-label="Paper details"
    >
      <div id="paper-details-content" className="details-content">
        <div className="detail-toolbar">
          <span className="relation-label">
            {paper ? relationLabels[paper.relation] : "Paper details"}
          </span>
          {paper ? (
            <button
              className="icon-button panel-toggle"
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls="paper-details-content"
              aria-label={expanded ? "Collapse reading panel" : "Expand reading panel"}
              title={expanded ? "Collapse reading panel" : "Expand reading panel"}
            >
              <span className="panel-toggle-desktop">
                {expanded ? (
                  <PanelRightClose size={16} strokeWidth={1.5} aria-hidden />
                ) : (
                  <PanelRightOpen size={16} strokeWidth={1.5} aria-hidden />
                )}
              </span>
              <span className="panel-toggle-mobile">
                {expanded ? (
                  <ChevronDown size={18} strokeWidth={1.5} aria-hidden />
                ) : (
                  <ChevronUp size={18} strokeWidth={1.5} aria-hidden />
                )}
              </span>
            </button>
          ) : null}
        </div>
        {!paper || !access ? (
          <p className="detail-empty">
            Open a paper from the lists to read its abstract and details here
          </p>
        ) : (
          <>
            <h2 className="detail-title">{paper.title}</h2>
            <div className="detail-body">
              <p className="detail-authors">{authorsText(paper.authors)}</p>

              <dl className="catalog-card">
                <div>
                  <dt>Year</dt>
                  <dd className="tabular">{paper.year ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Citations</dt>
                  <dd className="tabular">{paper.citationCount.toLocaleString()}</dd>
                </div>
                <div className="wide">
                  <dt>Source</dt>
                  <dd>{paper.source ?? "Unavailable"}</dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd title={access.hint}>
                    <span className={`access-dot ${paper.isOpenAccess ? "open" : "closed"}`} aria-hidden />
                    {access.label}
                  </dd>
                </div>
                {paper.doi ? (
                  <div>
                    <dt>DOI</dt>
                    <dd className="doi">{doiText(paper.doi)}</dd>
                  </div>
                ) : null}
              </dl>

              <section className="abstract-section" aria-label="Abstract">
                <h3 className="abstract-heading">Abstract</h3>
                <p className={`abstract${paper.abstract ? "" : " unavailable"}`}>
                  {paper.abstract ?? "OpenAlex has no abstract for this paper"}
                </p>
              </section>

              <section className="paper-review-controls" aria-label="Reading list">
                {savedEntry ? (
                  <>
                    <div className="paper-review-row">
                      <label>
                        <span>Status</span>
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
                      <button
                        type="button"
                        className="button quiet"
                        onClick={() => onRemove(paper.id)}
                      >
                        Remove from saved
                      </button>
                    </div>
                    <label className="paper-note-label">
                      <span>Private note</span>
                      <textarea
                        value={savedEntry.note}
                        onChange={(event) =>
                          onNoteChange(paper.id, event.target.value)
                        }
                        maxLength={2000}
                        rows={3}
                        placeholder="What this paper is for"
                      />
                    </label>
                  </>
                ) : null}
              </section>

              <div className="detail-actions">
                {!isCenter ? (
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => onExplore(paper)}
                  >
                    Explore its citations
                    <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
                  </button>
                ) : null}
                {!savedEntry ? (
                  <button
                    className={`button${isCenter ? " primary" : ""}`}
                    type="button"
                    onClick={() => onSave(paper)}
                    disabled={collectionFull || saving}
                  >
                    <BookmarkPlus size={16} strokeWidth={1.5} aria-hidden />
                    {saving
                      ? "Saving…"
                      : collectionFull
                        ? "Collection is full"
                        : "Save paper"}
                  </button>
                ) : null}
                <a
                  className="button"
                  href={paper.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open paper
                  <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
                </a>
                {paper.doi && paper.doi !== paper.url ? (
                  <a
                    className="button"
                    href={paper.doi}
                    target="_blank"
                    rel="noreferrer"
                  >
                    DOI
                    <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
