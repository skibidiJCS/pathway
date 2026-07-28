import type { CitationGraphData, Paper, SavedPaper } from "../research-types";
import { CLOUD_COLLECTION_LIMIT } from "./limits.ts";

function withoutAbstract(paper: Paper, relation: Paper["relation"]): Paper {
  return { ...paper, abstract: null, relation };
}

export function createSavedPaper(
  paper: Paper,
  graph: CitationGraphData | null,
): SavedPaper {
  const references =
    graph?.nodes
      .filter(
        (node) => node.relation === "reference" || node.relation === "both",
      )
      .map((node) => withoutAbstract(node, "reference")) ?? [];
  const citingPapers =
    graph?.nodes
      .filter((node) => node.relation === "citing" || node.relation === "both")
      .map((node) => withoutAbstract(node, "citing")) ?? [];
  const center =
    graph?.nodes.find((node) => node.id === graph.centerId) ?? paper;

  return {
    paper: withoutAbstract(center, "selected"),
    status: "unread",
    note: "",
    folder: null,
    tags: [],
    references,
    citingPapers,
    savedAt: new Date().toISOString(),
  };
}

export function mergeCollections(
  cloud: SavedPaper[],
  local: SavedPaper[],
  limit = CLOUD_COLLECTION_LIMIT,
): SavedPaper[] {
  const merged = new Map<string, SavedPaper>();
  for (const entry of cloud) merged.set(entry.paper.id, entry);
  for (const entry of local) {
    const existing = merged.get(entry.paper.id);
    if (!existing) {
      merged.set(entry.paper.id, entry);
      continue;
    }
    merged.set(entry.paper.id, {
      ...existing,
      paper:
        existing.paper.title === "Untitled work" ? entry.paper : existing.paper,
      references:
        existing.references.length > 0
          ? existing.references
          : entry.references,
      citingPapers:
        existing.citingPapers.length > 0
          ? existing.citingPapers
          : entry.citingPapers,
      folder: existing.folder ?? entry.folder,
      tags: existing.tags.length > 0 ? existing.tags : entry.tags,
    });
  }
  return [...merged.values()].slice(0, limit);
}
