const OPENALEX_API = "https://api.openalex.org";
const OPENALEX_PREFIX = "https://openalex.org/";
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

const ABSTRACT_SYMBOLS = {
  alpha: "α",
  beta: "β",
  delta: "δ",
  gamma: "γ",
  infty: "∞",
  lambda: "λ",
  leq: "≤",
  mu: "μ",
  nu: "ν",
  pm: "±",
  sigma: "σ",
  sim: "∼",
  theta: "θ",
  times: "×",
  geq: "≥",
};

const HTML_ENTITIES = {
  AElig: "Æ",
  Aacute: "Á",
  Acirc: "Â",
  Agrave: "À",
  Aring: "Å",
  Atilde: "Ã",
  Auml: "Ä",
  Ccedil: "Ç",
  Eacute: "É",
  Ecirc: "Ê",
  Egrave: "È",
  Euml: "Ë",
  Iacute: "Í",
  Icirc: "Î",
  Igrave: "Ì",
  Iuml: "Ï",
  Ntilde: "Ñ",
  Oacute: "Ó",
  Ocirc: "Ô",
  Ograve: "Ò",
  Oslash: "Ø",
  Otilde: "Õ",
  Ouml: "Ö",
  Uacute: "Ú",
  Ucirc: "Û",
  Ugrave: "Ù",
  Uuml: "Ü",
  Yacute: "Ý",
  aacute: "á",
  acirc: "â",
  aelig: "æ",
  agrave: "à",
  alpha: "α",
  amp: "&",
  apos: "'",
  aring: "å",
  atilde: "ã",
  auml: "ä",
  beta: "β",
  bull: "•",
  ccedil: "ç",
  copy: "©",
  deg: "°",
  delta: "δ",
  eacute: "é",
  ecirc: "ê",
  egrave: "è",
  epsilon: "ε",
  equiv: "≡",
  eta: "η",
  eth: "ð",
  euml: "ë",
  euro: "€",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  gamma: "γ",
  ge: "≥",
  gt: ">",
  hellip: "…",
  iacute: "í",
  icirc: "î",
  igrave: "ì",
  iuml: "ï",
  lambda: "λ",
  laquo: "«",
  larr: "←",
  ldquor: "„",
  ldquo: "“",
  le: "≤",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  micro: "µ",
  middot: "·",
  minus: "−",
  mu: "μ",
  nbsp: " ",
  ndash: "–",
  ne: "≠",
  ntilde: "ñ",
  oacute: "ó",
  ocirc: "ô",
  ograve: "ò",
  omega: "ω",
  oslash: "ø",
  otilde: "õ",
  ouml: "ö",
  para: "¶",
  phi: "φ",
  pi: "π",
  plusmn: "±",
  psi: "ψ",
  quot: '"',
  raquo: "»",
  rarr: "→",
  reg: "®",
  rdquo: "”",
  rho: "ρ",
  rsquo: "’",
  sect: "§",
  sigma: "σ",
  sup2: "²",
  sup3: "³",
  tau: "τ",
  theta: "θ",
  times: "×",
  trade: "™",
  uacute: "ú",
  ucirc: "û",
  ugrave: "ù",
  uml: "¨",
  uuml: "ü",
  xi: "ξ",
  yacute: "ý",
  yen: "¥",
  yuml: "ÿ",
  zeta: "ζ",
};

const WINDOWS_1252_BYTES = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

function repairMojibake(value) {
  if (!/[ÃÂâïð]/.test(value)) return value;

  const bytes = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }
    const byte = WINDOWS_1252_BYTES[character];
    if (byte === undefined) return value;
    bytes.push(byte);
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(bytes),
    );
    const suspicious = (text) => (text.match(/[ÃÂâïð�]/g) ?? []).length;
    return suspicious(decoded) < suspicious(value) ? decoded : value;
  } catch {
    return value;
  }
}

function decodeHtmlEntities(value) {
  let text = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = text
      .replace(/&#x([0-9a-f]+);/gi, (match, code) => {
        const point = Number.parseInt(code, 16);
        return point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
          ? String.fromCodePoint(point)
          : "";
      })
      .replace(/&#(\d+);/g, (match, code) => {
        const point = Number.parseInt(code, 10);
        return point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
          ? String.fromCodePoint(point)
          : "";
      })
      .replace(/&([a-z][a-z0-9]+);/gi, (match, name) => {
        return HTML_ENTITIES[name] ?? HTML_ENTITIES[name.toLowerCase()] ?? match;
      });
    if (decoded === text) break;
    text = decoded;
  }
  return text;
}

export function cleanAbstractText(value) {
  let text = repairMojibake(decodeHtmlEntities(repairMojibake(value)))
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(
      /<\/?(?:abstract|br|div|h[1-6]|li|ol|p|section|table|td|th|title|tr|ul)\b[^>]*>/gi,
      " ",
    )
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g,
      "",
    )
    .replace(/\\rule\{[^{}]*\}\{[^{}]*\}/g, "")
    .replace(/\\phantom\{[^{}]*\}/g, "")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2");

  for (let index = 0; index < 3; index += 1) {
    text = text.replace(
      /\\(?:ensuremath|emph|mathbb|mathcal|mathbf|mathrm|mathit|mathsf|mathtt|text|textbf|textit|textrm|operatorname)\{([^{}]*)\}/g,
      "$1",
    );
  }

  text = text.replace(/\\([a-zA-Z]+)\b/g, (match, name) => {
    return ABSTRACT_SYMBOLS[name] ?? "";
  });

  return text
    .replace(/\\[,;:!]/g, " ")
    .replace(/([_^])\{([^{}]+)\}/g, "$1$2")
    .replace(/[{}$]/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .normalize("NFC")
    .trim();
}

export function cleanMetadataText(value) {
  return cleanAbstractText(value);
}

function sendJson(response, body, status = 200) {
  response.setHeader(
    "Cache-Control",
    status === 200
      ? "public, max-age=300, s-maxage=300, stale-while-revalidate=86400"
      : "no-store",
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
  const abstract = words
    .sort((a, b) => a[0] - b[0])
    .map(([, word]) => word)
    .join(" ");
  return cleanAbstractText(abstract) || null;
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
    title:
      cleanMetadataText(work.display_name ?? work.title ?? "") ||
      "Untitled work",
    authors:
      work.authorships
        ?.map((authorship) =>
          cleanMetadataText(authorship.author?.display_name ?? ""),
        )
        .filter(Boolean) ?? [],
    year:
      typeof work.publication_year === "number" ? work.publication_year : null,
    source:
      cleanMetadataText(
        work.primary_location?.source?.display_name ?? "",
      ) || null,
    topics: [
      ...new Set(
        [
          cleanMetadataText(work.primary_topic?.display_name ?? ""),
          ...(work.topics
            ?.slice(0, 3)
            .map((topic) => cleanMetadataText(topic.display_name ?? "")) ?? []),
        ].filter(Boolean),
      ),
    ].slice(0, 3),
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

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

async function getUpdates(ids, since) {
  const data = await openAlexFetch("/works", {
    filter: `cites:${ids.join("|")},from_publication_date:${since}`,
    sort: "publication_date:desc",
    per_page: String(UPDATE_LIMIT),
    select: WORK_FIELDS,
  });
  return {
    results: (data.results ?? [])
      .map((work) => toPaper(work, "citing"))
      .filter((paper) => paper.id)
      .slice(0, UPDATE_LIMIT),
  };
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
          {
            error:
              "Enter a title, DOI or keyword between 3 and 220 characters.",
          },
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

    if (mode === "updates") {
      const ids = [
        ...new Set(
          (url.searchParams.get("ids") ?? "")
            .split(",")
            .map(normalizeOpenAlexId)
            .filter(Boolean),
        ),
      ].slice(0, 25);
      const since = url.searchParams.get("since") ?? "";
      if (ids.length === 0 || !validDate(since)) {
        return sendJson(response, { error: "Invalid update request." }, 400);
      }
      return sendJson(response, await getUpdates(ids, since));
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
