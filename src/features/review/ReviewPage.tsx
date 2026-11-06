import type { ReactNode } from "react";
import { CLOUD_COLLECTION_LIMIT } from "../../../lib/collection";
import type {
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";
import type { ReviewFocus, Theme } from "../../app/app-types";
import { firebaseConfigured } from "../../services/firebase-config";
import { ReviewAudit } from "./ReviewAudit";

interface ReviewPageProps {
  collection: SavedPaper[];
  limit: number;
  signedIn: boolean;
  signInButton: ReactNode;
  mergeCandidate: SavedPaper[] | null;
  theme: Theme;
  updates: Paper[];
  checkingUpdates: boolean;
  lastCheckedAt: string | null;
  focus: ReviewFocus | null;
  folderFilter: string;
  onFolderFilterChange: (folder: string) => void;
  onSignIn: () => void;
  onMerge: () => void;
  onDismissMerge: () => void;
  onExplore: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onStatusChange: (paperId: string, status: ReviewStatus) => void;
  onNoteChange: (paperId: string, note: string) => void;
  onFolderChange: (paperId: string, folder: string | null) => void;
  onTagsChange: (paperId: string, tags: string[]) => void;
  onCheckUpdates: () => void;
}

export function ReviewPage({
  collection,
  limit,
  signedIn,
  signInButton,
  mergeCandidate,
  theme,
  updates,
  checkingUpdates,
  lastCheckedAt,
  focus,
  folderFilter,
  onFolderFilterChange,
  onMerge,
  onDismissMerge,
  onExplore,
  onRemove,
  onStatusChange,
  onNoteChange,
  onFolderChange,
  onTagsChange,
  onCheckUpdates,
}: ReviewPageProps) {
  return (
    <section className="review-page">
      {!signedIn && firebaseConfigured ? (
        <div className="sync-prompt">
          <div className="sync-prompt-text">
            <strong>Only saved on this device</strong>
            <span>
              Sign in to keep up to {CLOUD_COLLECTION_LIMIT} papers in sync
              across your devices
            </span>
          </div>
          {signInButton}
        </div>
      ) : null}
      {mergeCandidate ? (
        <div className="sync-prompt">
          <div className="sync-prompt-text">
            <strong>
              Add your {mergeCandidate.length} local paper
              {mergeCandidate.length === 1 ? "" : "s"} to your synced
              collection?
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
      <ReviewAudit
        collection={collection}
        limit={limit}
        theme={theme}
        updates={updates}
        checkingUpdates={checkingUpdates}
        lastCheckedAt={lastCheckedAt}
        focus={focus}
        folderFilter={folderFilter}
        onFolderFilterChange={onFolderFilterChange}
        onExplore={onExplore}
        onRemove={onRemove}
        onStatusChange={onStatusChange}
        onNoteChange={onNoteChange}
        onFolderChange={onFolderChange}
        onTagsChange={onTagsChange}
        onCheckUpdates={onCheckUpdates}
      />
    </section>
  );
}
