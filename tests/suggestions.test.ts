import assert from "node:assert/strict";
import test from "node:test";
import type { Paper, SavedPaper } from "../lib/research-types.ts";
import { suggestPapers } from "../lib/suggestions.ts";

function paper(id: string, citationCount = 0): Paper {
  return {
    id,
    title: `Paper ${id}`,
    authors: [],
    year: 2020,
    source: null,
    topics: [],
    citationCount,
    abstract: null,
    isOpenAccess: false,
    openAccessStatus: null,
    doi: null,
    url: `https://openalex.org/${id}`,
    relation: "reference",
  };
}

function saved(root: Paper, references: Paper[] = [], citingPapers: Paper[] = []): SavedPaper {
  return {
    paper: root,
    status: "unread",
    note: "",
    folder: null,
    tags: [],
    references,
    citingPapers,
    savedAt: "2026-11-06T00:00:00.000Z",
  };
}

test("counts each saved paper once per candidate", () => {
  const x = paper("X");
  const collection = [saved(paper("A"), [x], [x]), saved(paper("B"))];
  assert.deepEqual(suggestPapers(collection, new Set()), []);
});

test("requires at least 2 links", () => {
  const x = paper("X");
  const y = paper("Y");
  const collection = [saved(paper("A"), [x, y]), saved(paper("B"), [], [x])];
  assert.deepEqual(
    suggestPapers(collection, new Set()).map((s) => [s.paper.id, s.links]),
    [["X", 2]],
  );
});

test("excludes saved and skipped", () => {
  const b = paper("B");
  const x = paper("X");
  const collection = [
    saved(paper("A"), [b, x]),
    saved(b),
    saved(paper("C"), [b, x]),
  ];
  assert.deepEqual(suggestPapers(collection, new Set(["X"])), []);
});

test("orders by links then citationCount", () => {
  const low = paper("L", 5);
  const high = paper("H", 500);
  const top = paper("T", 1);
  const collection = [
    saved(paper("A"), [low, high, top]),
    saved(paper("B"), [low, high, top]),
    saved(paper("C"), [top]),
  ];
  assert.deepEqual(
    suggestPapers(collection, new Set()).map((s) => s.paper.id),
    ["T", "H", "L"],
  );
});

test("respects the limit", () => {
  const candidates = Array.from({ length: 5 }, (_, i) => paper(`P${i}`, i));
  const collection = [saved(paper("A"), candidates), saved(paper("B"), candidates)];
  assert.equal(suggestPapers(collection, new Set(), 3).length, 3);
});
