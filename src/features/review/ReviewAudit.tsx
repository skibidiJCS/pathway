import { Download, Network, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateAudit,
  collectionToBibtex,
  collectionToCsv,
  compareSavedPapers,
} from "../../../lib/collection";
import type {
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";
import type { ReviewFocus } from "../../app/app-types";
import { AuditPaperList, BridgePaperList } from "./AuditPaperLists";
import { CollectionRow } from "./CollectionRow";
import { SavedGraph } from "./SavedGraph";
import { checkedLabel, compactTitle, downloadFile } from "./review-utils";

interface ReviewAuditProps {
  collection: SavedPaper[];
  limit: number;
  synced: boolean;
  updates: Paper[];
  checkingUpdates: boolean;
  lastCheckedAt: string | null;
  theme: "light" | "dark";
  focus: ReviewFocus | null;
  folderFilter: string;
  onFolderFilterChange: (folder: string) => void;
  onExplore: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onStatusChange: (paperId: string, status: ReviewStatus) => void;
  onNoteChange: (paperId: string, note: string) => void;
  onFolderChange: (paperId: string, folder: string | null) => void;
  onTagsChange: (paperId: string, tags: string[]) => void;
  onCheckUpdates: () => void;
}

export function ReviewAudit({
  collection,
  limit,
  synced,
  updates,
  checkingUpdates,
  lastCheckedAt,
  theme,
  focus,
  folderFilter,
  onFolderFilterChange: setFolderFilter,
  onExplore,
  onRemove,
  onStatusChange,
  onNoteChange,
  onFolderChange,
  onTagsChange,
  onCheckUpdates,
}: ReviewAuditProps) {
  const audit = useMemo(() => calculateAudit(collection), [collection]);
  const [firstId, setFirstId] = useState(collection[0]?.paper.id ?? "");
  const [secondId, setSecondId] = useState(collection[1]?.paper.id ?? "");
  const [mapOpen, setMapOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const handledFocus = useRef(0);
  const [mappedIds, setMappedIds] = useState<string[]>(() =>
    collection.slice(0, 25).map((entry) => entry.paper.id),
  );

  useEffect(() => {
    if (!collection.some((entry) => entry.paper.id === firstId)) {
      setFirstId(collection[0]?.paper.id ?? "");
    }
    if (
      !collection.some((entry) => entry.paper.id === secondId) ||
      firstId === secondId
    ) {
      setSecondId(
        collection.find((entry) => entry.paper.id !== firstId)?.paper.id ?? "",
      );
    }
  }, [collection, firstId, secondId]);

  useEffect(() => {
    setMappedIds((current) => {
      const available = new Set(collection.map((entry) => entry.paper.id));
      const valid = current.filter((id) => available.has(id)).slice(0, 25);
      return valid.length > 0
        ? valid
        : collection.slice(0, 25).map((entry) => entry.paper.id);
    });
  }, [collection]);

  const comparison = useMemo(() => {
    const first = collection.find((entry) => entry.paper.id === firstId);
    const second = collection.find((entry) => entry.paper.id === secondId);
    return first && second && first.paper.id !== second.paper.id
      ? compareSavedPapers(first, second)
      : null;
  }, [collection, firstId, secondId]);
  const folders = useMemo(
    () =>
      [...new Set(collection.flatMap((entry) => entry.folder ?? []))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [collection],
  );
  const tags = useMemo(
    () =>
      [...new Set(collection.flatMap((entry) => entry.tags))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [collection],
  );
  const visibleCollection = useMemo(
    () =>
      collection.filter(
        (entry) =>
          (!folderFilter || entry.folder === folderFilter) &&
          (!tagFilter || entry.tags.includes(tagFilter)),
      ),
    [collection, folderFilter, tagFilter],
  );

  useEffect(() => {
    if (folderFilter && !folders.includes(folderFilter)) setFolderFilter("");
    if (tagFilter && !tags.includes(tagFilter)) setTagFilter("");
  }, [folderFilter, folders, tagFilter, tags]);

  useEffect(() => {
    if (!focus || focus.request === handledFocus.current) return;
    handledFocus.current = focus.request;
    if (focus.section === "map" && collection.length >= 2) setMapOpen(true);
    const frame = window.requestAnimationFrame(() => {
      const target =
        document.getElementById(`review-${focus.section}`) ??
        document.getElementById("review-collection");
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [collection.length, focus]);

  if (collection.length === 0) {
    return (
      <section className="review-empty">
        <span className="review-kicker">Saved papers</span>
        <h1>Nothing saved yet</h1>
        <p>
          Save a paper from its reading panel to start a private reading list.
          With two or more saved papers you can map them, compare their
          references and find the papers your list is missing.
        </p>
        <span className="collection-capacity">
          {synced ? "Google-synced" : "Stored on this device"} · 0/{limit}
        </span>
      </section>
    );
  }

  const openPercent = Math.round(
    (audit.openAccessCount / collection.length) * 100,
  );

  return (
    <section className="review-workspace" aria-label="Saved literature review">
      <header className="review-heading">
        <div>
          <span className="review-kicker">
            {synced ? "Synced with Google" : "Saved on this device"} ·{" "}
            <span className="tabular">
              {collection.length}/{limit}
            </span>
          </span>
          <h1>
            {collection.length} saved paper{collection.length === 1 ? "" : "s"}
          </h1>
        </div>
        <div className="review-heading-actions">
          <button
            type="button"
            className="button"
            onClick={() => setMapOpen((open) => !open)}
            disabled={collection.length < 2}
            aria-expanded={mapOpen}
          >
            <Network size={16} strokeWidth={1.5} aria-hidden />
            {mapOpen ? "Close map" : "Map papers"}
          </button>
          <button
            type="button"
            className="button"
            onClick={onCheckUpdates}
            disabled={checkingUpdates}
          >
            <RefreshCw size={16} strokeWidth={1.5} aria-hidden />
            {checkingUpdates ? "Checking…" : "Check for new citing papers"}
          </button>
          <button
            type="button"
            className="button"
            onClick={() =>
              downloadFile(
                "pathway-review.csv",
                collectionToCsv(collection),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download size={16} strokeWidth={1.5} aria-hidden />
            CSV
          </button>
          <button
            type="button"
            className="button"
            onClick={() =>
              downloadFile(
                "pathway-review.bib",
                collectionToBibtex(collection),
                "application/x-bibtex;charset=utf-8",
              )
            }
          >
            <Download size={16} strokeWidth={1.5} aria-hidden />
            BibTeX
          </button>
        </div>
      </header>

      <div className="updates-line" id="review-updates" role="status">
        <span>New citing papers</span>
        <span>
          {checkedLabel(lastCheckedAt)}
          {updates.length > 0 ? ` · ${updates.length} found` : ""}
        </span>
      </div>

      {updates.length > 0 ? (
        <section className="updates-strip" aria-label="New papers">
          {updates.slice(0, 6).map((paper) => (
            <button
              type="button"
              key={paper.id}
              onClick={() => onExplore(paper)}
              title={paper.title}
            >
              <strong>{compactTitle(paper.title, 52)}</strong>
              <span className="tabular">
                {paper.year ?? "n.d."} ·{" "}
                {paper.citationCount.toLocaleString()} citations
              </span>
            </button>
          ))}
        </section>
      ) : null}

      <dl className="audit-stats">
        <div>
          <dt>Open access</dt>
          <dd className="tabular">
            {audit.openAccessCount}
            <span> of {collection.length} · {openPercent}%</span>
          </dd>
        </div>
        <div>
          <dt>Median citations</dt>
          <dd className="tabular">{audit.medianCitations.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Total citations</dt>
          <dd className="tabular">{audit.totalCitations.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Publication years</dt>
          <dd className="tabular">{audit.years.length}</dd>
        </div>
      </dl>

      {mapOpen ? (
        <section className="saved-map-section" id="review-map" aria-label="Saved paper map">
          <header className="saved-map-heading">
            <div>
              <h2>Paper map</h2>
              <p>
                Choose up to 25 papers. Arrows are direct citations, dashed
                lines are shared references or citing papers, dotted lines are
                shared OpenAlex topics
              </p>
            </div>
            <span className="tabular">{mappedIds.length} of 25 selected</span>
          </header>
          <div className="saved-map-selector">
            {collection.map((entry) => {
              const checked = mappedIds.includes(entry.paper.id);
              return (
                <label key={entry.paper.id} title={entry.paper.title}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && mappedIds.length >= 25}
                    onChange={(event) =>
                      setMappedIds((current) =>
                        event.target.checked
                          ? [...current, entry.paper.id].slice(0, 25)
                          : current.filter((id) => id !== entry.paper.id),
                      )
                    }
                  />
                  <span>{compactTitle(entry.paper.title, 42)}</span>
                </label>
              );
            })}
          </div>
          <SavedGraph
            collection={collection}
            selectedIds={mappedIds}
            theme={theme}
            onExplore={onExplore}
          />

        </section>
      ) : null}

      <div className="review-layout">
        <section className="collection-section" id="review-collection">
          <div className="collection-heading">
            <h2>Reading list</h2>
            <span className="tabular">
              {visibleCollection.length === collection.length
                ? `${collection.length} papers`
                : `${visibleCollection.length} of ${collection.length}`}
            </span>
          </div>
          <div className="collection-filters" aria-label="Collection filters">
            <select
              value={folderFilter}
              onChange={(event) => setFolderFilter(event.target.value)}
              aria-label="Filter saved papers by folder"
            >
              <option value="">All folders</option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
            <select
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              aria-label="Filter saved papers by tag"
            >
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          <datalist id="pathway-folder-options">
            {folders.map((folder) => (
              <option key={folder} value={folder} />
            ))}
          </datalist>
          <div className="collection-list">
            {visibleCollection.map((entry, index) => (
              <CollectionRow
                key={entry.paper.id}
                entry={entry}
                index={index}
                onExplore={onExplore}
                onRemove={onRemove}
                onStatusChange={onStatusChange}
                onNoteChange={onNoteChange}
                onFolderChange={onFolderChange}
                onTagsChange={onTagsChange}
              />
            ))}
            {visibleCollection.length === 0 ? (
              <p className="collection-filter-empty">
                No saved papers match these filters
              </p>
            ) : null}
          </div>
        </section>

        <div className="audit-column">
          <section className="audit-section" id="review-coverage">
            <h2>Coverage</h2>
            <div className="coverage-grid">
              <div>
                <h3>Publication years</h3>
                <p>
                  {audit.years
                    .map((item) => `${item.label} (${item.count})`)
                    .join(" · ")}
                </p>
              </div>
              <div>
                <h3>Topics</h3>
                <p>
                  {audit.topics.length
                    ? audit.topics
                        .slice(0, 8)
                        .map((item) => `${item.label} (${item.count})`)
                        .join(" · ")
                    : "OpenAlex has no topics for these papers"}
                </p>
              </div>
            </div>
          </section>

          <section className="audit-section" id="review-bridges">
            <h2>Bridge papers</h2>
            <p className="audit-section-intro">
              Papers that link two or more of your saved papers through their
              references or citing papers
            </p>
            <BridgePaperList
              papers={audit.bridgePapers.slice(0, 8)}
              onExplore={onExplore}
            />
          </section>

          <section className="audit-section" id="review-overlap">
            <h2>Reference overlap</h2>
            <div className="coverage-grid">
              <div>
                <h3>
                  Shared references{" "}
                  <span className="tabular">{audit.sharedReferences.length}</span>
                </h3>
                <AuditPaperList
                  papers={audit.sharedReferences.slice(0, 6)}
                  empty="No two saved papers share a reference yet"
                  onExplore={onExplore}
                />
              </div>
              <div>
                <h3>Often cited, not saved</h3>
                <AuditPaperList
                  papers={audit.missingFrequentPapers.slice(0, 6)}
                  empty="Nothing is cited repeatedly that you have not saved"
                  onExplore={onExplore}
                />
              </div>
            </div>
          </section>

          <section className="audit-section comparison-section" id="review-compare">
            <div className="comparison-heading">
              <h2>Compare two papers</h2>
              <div>
                <select
                  value={firstId}
                  onChange={(event) => setFirstId(event.target.value)}
                  aria-label="First paper to compare"
                >
                  {collection.map((entry) => (
                    <option
                      key={entry.paper.id}
                      value={entry.paper.id}
                      disabled={entry.paper.id === secondId}
                    >
                      {compactTitle(entry.paper.title, 42)}
                    </option>
                  ))}
                </select>
                <select
                  value={secondId}
                  onChange={(event) => setSecondId(event.target.value)}
                  aria-label="Second paper to compare"
                  disabled={collection.length < 2}
                >
                  {collection
                    .filter((entry) => entry.paper.id !== firstId)
                    .map((entry) => (
                      <option key={entry.paper.id} value={entry.paper.id}>
                        {compactTitle(entry.paper.title, 42)}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {comparison ? (
              <>
                <dl className="comparison-counts">
                  <div>
                    <dt>Shared references</dt>
                    <dd className="tabular">{comparison.sharedReferences.length}</dd>
                  </div>
                  <div>
                    <dt>Only in first</dt>
                    <dd className="tabular">{comparison.firstOnlyReferences.length}</dd>
                  </div>
                  <div>
                    <dt>Only in second</dt>
                    <dd className="tabular">{comparison.secondOnlyReferences.length}</dd>
                  </div>
                  <div>
                    <dt>Common citing papers</dt>
                    <dd className="tabular">{comparison.commonCitingPapers.length}</dd>
                  </div>
                </dl>
                <p className="direct-relationship">
                  {comparison.directRelationships.length
                    ? comparison.directRelationships.join(" · ")
                    : "Neither paper cites the other in the stored citation lists"}
                </p>
              </>
            ) : (
              <p className="audit-empty-text">
                Save at least two papers to compare them
              </p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
