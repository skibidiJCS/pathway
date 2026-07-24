const OPENALEX_API = "https://api.openalex.org";
const OPENALEX_PREFIX = "https://openalex.org/";
const SEARCH_LIMIT = 12;
const RELATION_LIMIT = 14;
const GRAPH_LIMIT = 29;
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

function sendJson(response, body, status = 200) {
  response.setHeader(
    "Cache-Control",
    status === 200 ? "public, max-age=300" : "no-store",
  );
  response.setHeader("X-Content-Type-Options", "nosniff");
  return response.status(status).json(body);
}

function normalizeOpenAlexId(value) {
  const match = String(value ?? "")
    .trim()
    .match(/(?:https?:\/\/openalex\.org\/)?(W\d+)$/i);
  return match ? match[1].toUpperCase() : "";
}

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return null;

  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions ?? []) {
      if (Number.isInteger(position) && position >= 0) {
        words.push([position, word]);
      }
    }
  }

  if (words.length === 0) return null;
  return words
    .sort((a, b) => a[0] - b[0])
    .map(([, word]) => word)
    .join(" ");
}

function normalizeDoi(value) {
  if (!value) return null;
  const doi = value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").trim();
  return doi ? `https://doi.org/${doi}` : null;
}

function toPaper(work, relation = "reference") {
  const id = normalizeOpenAlexId(work.id);
  const doi = normalizeDoi(work.doi);
  const url =
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
        .filter(Boolean) ?? [],
    year:
      typeof work.publication_year === "number" ? work.publication_year : null,
    source: work.primary_location?.source?.display_name?.trim() || null,
    citationCount: Math.max(0, work.cited_by_count ?? 0),
    abstract: reconstructAbstract(work.abstract_inverted_index),
    isOpenAccess: Boolean(work.open_access?.is_oa),
    openAccessStatus: work.open_access?.oa_status?.trim() || null,
    doi,
    url,
    relation,
  };
}

function combineRelation(current, incoming) {
  if (current === incoming) return current;
  if (current === "selected" || incoming === "selected") return "selected";
  return "both";
}

function deduplicatePapers(papers) {
  const seen = new Map();
  for (const paper of papers) {
    if (!paper.id) continue;
    const existing = seen.get(paper.id);
    if (!existing) {
      seen.set(paper.id, { ...paper });
    } else {
      existing.relation = combineRelation(existing.relation, paper.relation);
    }
  }
  return [...seen.values()];
}

function buildCitationGraph(selected, references, citingPapers) {
  const root = { ...selected, relation: "selected" };
  const nodes = deduplicatePapers([
    root,
    ...references.slice(0, RELATION_LIMIT),
    ...citingPapers.slice(0, RELATION_LIMIT),
  ]).slice(0, GRAPH_LIMIT);
  const nodeIds = new Set(nodes.map((paper) => paper.id));
  const seenEdges = new Set();
  const edges = [];

  const addEdge = (source, target) => {
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return;
    const id = `${source}->${target}`;
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

function extractDoi(query) {
  const cleaned = query
    .trim()
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  return /^10\.\d{4,9}\/\S+$/i.test(cleaned) ? cleaned : null;
}

async function openAlexFetch(path, params) {
  const url = new URL(path, OPENALEX_API);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (process.env.OPENALEX_API_KEY) {
    url.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "OpenAlex’s request allowance has been reached. Try again later.",
      );
    }
    if (response.status === 404) throw new Error("No matching paper was found.");
    throw new Error("OpenAlex could not complete this request.");
  }
  return response.json();
}

async function searchWorks(query) {
  const doi = extractDoi(query);
  if (doi) {
    try {
      const work = await openAlexFetch(`/works/doi:${encodeURIComponent(doi)}`, {
        select: WORK_FIELDS,
      });
      return { results: [toPaper(work, "selected")] };
    } catch (error) {
      if (error instanceof Error && error.message.includes("No matching")) {
        return { results: [] };
      }
      throw error;
    }
  }

  const data = await openAlexFetch("/works", {
    search: query,
    per_page: String(SEARCH_LIMIT),
    select: WORK_FIELDS,
  });
  return {
    results: (data.results ?? [])
      .map((work) => toPaper(work, "selected"))
      .filter((paper) => paper.id)
      .slice(0, SEARCH_LIMIT),
  };
}

async function getGraph(id) {
  const [selectedWork, referenceData, citingData] = await Promise.all([
    openAlexFetch(`/works/${id}`, { select: WORK_FIELDS }),
    openAlexFetch("/works", {
      filter: `cited_by:${id}`,
      sort: "cited_by_count:desc",
      per_page: String(RELATION_LIMIT),
      select: WORK_FIELDS,
    }),
    openAlexFetch("/works", {
      filter: `cites:${id}`,
      sort: "cited_by_count:desc",
      per_page: String(RELATION_LIMIT),
      select: WORK_FIELDS,
    }),
  ]);

  return buildCitationGraph(
    toPaper(selectedWork, "selected"),
    (referenceData.results ?? []).map((work) => toPaper(work, "reference")),
    (citingData.results ?? []).map((work) => toPaper(work, "citing")),
  );
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Only GET requests are supported." }, 405);
  }

  const hostHeader = request.headers?.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const url = new URL(
    request.url ?? "/api/openalex",
    `https://${host ?? "localhost"}`,
  );
  const mode = url.searchParams.get("mode");

  try {
    if (mode === "search") {
      const query = url.searchParams.get("q")?.trim() ?? "";
      if (query.length < 3 || query.length > 220) {
        return sendJson(
          response,
          { error: "Enter a title or DOI between 3 and 220 characters." },
          400,
        );
      }
      return sendJson(response, await searchWorks(query));
    }

    if (mode === "graph") {
      const id = normalizeOpenAlexId(url.searchParams.get("id"));
      if (!id) {
        return sendJson(response, { error: "Invalid OpenAlex work ID." }, 400);
      }
      return sendJson(response, await getGraph(id));
    }

    return sendJson(response, { error: "Unknown request mode." }, 400);
  } catch (error) {
    return sendJson(
      response,
      {
        error:
          error instanceof Error
            ? error.message
            : "The request could not be completed.",
      },
      502,
    );
  }
}
