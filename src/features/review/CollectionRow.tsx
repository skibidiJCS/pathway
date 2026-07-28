import { useEffect, useState } from "react";
import {
  sanitizeFolder,
  sanitizeTags,
} from "../../../lib/collection";
import type {
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";

interface CollectionRowProps {
  entry: SavedPaper;
  index: number;
  onExplore: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onStatusChange: (paperId: string, status: ReviewStatus) => void;
  onNoteChange: (paperId: string, note: string) => void;
  onFolderChange: (paperId: string, folder: string | null) => void;
  onTagsChange: (paperId: string, tags: string[]) => void;
}

export function CollectionRow({
  entry,
  index,
  onExplore,
  onRemove,
  onStatusChange,
  onNoteChange,
  onFolderChange,
  onTagsChange,
}: CollectionRowProps) {
  const [folderDraft, setFolderDraft] = useState(entry.folder ?? "");
  const [tagsDraft, setTagsDraft] = useState(entry.tags.join(", "));

  useEffect(() => setFolderDraft(entry.folder ?? ""), [entry.folder]);
  useEffect(() => setTagsDraft(entry.tags.join(", ")), [entry.tags]);

  return (
    <article className="collection-row">
      <span className="collection-index">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="collection-main">
        <button
          type="button"
          className="collection-title"
          onClick={() => onExplore(entry.paper)}
        >
          {entry.paper.title}
        </button>
        <span className="collection-meta">
          {entry.paper.year ?? "Year unknown"} ·{" "}
          {entry.paper.citationCount.toLocaleString()} citations ·{" "}
          {entry.paper.isOpenAccess ? "Open access" : "Closed"}
        </span>
        <div className="collection-organize">
          <label>
            <span>Folder</span>
            <input
              type="text"
              value={folderDraft}
              list="pathway-folder-options"
              onChange={(event) => setFolderDraft(event.target.value)}
              onBlur={() =>
                onFolderChange(entry.paper.id, sanitizeFolder(folderDraft))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              placeholder="Add folder"
              maxLength={48}
              aria-label={`Folder for ${entry.paper.title}`}
            />
          </label>
          <label>
            <span>Tags</span>
            <input
              type="text"
              value={tagsDraft}
              onChange={(event) => setTagsDraft(event.target.value)}
              onBlur={() =>
                onTagsChange(
                  entry.paper.id,
                  sanitizeTags(tagsDraft.split(",")),
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              placeholder="policy, methods"
              maxLength={271}
              aria-label={`Tags for ${entry.paper.title}`}
            />
          </label>
        </div>
        <textarea
          value={entry.note}
          onChange={(event) =>
            onNoteChange(entry.paper.id, event.target.value)
          }
          aria-label={`Private note for ${entry.paper.title}`}
          placeholder="Private note…"
          maxLength={2000}
          rows={1}
        />
      </div>
      <div className="collection-actions">
        <select
          value={entry.status}
          onChange={(event) =>
            onStatusChange(
              entry.paper.id,
              event.target.value as ReviewStatus,
            )
          }
          aria-label={`Review status for ${entry.paper.title}`}
        >
          <option value="unread">Unread</option>
          <option value="reviewed">Reviewed</option>
          <option value="used">Used</option>
        </select>
        <button type="button" onClick={() => onRemove(entry.paper.id)}>
          Remove
        </button>
      </div>
    </article>
  );
}
