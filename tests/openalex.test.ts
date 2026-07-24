import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCitationGraph,
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

test("hard-caps a graph at 30 nodes", () => {
  const references = Array.from({ length: 20 }, (_, index) =>
    paper(`W${index + 10}`),
  );
  const citing = Array.from({ length: 20 }, (_, index) =>
    paper(`W${index + 100}`, "citing"),
  );
  const graph = buildCitationGraph(
    paper("W1", "selected"),
    references,
    citing,
    99,
  );

  assert.ok(graph.nodes.length <= 30);
});
