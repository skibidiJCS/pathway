export type LoadState = "idle" | "loading" | "ready" | "error";
export type SyncState = "idle" | "loading" | "syncing" | "ready" | "error";
export type Theme = "light" | "dark";
export type View = "explore" | "review";
export type ReviewSection =
  | "collection"
  | "updates"
  | "map"
  | "coverage"
  | "bridges"
  | "overlap"
  | "compare";
export interface ReviewFocus {
  section: ReviewSection;
  /** Increments on every request so the same section can be focused twice. */
  request: number;
}
