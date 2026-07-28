import type { Paper, SavedPaper } from "../research-types";

export interface CountedLabel {
  label: string;
  count: number;
}

export interface CountedPaper {
  paper: Paper;
  count: number;
}

export interface AuditSummary {
  years: CountedLabel[];
  topics: CountedLabel[];
  totalCitations: number;
  medianCitations: number;
  openAccessCount: number;
  sharedReferences: CountedPaper[];
  missingFrequentPapers: CountedPaper[];
  bridgePapers: BridgePaper[];
}

export interface BridgePaper extends CountedPaper {
  savedPaperIds: string[];
  referencedByCount: number;
  citesSavedCount: number;
}

function sortedCounts(values: string[]): CountedLabel[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function calculateAudit(collection: SavedPaper[]): AuditSummary {
  const savedIds = new Set(collection.map((entry) => entry.paper.id));
  const usage = new Map<string, { paper: Paper; roots: Set<string> }>();
  const bridgeUsage = new Map<
    string,
    {
      paper: Paper;
      roots: Set<string>;
      referencedBy: Set<string>;
      citesSaved: Set<string>;
    }
  >();
  for (const entry of collection) {
    const perPaper = new Map(entry.references.map((paper) => [paper.id, paper]));
    for (const paper of perPaper.values()) {
      const current = usage.get(paper.id) ?? {
        paper,
        roots: new Set<string>(),
      };
      current.roots.add(entry.paper.id);
      usage.set(paper.id, current);

      const bridge = bridgeUsage.get(paper.id) ?? {
        paper,
        roots: new Set<string>(),
        referencedBy: new Set<string>(),
        citesSaved: new Set<string>(),
      };
      bridge.roots.add(entry.paper.id);
      bridge.referencedBy.add(entry.paper.id);
      bridgeUsage.set(paper.id, bridge);
    }
    const perCitingPaper = new Map(
      entry.citingPapers.map((paper) => [paper.id, paper]),
    );
    for (const paper of perCitingPaper.values()) {
      const bridge = bridgeUsage.get(paper.id) ?? {
        paper,
        roots: new Set<string>(),
        referencedBy: new Set<string>(),
        citesSaved: new Set<string>(),
      };
      bridge.roots.add(entry.paper.id);
      bridge.citesSaved.add(entry.paper.id);
      bridgeUsage.set(paper.id, bridge);
    }
  }
  const sharedReferences = [...usage.values()]
    .filter((item) => item.roots.size >= 2)
    .map((item) => ({ paper: item.paper, count: item.roots.size }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.paper.citationCount - a.paper.citationCount ||
        a.paper.title.localeCompare(b.paper.title),
    );
  const citations = collection
    .map((entry) => entry.paper.citationCount)
    .sort((a, b) => a - b);
  const middle = Math.floor(citations.length / 2);
  const bridgePapers = [...bridgeUsage.values()]
    .filter((item) => !savedIds.has(item.paper.id) && item.roots.size >= 2)
    .map(
      (item): BridgePaper => ({
        paper: item.paper,
        count: item.roots.size,
        savedPaperIds: [...item.roots],
        referencedByCount: item.referencedBy.size,
        citesSavedCount: item.citesSaved.size,
      }),
    )
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.referencedByCount - a.referencedByCount ||
        b.paper.citationCount - a.paper.citationCount ||
        a.paper.title.localeCompare(b.paper.title),
    );

  return {
    years: sortedCounts(
      collection.map((entry) => String(entry.paper.year ?? "Unknown")),
    ),
    topics: sortedCounts(
      collection.flatMap((entry) => entry.paper.topics ?? []),
    ),
    totalCitations: citations.reduce((sum, count) => sum + count, 0),
    medianCitations:
      citations.length === 0
        ? 0
        : citations.length % 2
          ? citations[middle]
          : Math.round((citations[middle - 1] + citations[middle]) / 2),
    openAccessCount: collection.filter((entry) => entry.paper.isOpenAccess)
      .length,
    sharedReferences,
    missingFrequentPapers: sharedReferences.filter(
      (item) => !savedIds.has(item.paper.id),
    ),
    bridgePapers,
  };
}
