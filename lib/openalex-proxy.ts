import {
  buildCitationGraph,
  normalizeOpenAlexId,
  toPaper,
  type OpenAlexWork,
} from "./openalex";

interface ProxyEnv {
  OPENALEX_API_KEY?: string;
}

const OPENALEX_API = "https://api.openalex.org";
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
  "abstract_inverted_index",
].join(",");

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": status === 200 ? "public, max-age=300" : "no-store",
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

  const data = await openAlexFetch<{ results?: OpenAlexWork[] }>(
    "/works",
    {
      search: query,
      per_page: "8",
      select: WORK_FIELDS,
    },
    env,
  );

  return json({
    results: (data.results ?? [])
      .map((work) => toPaper(work, "selected"))
      .filter((paper) => paper.id)
      .slice(0, 8),
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
        per_page: "12",
        select: WORK_FIELDS,
      },
      env,
    ),
    openAlexFetch<{ results?: OpenAlexWork[] }>(
      "/works",
      {
        filter: `cites:${id}`,
        sort: "cited_by_count:desc",
        per_page: "12",
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

  return json(buildCitationGraph(selected, references, citingPapers, 25));
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
          { error: "Enter a title or DOI between 3 and 220 characters." },
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

    return json({ error: "Unknown request mode." }, 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The request could not be completed.";
    return json({ error: message }, 502);
  }
}
