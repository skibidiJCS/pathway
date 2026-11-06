import type { Paper, SavedPaper } from "./research-types";

export interface Suggestion {
  paper: Paper;
  /** How many saved papers cite it or are cited by it. */
  links: number;
}

/**
 * Papers the reading list keeps pointing to: cited by, or citing, at least two
 * saved papers, and not already saved or skipped.
 */
export function suggestPapers(
  collection: SavedPaper[],
  skipped: Set<string>,
  limit = 30,
): Suggestion[] {
  const savedIds = new Set(collection.map((entry) => entry.paper.id));
  const candidates = new Map<string, { paper: Paper; linkedFrom: Set<string> }>();

  for (const entry of collection) {
    for (const paper of [...entry.references, ...entry.citingPapers]) {
      if (savedIds.has(paper.id) || skipped.has(paper.id)) continue;
      const candidate = candidates.get(paper.id) ?? {
        paper,
        linkedFrom: new Set<string>(),
      };
      candidate.linkedFrom.add(entry.paper.id);
      candidates.set(paper.id, candidate);
    }
  }

  return [...candidates.values()]
    .map(({ paper, linkedFrom }) => ({ paper, links: linkedFrom.size }))
    .filter((suggestion) => suggestion.links >= 2)
    .sort(
      (a, b) =>
        b.links - a.links || b.paper.citationCount - a.paper.citationCount,
    )
    .slice(0, limit);
}
