"use client";

import type {
  CitationGraphData,
  SearchResponse,
  UpdatesResponse,
} from "../lib/research-types";

const CACHE_PREFIX = "pathway:v3:";
const memoryCache = new Map<string, { expires: number; value: unknown }>();

async function cachedRequest<T>(url: string, ttlMs: number): Promise<T> {
  const key = `${CACHE_PREFIX}${url}`;
  const now = Date.now();

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw) as { expires: number; value: T };
      if (cached.expires > now) return cached.value;
      localStorage.removeItem(key);
    }
  } catch {
    const cached = memoryCache.get(key);
    if (cached && cached.expires > now) return cached.value as T;
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const contentType = response.headers.get("content-type") ?? "";
  let data: (T & { error?: string }) | null = null;

  if (contentType.includes("application/json")) {
    data = (await response.json()) as T & { error?: string };
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Search is temporarily unavailable. Please try again in a moment.",
    );
  }
  if (!data) throw new Error("The server returned an unexpected response.");

  const entry = { expires: now + ttlMs, value: data };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Memory caching is sufficient when browser storage is unavailable.
  }

  return data;
}

export function searchPapers(query: string): Promise<SearchResponse> {
  return cachedRequest(
    `/api/openalex?mode=search&q=${encodeURIComponent(query)}`,
    60 * 60 * 1000,
  );
}

export function loadCitationGraph(id: string): Promise<CitationGraphData> {
  return cachedRequest(
    `/api/openalex?mode=graph&id=${encodeURIComponent(id)}`,
    6 * 60 * 60 * 1000,
  );
}

export async function loadCollectionUpdates(
  ids: string[],
  since: string,
): Promise<UpdatesResponse> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const results: UpdatesResponse["results"] = [];

  for (let index = 0; index < uniqueIds.length; index += 25) {
    const batch = uniqueIds.slice(index, index + 25);
    const response = await cachedRequest<UpdatesResponse>(
      `/api/openalex?mode=updates&ids=${encodeURIComponent(batch.join(","))}&since=${encodeURIComponent(since)}`,
      15 * 60 * 1000,
    );
    results.push(...response.results);
  }

  const seen = new Set<string>();
  return {
    results: results
      .filter((paper) => {
        if (seen.has(paper.id)) return false;
        seen.add(paper.id);
        return true;
      })
      .sort(
        (a, b) =>
          (b.year ?? 0) - (a.year ?? 0) ||
          b.citationCount - a.citationCount,
      )
      .slice(0, 24),
  };
}
