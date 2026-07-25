import assert from "node:assert/strict";
import test from "node:test";
import { sortCitationPapers } from "../lib/graph-view.ts";
import { updateExplorationHistory } from "../lib/history.ts";
import type { Paper } from "../lib/research-types.ts";

function paper(
  id: string,
  year: number | null,
  citations: number,
  topics: string[] = [],
): Paper {
  return {
    id,
    title: `Paper ${id}`,
    authors: [],
    year,
    source: null,
    topics,
    citationCount: citations,
    abstract: null,
    isOpenAccess: true,
    openAccessStatus: "gold",
    doi: null,
    url: `https://openalex.org/${id}`,
    relation: id === "CENTER" ? "selected" : "reference",
  };
}

test("citation columns sort by relevance, year and citation count", () => {
  const center = paper("CENTER", 2020, 0, ["Law", "Policy"]);
  const papers = [
    paper("A", 2018, 20, ["Physics"]),
    paper("B", 2024, 2, ["Law"]),
    paper("C", null, 100, ["Policy"]),
  ];

  assert.deepEqual(
    sortCitationPapers(papers, "relevance", center).map((item) => item.id),
    ["C", "B", "A"],
  );
  assert.deepEqual(
    sortCitationPapers(papers, "newest", center).map((item) => item.id),
    ["B", "A", "C"],
  );
  assert.deepEqual(
    sortCitationPapers(papers, "oldest", center).map((item) => item.id),
    ["A", "B", "C"],
  );
  assert.deepEqual(
    sortCitationPapers(papers, "most-cited", center).map((item) => item.id),
    ["C", "A", "B"],
  );
});

test("exploration history keeps the most recent unique papers", () => {
  const first = paper("A", 2020, 1);
  const second = paper("B", 2021, 2);
  const history = updateExplorationHistory(
    updateExplorationHistory([], first),
    second,
  );
  const revisited = updateExplorationHistory(history, first);

  assert.deepEqual(
    revisited.map((item) => item.id),
    ["A", "B"],
  );
});
