"use client";

import type { Paper } from "../../lib/research-types";

interface PaperDetailsProps {
  paper: Paper | null;
  collapsed: boolean;
  onToggle: () => void;
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
  collapsed,
  onToggle,
}: PaperDetailsProps) {
  return (
    <aside
      className={`details-panel${collapsed ? " collapsed" : ""}`}
      aria-label="Paper details"
    >
      <div className="details-head">
        <h2 className="details-heading">Paper details</h2>
        <button
          className="panel-toggle"
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls="paper-details-content"
          aria-label={collapsed ? "Expand paper details" : "Collapse paper details"}
          title={collapsed ? "Expand details" : "Collapse details"}
        >
          <span className="toggle-desktop" aria-hidden="true">
            {collapsed ? "‹" : "Hide ›"}
          </span>
          <span className="toggle-mobile" aria-hidden="true">
            {collapsed ? "Show ↓" : "Hide ↑"}
          </span>
        </button>
      </div>

      <div
        id="paper-details-content"
        className="details-content"
        hidden={collapsed}
      >
        {!paper ? (
          <p className="detail-empty">
            Select a paper in the graph to inspect its available metadata.
          </p>
        ) : (
          <>
            <span className={`relation-pill ${paper.relation}`}>
              {relationLabels[paper.relation]}
            </span>
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
                    className="oa-pill"
                    style={{
                      background: paper.isOpenAccess ? "#e7f4ed" : "#f0f1f2",
                      color: paper.isOpenAccess ? "#257451" : "#69717c",
                    }}
                  >
                    {paper.isOpenAccess
                      ? paper.openAccessStatus || "Open"
                      : "Closed"}
                  </span>
                </span>
              </div>
            </div>

            <h4 className="abstract-heading">Abstract</h4>
            <p className={`abstract${paper.abstract ? "" : " unavailable"}`}>
              {paper.abstract ?? "No abstract is available from OpenAlex."}
            </p>

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
