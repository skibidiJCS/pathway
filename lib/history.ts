import { sanitizePaper } from "./collection.ts";
import type { Paper } from "./research-types";

export const EXPLORATION_HISTORY_LIMIT = 8;
const HISTORY_KEY = "pathway:exploration-history:v1";

export function updateExplorationHistory(
  history: Paper[],
  paper: Paper,
): Paper[] {
  const cleaned = sanitizePaper(paper);
  if (!cleaned) return history;
  return [
    cleaned,
    ...history.filter((item) => item.id !== cleaned.id),
  ].slice(0, EXPLORATION_HISTORY_LIMIT);
}

export function loadExplorationHistory(): Paper[] {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .map(sanitizePaper)
      .filter((paper): paper is Paper => Boolean(paper))
      .slice(0, EXPLORATION_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function storeExplorationHistory(history: Paper[]): void {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(0, EXPLORATION_HISTORY_LIMIT)),
    );
  } catch {
    // Session history still works if browser storage is unavailable.
  }
}
