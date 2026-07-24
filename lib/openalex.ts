import type {
  CitationEdge,
  CitationGraphData,
  Paper,
  PaperRelation,
} from "./research-types";

export interface OpenAlexWork {
  id?: string | null;
  doi?: string | null;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  cited_by_count?: number | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  authorships?: Array<{
    author?: { display_name?: string | null } | null;
  }> | null;
  primary_location?: {
    landing_page_url?: string | null;
    source?: { display_name?: string | null } | null;
  } | null;
  best_oa_location?: {
    landing_page_url?: string | null;
  } | null;
  open_access?: {
    is_oa?: boolean | null;
    oa_status?: string | null;
    oa_url?: string | null;
  } | null;
}

const OPENALEX_PREFIX = "https://openalex.org/";
const RELATION_LIMIT = 14;
const DEFAULT_GRAPH_LIMIT = 29;
const GRAPH_HARD_LIMIT = 30;

export function normalizeOpenAlexId(value: string): string {
  const match = value.trim().match(/(?:https?:\/\/openalex\.org\/)?(W\d+)$/i);
  return match ? match[1].toUpperCase() : "";
}

export function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined,
): string | null {
  if (!invertedIndex) return null;

  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions ?? []) {
      if (Number.isInteger(position) && position >= 0) words.push([position, word]);
    }
  }

  if (words.length === 0) return null;
  return words
    .sort((a, b) => a[0] - b[0])
    .map(([, word]) => word)
    .join(" ");
}

function normalizeDoi(value: string | null | undefined): string | null {
  if (!value) return null;
  const doi = value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").trim();
  return doi ? `https://doi.org/${doi}` : null;
}

export function toPaper(
  work: OpenAlexWork,
  relation: PaperRelation = "reference",
): Paper {
  const id = normalizeOpenAlexId(work.id ?? "");
  const doi = normalizeDoi(work.doi);
  const sourceUrl =
    doi ??
    work.open_access?.oa_url ??
    work.best_oa_location?.landing_page_url ??
    work.primary_location?.landing_page_url ??
    (id ? `${OPENALEX_PREFIX}${id}` : "https://openalex.org");

  return {
    id,
    title: work.display_name?.trim() || work.title?.trim() || "Untitled work",
    authors:
      work.authorships
        ?.map((authorship) => authorship.author?.display_name?.trim())
        .filter((name): name is string => Boolean(name)) ?? [],
    year:
      typeof work.publication_year === "number" ? work.publication_year : null,
    source: work.primary_location?.source?.display_name?.trim() || null,
    citationCount: Math.max(0, work.cited_by_count ?? 0),
    abstract: reconstructAbstract(work.abstract_inverted_index),
    isOpenAccess: Boolean(work.open_access?.is_oa),
    openAccessStatus: work.open_access?.oa_status?.trim() || null,
    doi,
    url: sourceUrl,
    relation,
  };
}

function combineRelation(
  current: PaperRelation,
  incoming: PaperRelation,
): PaperRelation {
  if (current === incoming) return current;
  if (current === "selected" || incoming === "selected") return "selected";
  return "both";
}

export function deduplicatePapers(papers: Paper[]): Paper[] {
  const seen = new Map<string, Paper>();

  for (const paper of papers) {
    if (!paper.id) continue;
    const existing = seen.get(paper.id);
    if (!existing) {
      seen.set(paper.id, { ...paper });
      continue;
    }
    existing.relation = combineRelation(existing.relation, paper.relation);
  }

  return [...seen.values()];
}

function edgeId(source: string, target: string): string {
  return `${source}->${target}`;
}

export function buildCitationGraph(
  selected: Paper,
  references: Paper[],
  citingPapers: Paper[],
  maxNodes = DEFAULT_GRAPH_LIMIT,
): CitationGraphData {
  const hardLimit = Math.min(GRAPH_HARD_LIMIT, Math.max(1, maxNodes));
  const root = { ...selected, relation: "selected" as const };
  const candidates = [
    root,
    ...references.slice(0, RELATION_LIMIT).map((paper) => ({
      ...paper,
      relation: "reference" as const,
    })),
    ...citingPapers.slice(0, RELATION_LIMIT).map((paper) => ({
      ...paper,
      relation: "citing" as const,
    })),
  ];
  const nodes = deduplicatePapers(candidates).slice(0, hardLimit);
  const nodeIds = new Set(nodes.map((paper) => paper.id));
  const edges: CitationEdge[] = [];
  const seenEdges = new Set<string>();

  const addEdge = (source: string, target: string) => {
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return;
    const id = edgeId(source, target);
    if (seenEdges.has(id)) return;
    seenEdges.add(id);
    edges.push({ id, source, target });
  };

  for (const paper of references.slice(0, RELATION_LIMIT)) {
    addEdge(root.id, paper.id);
  }
  for (const paper of citingPapers.slice(0, RELATION_LIMIT)) {
    addEdge(paper.id, root.id);
  }

  return { centerId: root.id, nodes, edges };
}
