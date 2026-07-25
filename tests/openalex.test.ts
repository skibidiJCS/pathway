import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCitationGraph,
  cleanAbstractText,
  cleanMetadataText,
  deduplicatePapers,
  reconstructAbstract,
  toPaper,
} from "../lib/openalex.ts";
import type { Paper } from "../lib/research-types.ts";

function paper(id: string, relation: Paper["relation"] = "reference"): Paper {
  return {
    id,
    title: id,
    authors: [],
    year: 2024,
    source: null,
    topics: [],
    citationCount: 0,
    abstract: null,
    isOpenAccess: false,
    openAccessStatus: null,
    doi: null,
    url: `https://openalex.org/${id}`,
    relation,
  };
}

test("converts OpenAlex metadata and reconstructs an abstract", () => {
  const converted = toPaper(
    {
      id: "https://openalex.org/W123",
      doi: "https://doi.org/10.1000/example",
      display_name: "A useful paper",
      publication_year: 2022,
      cited_by_count: 41,
      abstract_inverted_index: {
        maps: [2],
        Pathway: [0],
        citations: [3],
        visualizes: [1],
      },
      authorships: [{ author: { display_name: "A. Author" } }],
      primary_location: { source: { display_name: "Example Journal" } },
      open_access: { is_oa: true, oa_status: "gold" },
    },
    "selected",
  );

  assert.equal(converted.id, "W123");
  assert.equal(converted.abstract, "Pathway visualizes maps citations");
  assert.deepEqual(converted.authors, ["A. Author"]);
  assert.equal(converted.source, "Example Journal");
  assert.equal(converted.isOpenAccess, true);
});

test("reconstructAbstract handles missing values", () => {
  assert.equal(reconstructAbstract(null), null);
  assert.equal(reconstructAbstract({}), null);
});

test("cleans common OpenAlex math markup from abstracts", () => {
  assert.equal(
    cleanAbstractText(
      "For $\\ensuremath{\\gamma}&lt;1$, ${A}_{k}\\ensuremath{\\sim}{k}^{\\ensuremath{\\gamma}}$ and $\\ensuremath{\\nu}\\phantom{\\rule{0ex}{0ex}}=\\ensuremath{\\infty}$.",
    ),
    "For γ<1, A_k∼k^γ and ν=∞.",
  );
});

test("decodes HTML entities and removes embedded tags from metadata", () => {
  assert.equal(
    cleanMetadataText(
      "&amp;lt;title&amp;gt;Method for registration of 3-D shapes&amp;lt;/title&amp;gt;",
    ),
    "Method for registration of 3-D shapes",
  );
  assert.equal(
    cleanMetadataText(
      "The enzymic conversion of &lt;i&gt;all&lt;/i&gt;-cis compounds &#8212; a review",
    ),
    "The enzymic conversion of all-cis compounds — a review",
  );
  assert.equal(
    cleanMetadataText(
      "FranÃ§oisâ€™s caf&eacute; &mdash; temperature 20&deg;C",
    ),
    "François’s café — temperature 20°C",
  );
  assert.equal(
    cleanMetadataText("A\u0000 title with &#99999999; invalid data"),
    "A title with invalid data",
  );
});

test("cleans titles, authors, sources, and topics during conversion", () => {
  const converted = toPaper({
    id: "https://openalex.org/W456",
    display_name: "&lt;title&gt;Clean title&lt;/title&gt;",
    authorships: [
      { author: { display_name: "&lt;b&gt;Jane Doe&lt;/b&gt;" } },
    ],
    primary_location: {
      source: { display_name: "Journal &amp; Review" },
    },
    primary_topic: { display_name: "&lt;i&gt;Shape analysis&lt;/i&gt;" },
  });

  assert.equal(converted.title, "Clean title");
  assert.deepEqual(converted.authors, ["Jane Doe"]);
  assert.equal(converted.source, "Journal & Review");
  assert.deepEqual(converted.topics, ["Shape analysis"]);
});

test("deduplicates papers by OpenAlex ID and records both relations", () => {
  const unique = deduplicatePapers([
    paper("W1", "selected"),
    paper("W2", "reference"),
    paper("W2", "citing"),
  ]);

  assert.equal(unique.length, 2);
  assert.equal(unique.find((item) => item.id === "W2")?.relation, "both");
});

test("citation arrows point from citing work to cited work", () => {
  const graph = buildCitationGraph(
    paper("W1", "selected"),
    [paper("W2")],
    [paper("W3", "citing")],
  );

  assert.deepEqual(
    graph.edges.map(({ source, target }) => [source, target]),
    [
      ["W1", "W2"],
      ["W3", "W1"],
    ],
  );
});

test("limits a graph to 14 papers per citation direction", () => {
  const references = Array.from({ length: 20 }, (_, index) =>
    paper(`W${index + 10}`),
  );
  const citing = Array.from({ length: 20 }, (_, index) =>
    paper(`W${index + 100}`, "citing"),
  );
  const graph = buildCitationGraph(paper("W1", "selected"), references, citing);

  assert.equal(graph.nodes.length, 29);
  assert.equal(
    graph.nodes.filter((item) => item.relation === "reference").length,
    14,
  );
  assert.equal(
    graph.nodes.filter((item) => item.relation === "citing").length,
    14,
  );
});
