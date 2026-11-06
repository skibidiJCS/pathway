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
import { compactTitle, downloadFile } from "./review-utils";

interface ReviewAuditProps {
  collection: SavedPaper[];
  limit: number;
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

function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? word : pluralWord}`;
}

function checkedText(lastCheckedAt: string | null): string {
  if (!lastCheckedAt) return "New citing papers have not been checked yet.";
  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(lastCheckedAt));
  return `New citing papers were last checked on ${date}.`;
}

export function ReviewAudit({
  collection,
  limit,
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
  }, [folderFilter, folders, setFolderFilter, tagFilter, tags]);

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
        <h1>No saved papers yet</h1>
        <p>
          Save papers from the reading panel while you explore. Once you have
          two or more, you can map them, compare their references and see what
          your list is missing.
        </p>
      </section>
    );
  }

  return (
    <section className="review-workspace" aria-label="Saved papers">
      <header className="review-heading">
        <h1>
          Saved papers{" "}
          <span className="heading-count tabular">
            {collection.length} of {limit}
          </span>
        </h1>
        <div className="review-actions">
          <button
            type="button"
            className="button quiet"
            onClick={() => setMapOpen((open) => !open)}
            disabled={collection.length < 2}
            aria-expanded={mapOpen}
          >
            <Network size={16} strokeWidth={1.5} aria-hidden />
            {mapOpen ? "Close map" : "Map papers"}
          </button>
          <button
            type="button"
            className="button quiet"
            onClick={onCheckUpdates}
            disabled={checkingUpdates}
          >
            <RefreshCw size={16} strokeWidth={1.5} aria-hidden />
            {checkingUpdates ? "Checking…" : "Check for new citing papers"}
          </button>
          <button
            type="button"
            className="button quiet"
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
            className="button quiet"
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

      <p className="collection-summary tabular">
        {audit.openAccessCount} of {plural(collection.length, "paper")}{" "}
        {audit.openAccessCount === 1 ? "is" : "are"} open access. They have a
        median of {plural(audit.medianCitations, "citation")} and{" "}
        {audit.totalCitations.toLocaleString()} in total, across{" "}
        {plural(audit.years.length, "publication year")}.{" "}
        <span id="review-updates">{checkedText(lastCheckedAt)}</span>
      </p>

      {updates.length > 0 ? (
        <section className="updates-section" aria-label="New citing papers">
          <h2>New citing papers</h2>
          <ul className="plain-paper-list">
            {updates.slice(0, 6).map((paper) => (
              <li key={paper.id}>
                <button type="button" onClick={() => onExplore(paper)}>
                  {paper.title}
                </button>
                <span className="meta-row tabular">
                  <span>{paper.year ?? "Year unknown"}</span>
                  <span>{plural(paper.citationCount, "citation")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mapOpen ? (
        <section className="saved-map-section" id="review-map" aria-label="Paper map">
          <div className="saved-map-heading">
            <h2>Paper map</h2>
            <p>
              Arrows are direct citations, dashed lines shared citations,
              dotted lines shared topics
            </p>
          </div>
          <fieldset className="saved-map-selector">
            <legend>Papers on the map, up to 25</legend>
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
                  <span>{entry.paper.title}</span>
                </label>
              );
            })}
          </fieldset>
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
            {folders.length > 0 || tags.length > 0 ? (
              <div className="collection-filters" aria-label="Filters">
                {folders.length > 0 ? (
                  <select
                    className="bare-select"
                    value={folderFilter}
                    onChange={(event) => setFolderFilter(event.target.value)}
                    aria-label="Filter by folder"
                  >
                    <option value="">All folders</option>
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                ) : null}
                {tags.length > 0 ? (
                  <select
                    className="bare-select"
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                    aria-label="Filter by tag"
                  >
                    <option value="">All tags</option>
                    {tags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : null}
          </div>
          <datalist id="pathway-folder-options">
            {folders.map((folder) => (
              <option key={folder} value={folder} />
            ))}
          </datalist>
          <div className="collection-list">
            {visibleCollection.map((entry) => (
              <CollectionRow
                key={entry.paper.id}
                entry={entry}
                onExplore={onExplore}
                onRemove={onRemove}
                onStatusChange={onStatusChange}
                onNoteChange={onNoteChange}
                onFolderChange={onFolderChange}
                onTagsChange={onTagsChange}
              />
            ))}
            {visibleCollection.length === 0 ? (
              <p className="muted-text">No saved papers match these filters</p>
            ) : null}
          </div>
        </section>

        <div className="audit-column">
          <section className="audit-section" id="review-coverage">
            <h2>Coverage</h2>
            <h3>Publication years</h3>
            <p className="audit-text tabular">
              {audit.years
                .map((item) => `${item.label} (${item.count})`)
                .join(", ")}
            </p>
            <h3>Topics</h3>
            {audit.topics.length ? (
              <ul className="count-list">
                {audit.topics.slice(0, 8).map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <span className="tabular">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">OpenAlex has no topics for these papers</p>
            )}
          </section>

          <section className="audit-section" id="review-bridges">
            <h2>Bridge papers</h2>
            <p className="audit-text">
              Papers that connect two or more of yours
            </p>
            <BridgePaperList
              papers={audit.bridgePapers.slice(0, 8)}
              onExplore={onExplore}
            />
          </section>

          <section className="audit-section" id="review-overlap">
            <h2>Reference overlap</h2>
            <h3>
              References your papers share{" "}
              <span className="tabular">({audit.sharedReferences.length})</span>
            </h3>
            <AuditPaperList
              papers={audit.sharedReferences.slice(0, 6)}
              empty="None yet"
              onExplore={onExplore}
            />
            <h3>Often cited, not saved</h3>
            <AuditPaperList
              papers={audit.missingFrequentPapers.slice(0, 6)}
              empty="Nothing so far"
              onExplore={onExplore}
            />
          </section>

          <section className="audit-section" id="review-compare">
            <h2>Compare two papers</h2>
            <div className="compare-selects">
              <select
                value={firstId}
                onChange={(event) => setFirstId(event.target.value)}
                aria-label="First paper"
              >
                {collection.map((entry) => (
                  <option
                    key={entry.paper.id}
                    value={entry.paper.id}
                    disabled={entry.paper.id === secondId}
                  >
                    {compactTitle(entry.paper.title, 60)}
                  </option>
                ))}
              </select>
              <select
                value={secondId}
                onChange={(event) => setSecondId(event.target.value)}
                aria-label="Second paper"
                disabled={collection.length < 2}
              >
                {collection
                  .filter((entry) => entry.paper.id !== firstId)
                  .map((entry) => (
                    <option key={entry.paper.id} value={entry.paper.id}>
                      {compactTitle(entry.paper.title, 60)}
                    </option>
                  ))}
              </select>
            </div>
            {comparison ? (
              <>
                <p className="audit-text tabular">
                  They share {plural(comparison.sharedReferences.length, "reference")}.
                  The first cites {comparison.firstOnlyReferences.length} the
                  second does not, and the second cites{" "}
                  {comparison.secondOnlyReferences.length} the first does not.{" "}
                  {comparison.commonCitingPapers.length === 0
                    ? "No paper cites both."
                    : `${plural(comparison.commonCitingPapers.length, "paper")} ${
                        comparison.commonCitingPapers.length === 1 ? "cites" : "cite"
                      } both.`}
                </p>
                {comparison.directRelationships.length ? (
                  <ul className="audit-text plain-list">
                    {comparison.directRelationships.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">Neither paper cites the other</p>
                )}
              </>
            ) : (
              <p className="muted-text">Save at least two papers to compare them</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
