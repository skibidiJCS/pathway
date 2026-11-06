import { useEffect, useState, type KeyboardEvent } from "react";
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
  onExplore: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onStatusChange: (paperId: string, status: ReviewStatus) => void;
  onNoteChange: (paperId: string, note: string) => void;
  onFolderChange: (paperId: string, folder: string | null) => void;
  onTagsChange: (paperId: string, tags: string[]) => void;
}

type Editing = "folder" | "tags" | "note" | null;

export function CollectionRow({
  entry,
  onExplore,
  onRemove,
  onStatusChange,
  onNoteChange,
  onFolderChange,
  onTagsChange,
}: CollectionRowProps) {
  const [editing, setEditing] = useState<Editing>(null);
  const [folderDraft, setFolderDraft] = useState(entry.folder ?? "");
  const [tagsDraft, setTagsDraft] = useState(entry.tags.join(", "));
  const { paper } = entry;

  useEffect(() => setFolderDraft(entry.folder ?? ""), [entry.folder]);
  useEffect(() => setTagsDraft(entry.tags.join(", ")), [entry.tags]);

  const finish = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" && event.currentTarget.tagName === "INPUT") {
      event.currentTarget.blur();
    }
    if (event.key === "Escape") event.currentTarget.blur();
  };

  return (
    <article className="collection-row">
      <div className="collection-row-head">
        <button
          type="button"
          className="collection-title"
          onClick={() => onExplore(paper)}
        >
          {paper.title}
        </button>
        <select
          className="bare-select"
          value={entry.status}
          onChange={(event) =>
            onStatusChange(paper.id, event.target.value as ReviewStatus)
          }
          aria-label={`Reading status for ${paper.title}`}
        >
          <option value="unread">Unread</option>
          <option value="reviewed">Reviewed</option>
          <option value="used">Used</option>
        </select>
      </div>
      <span className="meta-row tabular">
        <span>{paper.year ?? "Year unknown"}</span>
        <span>{paper.citationCount.toLocaleString()} citations</span>
        <span>{paper.isOpenAccess ? "Open access" : "Closed access"}</span>
      </span>

      {editing === "note" ? (
        <textarea
          className="row-note-input"
          value={entry.note}
          onChange={(event) => onNoteChange(paper.id, event.target.value)}
          onBlur={() => setEditing(null)}
          onKeyDown={finish}
          aria-label={`Private note for ${paper.title}`}
          placeholder="What this paper is for"
          maxLength={2000}
          rows={3}
          autoFocus
        />
      ) : entry.note ? (
        <button
          type="button"
          className="row-note"
          onClick={() => setEditing("note")}
          title="Edit note"
        >
          {entry.note}
        </button>
      ) : null}

      <div className="row-fields">
        {editing === "folder" ? (
          <input
            type="text"
            value={folderDraft}
            list="pathway-folder-options"
            onChange={(event) => setFolderDraft(event.target.value)}
            onBlur={() => {
              onFolderChange(paper.id, sanitizeFolder(folderDraft));
              setEditing(null);
            }}
            onKeyDown={finish}
            placeholder="Folder"
            maxLength={48}
            aria-label={`Folder for ${paper.title}`}
            autoFocus
          />
        ) : (
          <button type="button" className="row-field" onClick={() => setEditing("folder")}>
            {entry.folder ? `Folder: ${entry.folder}` : "Add folder"}
          </button>
        )}
        {editing === "tags" ? (
          <input
            type="text"
            value={tagsDraft}
            onChange={(event) => setTagsDraft(event.target.value)}
            onBlur={() => {
              onTagsChange(paper.id, sanitizeTags(tagsDraft.split(",")));
              setEditing(null);
            }}
            onKeyDown={finish}
            placeholder="Tags, separated by commas"
            maxLength={271}
            aria-label={`Tags for ${paper.title}`}
            autoFocus
          />
        ) : (
          <button type="button" className="row-field" onClick={() => setEditing("tags")}>
            {entry.tags.length ? `Tags: ${entry.tags.join(", ")}` : "Add tags"}
          </button>
        )}
        {!entry.note && editing !== "note" ? (
          <button type="button" className="row-field" onClick={() => setEditing("note")}>
            Add note
          </button>
        ) : null}
        <button
          type="button"
          className="row-field remove"
          onClick={() => onRemove(paper.id)}
        >
          Remove
        </button>
      </div>
    </article>
  );
}
