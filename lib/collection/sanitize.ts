import { cleanAbstractText, cleanMetadataText } from "../openalex.ts";
import type { Paper, ReviewStatus, SavedPaper } from "../research-types";
import {
  CLOUD_COLLECTION_LIMIT,
  FOLDER_LIMIT,
  NOTE_LIMIT,
  TAG_LENGTH_LIMIT,
  TAG_LIMIT,
} from "./limits.ts";

function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === "unread" || value === "reviewed" || value === "used";
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
