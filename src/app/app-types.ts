export type LoadState = "idle" | "loading" | "ready" | "error";
export type SyncState = "idle" | "loading" | "syncing" | "ready" | "error";
export type Theme = "light" | "dark";
export type View =
  | "explore"
  | "library"
  | "map"
  | "compare"
  | "gaps"
  | "updates";
export type LibraryView = Exclude<View, "explore">;
