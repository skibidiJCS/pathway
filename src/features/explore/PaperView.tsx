import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  sortCitationPapers,
  type PaperSort,
} from "../../../lib/graph-view";
import type {
  CitationGraphData,
  Paper,
  SavedPaper,
} from "../../../lib/research-types";
import { CitationTimeline } from "./CitationTimeline";
import {
  accessText,
  authorsText,
  citationsText,
  doiText,
} from "./paper-format";

type Relation = "reference" | "citing";
const PREVIEW_COUNT = 5;

function relationPapers(papers: Paper[], relation: Relation): Paper[] {
  return papers.filter(
    (paper) => paper.relation === relation || paper.relation === "both",
  );
}

/** Log scale, so one landmark paper does not flatten every other bar. */
function citationWeight(count: number, max: number): number {
  if (max <= 0) return 0;
  return Math.log10(count + 1) / Math.log10(max + 1);
}

function Trail({
  history,
  currentId,
  onFollow,
}: {
  history: Paper[];
  currentId: string;
  onFollow: (paper: Paper) => void;
}) {
  // Stored newest first; a path reads from where you started.
  const stops = useMemo(() => [...history].reverse().slice(-6), [history]);
  if (stops.length < 2) return null;
  return (
    <nav className="trail" aria-label="Your path so far">
      <span className="trail-label">Your path</span>
      <ol>
        {stops.map((paper) => {
          const current = paper.id === currentId;
          return (
            <li key={paper.id} className={current ? "current" : ""}>
              <button
                type="button"
                onClick={() => onFollow(paper)}
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

function ListColumn({
  title,
  hint,
  center,
  papers,
  selectedId,
  onSelect,
}: {
  title: string;
  hint: string;
  center: Paper;
  papers: Paper[];
  selectedId: string;
  onSelect: (paper: Paper) => void;
}) {
  const [sort, setSort] = useState<PaperSort>("most-cited");
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(
    () => sortCitationPapers(papers, sort, center),
    [center, papers, sort],
  );
  const max = useMemo(
    () => papers.reduce((m, paper) => Math.max(m, paper.citationCount), 0),
    [papers],
  );
  const shown = expanded ? sorted : sorted.slice(0, PREVIEW_COUNT);

  return (
    <section className="list-column" aria-label={title}>
      <header className="list-column-header">
        <div>
          <h2>
            {title} <span className="count tabular">{papers.length}</span>
          </h2>
          <p>{hint}</p>
        </div>
        {papers.length > 1 ? (
          <select
            className="bare-select"
            value={sort}
            onChange={(event) => setSort(event.target.value as PaperSort)}
            aria-label={`Sort ${title}`}
          >
            <option value="most-cited">Most cited</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="relevance">Closest in topic</option>
          </select>
        ) : null}
      </header>
      {papers.length === 0 ? (
        <p className="muted-text list-empty">
          None listed in OpenAlex, or hidden by your filters
        </p>
      ) : (
        <ol className="paper-list">
          {shown.map((paper) => (
            <li key={paper.id}>
              <button
                type="button"
                className={`paper-row${paper.id === selectedId ? " active" : ""}`}
                onClick={() => onSelect(paper)}
                aria-pressed={paper.id === selectedId}
              >
                <span className="paper-row-title">{paper.title}</span>
                <span className="meta-row tabular">
                  <span>{paper.year ?? "Year unknown"}</span>
                  <span>{citationsText(paper.citationCount)}</span>
                  {paper.relation === "both" ? (
                    <span className="mutual">Cites each other</span>
                  ) : null}
                </span>
                <span className="citation-bar" aria-hidden="true">
                  <span
                    style={{
                      transform: `scaleX(${citationWeight(paper.citationCount, max).toFixed(3)})`,
                    }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {papers.length > PREVIEW_COUNT ? (
        <button
          type="button"
          className="show-all"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Show fewer" : `Show all ${papers.length}`}
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            aria-hidden
            className={expanded ? "flipped" : ""}
          />
        </button>
      ) : null}
    </section>
  );
}

export function PaperView({
  graph,
  visibleNodes,
  selectedId,
  history,
  minYear,
  openAccessOnly,
  savedEntry,
  saving,
  collectionFull,
  onSelect,
  onFollow,
  onSave,
  onRemove,
  onMinYearChange,
  onOpenAccessChange,
}: {
  graph: CitationGraphData;
  visibleNodes: Paper[];
  selectedId: string;
  history: Paper[];
  minYear: string;
  openAccessOnly: boolean;
  savedEntry: SavedPaper | null;
  saving: boolean;
  collectionFull: boolean;
  onSelect: (paper: Paper) => void;
  onFollow: (paper: Paper) => void;
  onSave: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onMinYearChange: (year: string) => void;
  onOpenAccessChange: (enabled: boolean) => void;
}) {
  const [abstractOpen, setAbstractOpen] = useState(false);
  const center =
    graph.nodes.find((paper) => paper.id === graph.centerId) ?? null;
  const references = useMemo(
    () => relationPapers(visibleNodes, "reference"),
    [visibleNodes],
  );
  const citing = useMemo(
    () => relationPapers(visibleNodes, "citing"),
    [visibleNodes],
  );

  useEffect(() => setAbstractOpen(false), [graph.centerId]);

  if (!center) return null;
  const access = accessText(center);
  const filtered = minYear !== "" || openAccessOnly;

  return (
    <div className="paper-view">
      <Trail history={history} currentId={center.id} onFollow={onFollow} />

      <article className="center-card">
        <h1 className="center-title">{center.title}</h1>
        <p className="center-authors">{authorsText(center.authors)}</p>
        <p className="meta-row center-meta tabular">
          <span>{center.year ?? "Year unknown"}</span>
          <span>{citationsText(center.citationCount)}</span>
          {center.source ? <span>{center.source}</span> : null}
          <span title={access.hint}>{access.label}</span>
        </p>
        {center.abstract ? (
          <div className={`center-abstract${abstractOpen ? " open" : ""}`}>
            <p>{center.abstract}</p>
            <button
              type="button"
              className="text-link"
              onClick={() => setAbstractOpen((value) => !value)}
              aria-expanded={abstractOpen}
            >
              {abstractOpen ? "Show less" : "Read the abstract"}
            </button>
          </div>
        ) : (
          <p className="muted-text center-no-abstract">
            OpenAlex has no abstract for this paper
          </p>
        )}
        <div className="center-actions">
          {savedEntry ? (
            <>
              <span className="saved-mark large">
                <Check size={16} strokeWidth={1.75} aria-hidden />
                In your reading list
              </span>
              <button
                type="button"
                className="button quiet"
                onClick={() => onRemove(center.id)}
              >
                Remove
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button primary"
              onClick={() => onSave(center)}
              disabled={collectionFull || saving}
            >
              <BookmarkPlus size={16} strokeWidth={1.5} aria-hidden />
              {saving
                ? "Saving…"
                : collectionFull
                  ? "Reading list is full"
                  : "Save to reading list"}
            </button>
          )}
          <a className="button quiet" href={center.url} target="_blank" rel="noreferrer">
            Open paper
            <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
          </a>
          {center.doi && center.doi !== center.url ? (
            <a className="button quiet" href={center.doi} target="_blank" rel="noreferrer">
              {doiText(center.doi)}
              <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
            </a>
          ) : null}
        </div>
      </article>

      <section className="neighborhood" aria-label="Where this paper sits">
        <div className="neighborhood-header">
          <h2>Where it sits in the literature</h2>
          <div className="filters" aria-label="Filters">
            <label className="year-field">
              <span>From</span>
              <input
                className="year-input tabular"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={minYear}
                onChange={(event) =>
                  onMinYearChange(
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                placeholder="year"
                aria-label="Show papers published from this year"
              />
            </label>
            <label className="oa-filter">
              <input
                type="checkbox"
                checked={openAccessOnly}
                onChange={(event) => onOpenAccessChange(event.target.checked)}
              />
              <span>Open access only</span>
            </label>
            {filtered ? (
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  onMinYearChange("");
                  onOpenAccessChange(false);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <CitationTimeline
          key={graph.centerId}
          center={center}
          references={references}
          citing={citing}
          selectedId={selectedId}
          onSelect={onSelect}
        />

        <div className="list-columns">
          <ListColumn
            key={`ref-${graph.centerId}`}
            title="Builds on"
            hint="Earlier papers it cites"
            center={center}
            papers={references}
            selectedId={selectedId}
            onSelect={onSelect}
          />
          <ListColumn
            key={`cit-${graph.centerId}`}
            title="Built upon by"
            hint="Later papers that cite it"
            center={center}
            papers={citing}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      </section>
    </div>
  );
}
