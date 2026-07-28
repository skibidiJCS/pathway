import { useEffect, useMemo, useState } from "react";
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
  const [folderFilter, setFolderFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
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

  if (collection.length === 0) {
    return (
      <section className="review-empty">
        <span className="review-kicker">Saved literature</span>
        <h1>Your collection is empty.</h1>
        <p>
          Save a paper from its details panel to build a private reading list,
          compare references, and check coverage.
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
            {synced ? "Google-synced collection" : "Local collection"}
          </span>
          <h1>
            {collection.length} saved paper{collection.length === 1 ? "" : "s"}
          </h1>
          <span className="collection-capacity">
            {collection.length}/{limit} papers
          </span>
        </div>
        <div className="review-heading-actions">
          <button
            type="button"
            onClick={() => setMapOpen((open) => !open)}
            disabled={collection.length < 2}
            aria-expanded={mapOpen}
          >
            {mapOpen ? "Close map" : "Map papers"}
          </button>
          <button
            type="button"
            onClick={onCheckUpdates}
            disabled={checkingUpdates}
          >
            {checkingUpdates ? "Checking…" : "Check for new papers"}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadFile(
                "pathway-review.csv",
                collectionToCsv(collection),
                "text/csv;charset=utf-8",
              )
            }
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadFile(
                "pathway-review.bib",
                collectionToBibtex(collection),
                "application/x-bibtex;charset=utf-8",
              )
            }
          >
            BibTeX
          </button>
        </div>
      </header>

      <div className="updates-line" role="status">
        <span>{checkedLabel(lastCheckedAt)}</span>
        {updates.length > 0 ? (
          <span>{updates.length} new citing papers found</span>
        ) : null}
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
              <span>
                {paper.year ?? "Year unknown"} ·{" "}
                {paper.citationCount.toLocaleString()} citations
              </span>
            </button>
          ))}
        </section>
      ) : null}

      <div className="audit-stats">
        <span>
          <strong>{audit.openAccessCount}</strong> open access ({openPercent}%)
        </span>
        <span>
          <strong>{audit.totalCitations.toLocaleString()}</strong> total citations
        </span>
        <span>
          <strong>{audit.medianCitations.toLocaleString()}</strong> median citations
        </span>
        <span>
          <strong>{audit.years.length}</strong> publication years
        </span>
      </div>

      {mapOpen ? (
        <section className="saved-map-section" aria-label="Saved paper map">
          <header className="saved-map-heading">
            <div>
              <h2>Saved paper map</h2>
              <p>
                Select up to 25 papers. Arrows show direct citations; dashed
                lines show shared citation neighborhoods; dotted lines show
                shared OpenAlex topics.
              </p>
            </div>
            <span>{mappedIds.length} selected</span>
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
          <p className="saved-map-note">
            Connections use stored citation neighborhoods and OpenAlex topic
            metadata.
          </p>
        </section>
      ) : null}

      <div className="review-layout">
        <section className="collection-section">
          <div className="collection-heading">
            <h2>Saved collection</h2>
            <span>
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
                No papers match these filters.
              </p>
            ) : null}
          </div>
        </section>

        <div className="audit-column">
          <section className="audit-section">
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
                    : "Topic metadata is unavailable for these records."}
                </p>
              </div>
            </div>
          </section>

          <section className="audit-section">
            <h2>Bridge papers</h2>
            <p className="audit-section-intro">
              Papers connecting at least two saved papers through their stored
              references or citing-paper lists.
            </p>
            <BridgePaperList
              papers={audit.bridgePapers.slice(0, 8)}
              onExplore={onExplore}
            />
          </section>

          <section className="audit-section">
            <h2>Reference overlap</h2>
            <div className="coverage-grid">
              <div>
                <h3>Shared references ({audit.sharedReferences.length})</h3>
                <AuditPaperList
                  papers={audit.sharedReferences.slice(0, 6)}
                  empty="No references are shared by two saved papers yet."
                  onExplore={onExplore}
                />
              </div>
              <div>
                <h3>Strongest omissions</h3>
                <AuditPaperList
                  papers={audit.missingFrequentPapers.slice(0, 6)}
                  empty="No repeatedly cited omissions are visible yet."
                  onExplore={onExplore}
                />
              </div>
            </div>
          </section>

          <section className="audit-section comparison-section">
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
                <div className="comparison-counts">
                  <span>
                    <strong>{comparison.sharedReferences.length}</strong> shared
                    references
                  </span>
                  <span>
                    <strong>{comparison.firstOnlyReferences.length}</strong> unique
                    to first
                  </span>
                  <span>
                    <strong>{comparison.secondOnlyReferences.length}</strong>{" "}
                    unique to second
                  </span>
                  <span>
                    <strong>{comparison.commonCitingPapers.length}</strong> common
                    citing papers
                  </span>
                </div>
                <p className="direct-relationship">
                  {comparison.directRelationships.length
                    ? comparison.directRelationships.join(" · ")
                    : "No direct citation relationship appears in the stored neighborhoods."}
                </p>
              </>
            ) : (
              <p className="audit-empty-text">
                Save at least two papers to compare them.
              </p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
