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
export const FOLDER_LIMIT = 48;
export const TAG_LIMIT = 8;
export const TAG_LENGTH_LIMIT = 32;

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

export function sanitizeFolder(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const folder = cleanMetadataText(value).trim().slice(0, FOLDER_LIMIT);
  return folder || null;
}

export function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const tag = cleanMetadataText(candidate).trim().slice(0, TAG_LENGTH_LIMIT);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= TAG_LIMIT) break;
  }
  return tags;
}

export function sanitizePaper(value: unknown): Paper | null {
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
        folder: sanitizeFolder(candidate.folder),
        tags: sanitizeTags(candidate.tags),
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
  } catch {}
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
  } catch {}
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

export interface PaperComparison {
  sharedReferences: Paper[];
  firstOnlyReferences: Paper[];
  secondOnlyReferences: Paper[];
  commonCitingPapers: Paper[];
  directRelationships: string[];
}

export type SavedRelationshipDirection = "forward" | "both" | "none";
export type SavedRelationshipKind = "citation" | "overlap" | "content";

export interface SavedRelationship {
  id: string;
  source: string;
  target: string;
  direction: SavedRelationshipDirection;
  kind: SavedRelationshipKind;
  directRelationships: string[];
  sharedReferences: Paper[];
  commonCitingPapers: Paper[];
  sharedTopics: string[];
  reasons: string[];
}

export interface SavedRelationshipGraph {
  papers: Paper[];
  relationships: SavedRelationship[];
}

function topicKey(topic: string): string {
  return topic.trim().toLocaleLowerCase();
}

export function buildSavedRelationships(
  collection: SavedPaper[],
  selectedIds: string[],
  limit = 25,
): SavedRelationshipGraph {
  const selected = new Set(selectedIds.slice(0, limit));
  const entries = collection
    .filter((entry) => selected.has(entry.paper.id))
    .slice(0, limit);
  const relationships: SavedRelationship[] = [];

  for (let firstIndex = 0; firstIndex < entries.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < entries.length;
      secondIndex += 1
    ) {
      const first = entries[firstIndex];
      const second = entries[secondIndex];
      const firstReferences = new Map(
        first.references.map((paper) => [paper.id, paper]),
      );
      const secondReferences = new Map(
        second.references.map((paper) => [paper.id, paper]),
      );
      const secondCitingIds = new Set(
        second.citingPapers.map((paper) => paper.id),
      );
      const firstCitingIds = new Set(
        first.citingPapers.map((paper) => paper.id),
      );
      const firstCitesSecond =
        firstReferences.has(second.paper.id) ||
        secondCitingIds.has(first.paper.id);
      const secondCitesFirst =
        secondReferences.has(first.paper.id) ||
        firstCitingIds.has(second.paper.id);
      const sharedReferences = [...firstReferences.values()].filter((paper) =>
        secondReferences.has(paper.id),
      );
      const commonCitingPapers = first.citingPapers.filter((paper) =>
        secondCitingIds.has(paper.id),
      );
      const secondTopics = new Set(second.paper.topics.map(topicKey));
      const sharedTopics = first.paper.topics.filter((topic, index, topics) => {
        const key = topicKey(topic);
        return (
          secondTopics.has(key) &&
          topics.findIndex((candidate) => topicKey(candidate) === key) === index
        );
      });

      if (
        !firstCitesSecond &&
        !secondCitesFirst &&
        sharedReferences.length === 0 &&
        commonCitingPapers.length === 0 &&
        sharedTopics.length === 0
      ) {
        continue;
      }

      const directRelationships = [
        ...(firstCitesSecond
          ? [`${first.paper.title} cites ${second.paper.title}`]
          : []),
        ...(secondCitesFirst
          ? [`${second.paper.title} cites ${first.paper.title}`]
          : []),
      ];
      let source = first.paper.id;
      let target = second.paper.id;
      let direction: SavedRelationshipDirection = "none";
      if (firstCitesSecond && secondCitesFirst) {
        direction = "both";
      } else if (firstCitesSecond) {
        direction = "forward";
      } else if (secondCitesFirst) {
        source = second.paper.id;
        target = first.paper.id;
        direction = "forward";
      }
      const kind: SavedRelationshipKind =
        firstCitesSecond || secondCitesFirst
          ? "citation"
          : sharedReferences.length > 0 || commonCitingPapers.length > 0
            ? "overlap"
            : "content";
      const reasons = [
        ...directRelationships,
        ...(sharedReferences.length
          ? [
              `${sharedReferences.length} shared reference${sharedReferences.length === 1 ? "" : "s"}`,
            ]
          : []),
        ...(commonCitingPapers.length
          ? [
              `${commonCitingPapers.length} common citing paper${commonCitingPapers.length === 1 ? "" : "s"}`,
            ]
          : []),
        ...(sharedTopics.length
          ? [`Shared OpenAlex topic: ${sharedTopics.slice(0, 2).join(", ")}`]
          : []),
      ];

      relationships.push({
        id: [first.paper.id, second.paper.id].sort().join("--"),
        source,
        target,
        direction,
        kind,
        directRelationships,
        sharedReferences,
        commonCitingPapers,
        sharedTopics,
        reasons,
      });
    }
  }

  return {
    papers: entries.map((entry) => entry.paper),
    relationships,
  };
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
  const firstCitingIds = new Set(
    first.citingPapers.map((paper) => paper.id),
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
      ...(firstReferences.has(second.paper.id) ||
      secondCitingIds.has(first.paper.id)
        ? [`${first.paper.title} cites ${second.paper.title}`]
        : []),
      ...(secondReferences.has(first.paper.id) ||
      firstCitingIds.has(second.paper.id)
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
      "Folder",
      "Tags",
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
      entry.folder ?? "",
      entry.tags.join("; "),
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
