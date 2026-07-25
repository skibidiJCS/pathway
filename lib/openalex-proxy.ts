import {
  buildCitationGraph,
  normalizeOpenAlexId,
  toPaper,
  type OpenAlexWork,
} from "./openalex.ts";

interface ProxyEnv {
  OPENALEX_API_KEY?: string;
}

interface OpenAlexAuthor {
  id?: string;
  display_name?: string;
  works_count?: number;
}

const OPENALEX_API = "https://api.openalex.org";
const SEARCH_LIMIT = 12;
const RELATION_LIMIT = 14;
const GRAPH_LIMIT = 29;
const UPDATE_LIMIT = 12;
const WORK_FIELDS = [
  "id",
  "doi",
  "display_name",
  "publication_year",
  "cited_by_count",
  "authorships",
  "primary_location",
  "best_oa_location",
  "open_access",
  "primary_topic",
  "topics",
  "abstract_inverted_index",
].join(",");

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control":
        status === 200
          ? "public, max-age=300, s-maxage=300, stale-while-revalidate=86400"
          : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function extractDoi(query: string): string | null {
  const cleaned = query
    .trim()
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  return /^10\.\d{4,9}\/\S+$/i.test(cleaned) ? cleaned : null;
}

function normalizedName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function looksLikeFullName(query: string): boolean {
  const words = normalizedName(query).split(" ").filter(Boolean);
  return (
    words.length >= 2 &&
    words.length <= 6 &&
    query.length <= 90 &&
    !/\d/.test(query)
  );
}

async function findExactAuthor(
  query: string,
  env: ProxyEnv,
): Promise<OpenAlexAuthor | null> {
  if (!looksLikeFullName(query)) return null;
  const data = await openAlexFetch<{ results?: OpenAlexAuthor[] }>(
    "/autocomplete/authors",
    { q: query },
    env,
  );
  const queryName = normalizedName(query);
  return (
    (data.results ?? [])
      .filter(
        (author) =>
          author.id &&
          author.display_name &&
          normalizedName(author.display_name) === queryName,
      )
      .sort((a, b) => (b.works_count ?? 0) - (a.works_count ?? 0))[0] ?? null
  );
}

async function openAlexFetch<T>(
  path: string,
  params: Record<string, string>,
  env: ProxyEnv,
): Promise<T> {
  const url = new URL(path, OPENALEX_API);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (env.OPENALEX_API_KEY) {
    url.searchParams.set("api_key", env.OPENALEX_API_KEY);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const message =
      response.status === 429
        ? "OpenAlex’s request allowance has been reached. Try again later."
        : response.status === 404
          ? "No matching paper was found."
          : "OpenAlex could not complete this request.";
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function searchWorks(query: string, env: ProxyEnv): Promise<Response> {
  const doi = extractDoi(query);
  if (doi) {
    try {
      const work = await openAlexFetch<OpenAlexWork>(
        `/works/doi:${encodeURIComponent(doi)}`,
        { select: WORK_FIELDS },
        env,
      );
      return json({ results: [toPaper(work, "selected")] });
    } catch (error) {
      if (error instanceof Error && error.message.includes("No matching")) {
        return json({ results: [] });
      }
      throw error;
    }
  }

  const author = await findExactAuthor(query, env);
  if (author?.id && author.display_name) {
    const authorId = author.id.match(/A\d+$/i)?.[0];
    if (authorId) {
      const data = await openAlexFetch<{ results?: OpenAlexWork[] }>(
        "/works",
        {
          filter: `author.id:${authorId}`,
          sort: "cited_by_count:desc",
          per_page: String(SEARCH_LIMIT),
          select: WORK_FIELDS,
        },
        env,
      );
      return json({
        matchedAuthor: author.display_name,
        results: (data.results ?? [])
          .map((work) => toPaper(work, "selected"))
          .filter((paper) => paper.id)
          .slice(0, SEARCH_LIMIT),
      });
    }
  }

  const data = await openAlexFetch<{ results?: OpenAlexWork[] }>(
    "/works",
    {
      search: query,
      per_page: String(SEARCH_LIMIT),
      select: WORK_FIELDS,
    },
    env,
  );

  return json({
    results: (data.results ?? [])
      .map((work) => toPaper(work, "selected"))
      .filter((paper) => paper.id)
      .slice(0, SEARCH_LIMIT),
  });
}

async function getGraph(id: string, env: ProxyEnv): Promise<Response> {
  const [selectedWork, referenceData, citingData] = await Promise.all([
    openAlexFetch<OpenAlexWork>(`/works/${id}`, { select: WORK_FIELDS }, env),
    openAlexFetch<{ results?: OpenAlexWork[] }>(
      "/works",
      {
        filter: `cited_by:${id}`,
        sort: "cited_by_count:desc",
        per_page: String(RELATION_LIMIT),
        select: WORK_FIELDS,
      },
      env,
    ),
    openAlexFetch<{ results?: OpenAlexWork[] }>(
      "/works",
      {
        filter: `cites:${id}`,
        sort: "cited_by_count:desc",
        per_page: String(RELATION_LIMIT),
        select: WORK_FIELDS,
      },
      env,
    ),
  ]);

  const selected = toPaper(selectedWork, "selected");
  const references = (referenceData.results ?? []).map((work) =>
    toPaper(work, "reference"),
  );
  const citingPapers = (citingData.results ?? []).map((work) =>
    toPaper(work, "citing"),
  );

  return json(buildCitationGraph(selected, references, citingPapers, GRAPH_LIMIT));
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

async function getUpdates(
  ids: string[],
  since: string,
  env: ProxyEnv,
): Promise<Response> {
  const data = await openAlexFetch<{ results?: OpenAlexWork[] }>(
    "/works",
    {
      filter: `cites:${ids.join("|")},from_publication_date:${since}`,
      sort: "publication_date:desc",
      per_page: String(UPDATE_LIMIT),
      select: WORK_FIELDS,
    },
    env,
  );

  return json({
    results: (data.results ?? [])
      .map((work) => toPaper(work, "citing"))
      .filter((paper) => paper.id)
      .slice(0, UPDATE_LIMIT),
  });
}

export async function handleOpenAlexRequest(
  request: Request,
  env: ProxyEnv,
): Promise<Response> {
  if (request.method !== "GET") {
    return json({ error: "Only GET requests are supported." }, 405);
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  try {
    if (mode === "search") {
      const query = url.searchParams.get("q")?.trim() ?? "";
      if (query.length < 3 || query.length > 220) {
        return json(
          {
            error:
              "Enter a title, DOI, keyword or author between 3 and 220 characters.",
          },
          400,
        );
      }
      return await searchWorks(query, env);
    }

    if (mode === "graph") {
      const id = normalizeOpenAlexId(url.searchParams.get("id") ?? "");
      if (!id) return json({ error: "Invalid OpenAlex work ID." }, 400);
      return await getGraph(id, env);
    }

    if (mode === "updates") {
      const ids = Array.from(
        new Set(
          (url.searchParams.get("ids") ?? "")
            .split(",")
            .map(normalizeOpenAlexId)
            .filter(Boolean),
        ),
      ).slice(0, 25);
      const since = url.searchParams.get("since") ?? "";
      if (ids.length === 0 || !validDate(since)) {
        return json({ error: "Invalid update request." }, 400);
      }
      return await getUpdates(ids, since, env);
    }

    return json({ error: "Unknown request mode." }, 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The request could not be completed.";
    return json({ error: message }, 502);
  }
}
