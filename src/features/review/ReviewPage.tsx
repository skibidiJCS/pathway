import { CLOUD_COLLECTION_LIMIT } from "../../../lib/collection";
import type {
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";
import type { Theme } from "../../app/app-types";
import { firebaseConfigured } from "../../services/firebase-config";
import { ReviewAudit } from "./ReviewAudit";

interface ReviewPageProps {
  collection: SavedPaper[];
  limit: number;
  signedIn: boolean;
  mergeCandidate: SavedPaper[] | null;
  theme: Theme;
  updates: Paper[];
  checkingUpdates: boolean;
  lastCheckedAt: string | null;
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
  mergeCandidate,
  theme,
  updates,
  checkingUpdates,
  lastCheckedAt,
  onSignIn,
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
      {!firebaseConfigured ? (
        <div className="review-sync-note">
          Local saving is active. Add the Firebase project values to enable
          Google sign-in and cross-device sync.
        </div>
      ) : !signedIn ? (
        <div className="review-sync-note">
          Stored on this device only.{" "}
          <button type="button" onClick={onSignIn}>
            Sign in with Google
          </button>{" "}
          to save up to {CLOUD_COLLECTION_LIMIT} papers across devices.
        </div>
      ) : null}
      {mergeCandidate ? (
        <div className="merge-notice">
          <span>
            Add your {mergeCandidate.length} local paper
            {mergeCandidate.length === 1 ? "" : "s"} to this synced collection?
          </span>
          <div>
            <button type="button" onClick={onMerge}>
              Merge
            </button>
            <button type="button" onClick={onDismissMerge}>
              Keep separate
            </button>
          </div>
        </div>
      ) : null}
      <ReviewAudit
        collection={collection}
        limit={limit}
        synced={signedIn}
        theme={theme}
        updates={updates}
        checkingUpdates={checkingUpdates}
        lastCheckedAt={lastCheckedAt}
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
