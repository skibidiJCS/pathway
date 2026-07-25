import type {
  CitationGraphData,
  CollectionSettings,
  Paper,
  ReviewStatus,
  SavedPaper,
} from "./research-types";
import { cleanAbstractText, cleanMetadataText } from "./openalex.ts";

export const LOCAL_COLLECTION_LIMIT = 10;
export const CLOUD_COLLECTION_LIMIT = 250;
export const NOTE_LIMIT = 2000;

const GUEST_KEY = "pathway:collection:guest:v1";
const SETTINGS_KEY = "pathway:collection:settings:v1";

function accountKey(uid: string): string {
  return `pathway:collection:account:${uid}:v1`;
}

function accountSettingsKey(uid: string): string {
  return `pathway:collection:account:${uid}:settings:v1`;
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return (
    value === "unread" ||
    value === "reviewed" ||
    value === "used"
  );
}

function sanitizePaper(value: unknown): Paper | null {
  if (!value || typeof value !== "object") return null;
  const paper = value as Partial<Paper>;
  if (!paper.id || typeof paper.id !== "string") return null;
  return {
    id: paper.id,
    title:
      typeof paper.title === "string" && paper.title.trim()
        ? cleanMetadataText(paper.title) || "Untitled work"
        : "Untitled work",
    authors: Array.isArray(paper.authors)
      ? paper.authors
          .filter((author): author is string => typeof author === "string")
          .map(cleanMetadataText)
          .filter(Boolean)
      : [],
    year: typeof paper.year === "number" ? paper.year : null,
    source:
      typeof paper.source === "string"
        ? cleanMetadataText(paper.source) || null
        : null,
    topics: Array.isArray(paper.topics)
      ? paper.topics
          .filter((topic): topic is string => typeof topic === "string")
          .map(cleanMetadataText)
          .filter(Boolean)
      : [],
    citationCount:
      typeof paper.citationCount === "number"
        ? Math.max(0, paper.citationCount)
        : 0,
    abstract:
      typeof paper.abstract === "string"
        ? cleanAbstractText(paper.abstract) || null
        : null,
    isOpenAccess: Boolean(paper.isOpenAccess),
    openAccessStatus:
      typeof paper.openAccessStatus === "string"
        ? paper.openAccessStatus
        : null,
    doi: typeof paper.doi === "string" ? paper.doi : null,
    url:
      typeof paper.url === "string"
        ? paper.url
        : `https://openalex.org/${paper.id}`,
    relation:
      paper.relation === "selected" ||
      paper.relation === "reference" ||
      paper.relation === "citing" ||
      paper.relation === "both"
        ? paper.relation
        : "selected",
  };
}

function sanitizeRelatedPapers(value: unknown): Paper[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map(sanitizePaper)
    .filter((paper): paper is Paper => {
      if (!paper || seen.has(paper.id)) return false;
      seen.add(paper.id);
      return true;
    })
    .slice(0, 14);
}

export function sanitizeCollection(
  value: unknown,
  limit = CLOUD_COLLECTION_LIMIT,
): SavedPaper[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry): SavedPaper | null => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Partial<SavedPaper>;
      const paper = sanitizePaper(candidate.paper);
      if (!paper || seen.has(paper.id)) return null;
      seen.add(paper.id);
      return {
        paper,
        status: isReviewStatus(candidate.status)
          ? candidate.status
          : "unread",
        note:
          typeof candidate.note === "string"
            ? candidate.note.slice(0, NOTE_LIMIT)
            : "",
        references: sanitizeRelatedPapers(candidate.references),
        citingPapers: sanitizeRelatedPapers(candidate.citingPapers),
        savedAt:
          typeof candidate.savedAt === "string"
            ? candidate.savedAt
            : new Date().toISOString(),
      };
    })
    .filter((entry): entry is SavedPaper => Boolean(entry))
    .slice(0, limit);
}

function loadStoredCollection(key: string, limit: number): SavedPaper[] {
  try {
    return sanitizeCollection(JSON.parse(localStorage.getItem(key) ?? "[]"), limit);
  } catch {
    return [];
  }
}

function storeCollection(key: string, collection: SavedPaper[], limit: number) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(sanitizeCollection(collection, limit)),
    );
  } catch {
    // The active session continues when browser storage is unavailable.
  }
}

export function loadGuestCollection(): SavedPaper[] {
  return loadStoredCollection(GUEST_KEY, LOCAL_COLLECTION_LIMIT);
}

export function storeGuestCollection(collection: SavedPaper[]): void {
  storeCollection(GUEST_KEY, collection, LOCAL_COLLECTION_LIMIT);
}

export function loadAccountCache(uid: string): SavedPaper[] {
  return loadStoredCollection(accountKey(uid), CLOUD_COLLECTION_LIMIT);
}

export function storeAccountCache(
  uid: string,
  collection: SavedPaper[],
): void {
  storeCollection(accountKey(uid), collection, CLOUD_COLLECTION_LIMIT);
}

function loadSettings(key: string): CollectionSettings {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      lastCheckedAt?: unknown;
    };
    return {
      lastCheckedAt:
        typeof value.lastCheckedAt === "string" ? value.lastCheckedAt : null,
    };
  } catch {
    return { lastCheckedAt: null };
  }
}

function storeSettings(key: string, settings: CollectionSettings) {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    // The active session continues when browser storage is unavailable.
  }
}

export function loadGuestSettings(): CollectionSettings {
  return loadSettings(SETTINGS_KEY);
}

export function storeGuestSettings(settings: CollectionSettings): void {
  storeSettings(SETTINGS_KEY, settings);
}

export function loadAccountSettings(uid: string): CollectionSettings {
  return loadSettings(accountSettingsKey(uid));
}

export function storeAccountSettings(
  uid: string,
  settings: CollectionSettings,
): void {
  storeSettings(accountSettingsKey(uid), settings);
}

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
    });
  }
  return [...merged.values()].slice(0, limit);
}

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
  for (const entry of collection) {
    const perPaper = new Map(entry.references.map((paper) => [paper.id, paper]));
    for (const paper of perPaper.values()) {
      const current = usage.get(paper.id) ?? {
        paper,
        roots: new Set<string>(),
      };
      current.roots.add(entry.paper.id);
      usage.set(paper.id, current);
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
  };
}

export interface PaperComparison {
  sharedReferences: Paper[];
  firstOnlyReferences: Paper[];
  secondOnlyReferences: Paper[];
  commonCitingPapers: Paper[];
  directRelationships: string[];
}

export function compareSavedPapers(
  first: SavedPaper,
  second: SavedPaper,
): PaperComparison {
  const firstReferences = new Map(
    first.references.map((paper) => [paper.id, paper]),
  );
  const secondReferences = new Map(
    second.references.map((paper) => [paper.id, paper]),
  );
  const secondCitingIds = new Set(
    second.citingPapers.map((paper) => paper.id),
  );

  return {
    sharedReferences: [...firstReferences.values()].filter((paper) =>
      secondReferences.has(paper.id),
    ),
    firstOnlyReferences: [...firstReferences.values()].filter(
      (paper) => !secondReferences.has(paper.id),
    ),
    secondOnlyReferences: [...secondReferences.values()].filter(
      (paper) => !firstReferences.has(paper.id),
    ),
    commonCitingPapers: first.citingPapers.filter((paper) =>
      secondCitingIds.has(paper.id),
    ),
    directRelationships: [
      ...(firstReferences.has(second.paper.id)
        ? [`${first.paper.title} cites ${second.paper.title}`]
        : []),
      ...(secondReferences.has(first.paper.id)
        ? [`${second.paper.title} cites ${first.paper.title}`]
        : []),
    ],
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function collectionToCsv(collection: SavedPaper[]): string {
  const rows = [
    [
      "OpenAlex ID",
      "Title",
      "Authors",
      "Year",
      "Source",
      "Citations",
      "Open access",
      "DOI",
      "Status",
      "Notes",
    ],
    ...collection.map((entry) => [
      entry.paper.id,
      entry.paper.title,
      entry.paper.authors.join("; "),
      entry.paper.year ?? "",
      entry.paper.source ?? "",
      entry.paper.citationCount,
      entry.paper.isOpenAccess ? "Yes" : "No",
      entry.paper.doi ?? "",
      entry.status,
      entry.note,
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function bibtexValue(value: string): string {
  return value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("&", "\\&");
}

export function collectionToBibtex(collection: SavedPaper[]): string {
  return collection
    .map((entry, index) => {
      const firstAuthor =
        entry.paper.authors[0]?.split(/\s+/).at(-1) ?? "paper";
      const key = `${firstAuthor.replace(/[^a-z0-9]/gi, "") || "paper"}${entry.paper.year ?? "nd"}${index + 1}`;
      const fields = [
        `  title = {${bibtexValue(entry.paper.title)}}`,
        entry.paper.authors.length
          ? `  author = {${bibtexValue(entry.paper.authors.join(" and "))}}`
          : null,
        entry.paper.year ? `  year = {${entry.paper.year}}` : null,
        entry.paper.source
          ? `  journal = {${bibtexValue(entry.paper.source)}}`
          : null,
        entry.paper.doi
          ? `  doi = {${entry.paper.doi.replace(/^https?:\/\/doi\.org\//i, "")}}`
          : null,
        `  url = {${entry.paper.doi ?? entry.paper.url}}`,
      ].filter((field): field is string => Boolean(field));
      return `@article{${key},\n${fields.join(",\n")}\n}`;
    })
    .join("\n\n");
}
