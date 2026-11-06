import { Compass, Download } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CLOUD_COLLECTION_LIMIT,
  collectionToBibtex,
  collectionToCsv,
} from "../../../lib/collection";
import type {
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";
import { firebaseConfigured } from "../../services/firebase-config";
import { CollectionRow } from "./CollectionRow";
import { EmptyState, PageHeader } from "./PageHeader";
import { downloadFile } from "./review-utils";

const statusTabs: Array<{ value: ReviewStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "reviewed", label: "Reviewed" },
  { value: "used", label: "Used" },
];

export function SyncPrompt({ signInButton }: { signInButton: ReactNode }) {
  if (!firebaseConfigured || !signInButton) return null;
  return (
    <div className="sync-prompt">
      <div className="sync-prompt-text">
        <strong>Only saved on this device</strong>
        <span>
          Sign in to keep up to {CLOUD_COLLECTION_LIMIT} papers in sync across
          your devices
        </span>
      </div>
      {signInButton}
    </div>
  );
}

export function LibraryPage({
  collection,
  limit,
  signInButton,
  mergeCandidate,
  folderFilter,
  onFolderFilterChange,
  onMerge,
  onDismissMerge,
  onStartExploring,
  onExplore,
  onRemove,
  onStatusChange,
  onNoteChange,
  onFolderChange,
  onTagsChange,
}: {
  collection: SavedPaper[];
  limit: number;
  signInButton: ReactNode;
  mergeCandidate: SavedPaper[] | null;
  folderFilter: string;
  onFolderFilterChange: (folder: string) => void;
  onMerge: () => void;
  onDismissMerge: () => void;
  onStartExploring: () => void;
  onExplore: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onStatusChange: (paperId: string, status: ReviewStatus) => void;
  onNoteChange: (paperId: string, note: string) => void;
  onFolderChange: (paperId: string, folder: string | null) => void;
  onTagsChange: (paperId: string, tags: string[]) => void;
}) {
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [tagFilter, setTagFilter] = useState("");
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
  const counts = useMemo(() => {
    const result: Record<string, number> = { "": collection.length };
    for (const entry of collection) {
      result[entry.status] = (result[entry.status] ?? 0) + 1;
    }
    return result;
  }, [collection]);
  const visible = collection.filter(
    (entry) =>
      (!status || entry.status === status) &&
      (!folderFilter || entry.folder === folderFilter) &&
      (!tagFilter || entry.tags.includes(tagFilter)),
  );

  useEffect(() => {
    if (folderFilter && !folders.includes(folderFilter)) onFolderFilterChange("");
    if (tagFilter && !tags.includes(tagFilter)) setTagFilter("");
  }, [folderFilter, folders, onFolderFilterChange, tagFilter, tags]);

  return (
    <div className="page">
      <SyncPrompt signInButton={signInButton} />
      {mergeCandidate ? (
        <div className="sync-prompt">
          <div className="sync-prompt-text">
            <strong>
              Add your {mergeCandidate.length} local paper
              {mergeCandidate.length === 1 ? "" : "s"} to your synced list?
            </strong>
          </div>
          <div className="sync-prompt-actions">
            <button type="button" className="button primary" onClick={onMerge}>
              Merge
            </button>
            <button type="button" className="button quiet" onClick={onDismissMerge}>
              Keep separate
            </button>
          </div>
        </div>
      ) : null}

      <div className="page-body">
        <PageHeader
          title={folderFilter || "Reading list"}
          count={
            folderFilter ? undefined : `${collection.length} of ${limit}`
          }
          description={
            folderFilter
              ? "Papers you filed in this folder"
              : "Papers you saved while exploring. Mark what you have read and what you used"
          }
          actions={
            collection.length > 0 ? (
              <>
                <button
                  type="button"
                  className="button quiet"
                  onClick={() =>
                    downloadFile(
                      "pathway-reading-list.csv",
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
                      "pathway-reading-list.bib",
                      collectionToBibtex(collection),
                      "application/x-bibtex;charset=utf-8",
                    )
                  }
                >
                  <Download size={16} strokeWidth={1.5} aria-hidden />
                  BibTeX
                </button>
              </>
            ) : null
          }
        />

        {collection.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            action={
              <button type="button" className="button primary" onClick={onStartExploring}>
                <Compass size={16} strokeWidth={1.5} aria-hidden />
                Explore papers
              </button>
            }
          >
            Open a paper and press Save. Your list then unlocks Find gaps, Map
            and Compare
          </EmptyState>
        ) : (
          <>
            <div className="list-toolbar">
              <div className="text-tabs" role="tablist" aria-label="Reading status">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={status === tab.value}
                    onClick={() => setStatus(tab.value)}
                  >
                    {tab.label}
                    <span className="tabular">{counts[tab.value] ?? 0}</span>
                  </button>
                ))}
              </div>
              {folders.length > 0 || tags.length > 0 ? (
                <div className="collection-filters">
                  {folders.length > 0 ? (
                    <select
                      className="bare-select"
                      value={folderFilter}
                      onChange={(event) => onFolderFilterChange(event.target.value)}
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
              {visible.map((entry, index) => (
                <CollectionRow
                  index={index}
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
              {visible.length === 0 ? (
                <p className="muted-text">No papers here yet</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
