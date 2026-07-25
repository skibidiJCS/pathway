export type PaperRelation = "selected" | "reference" | "citing" | "both";

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  source: string | null;
  topics: string[];
  citationCount: number;
  abstract: string | null;
  isOpenAccess: boolean;
  openAccessStatus: string | null;
  doi: string | null;
  url: string;
  relation: PaperRelation;
}

export interface CitationEdge {
  id: string;
  source: string;
  target: string;
}

export interface CitationGraphData {
  centerId: string;
  nodes: Paper[];
  edges: CitationEdge[];
}

export interface SearchResponse {
  results: Paper[];
  matchedAuthor?: string;
}

export type ReviewStatus = "unread" | "reviewed" | "used";

export interface SavedPaper {
  paper: Paper;
  status: ReviewStatus;
  note: string;
  folder: string | null;
  tags: string[];
  references: Paper[];
  citingPapers: Paper[];
  savedAt: string;
}

export interface CollectionSettings {
  lastCheckedAt: string | null;
}

export interface UpdatesResponse {
  results: Paper[];
}
