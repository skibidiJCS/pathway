import assert from "node:assert/strict";
import test from "node:test";
import {
  LOCAL_COLLECTION_LIMIT,
  buildSavedRelationships,
  calculateAudit,
  compareSavedPapers,
  mergeCollections,
  sanitizeCollection,
  sanitizeFolder,
  sanitizeTags,
} from "../lib/collection.ts";
import type { Paper, SavedPaper } from "../lib/research-types.ts";

function paper(
  id: string,
  citationCount = 0,
  topics: string[] = [],
): Paper {
  return {
    id,
    title: `Paper ${id}`,
    authors: ["Researcher One"],
    year: 2022,
    source: "Example Journal",
    topics,
    citationCount,
    abstract: null,
    isOpenAccess: id !== "B",
    openAccessStatus: id !== "B" ? "gold" : null,
    doi: null,
    url: `https://openalex.org/${id}`,
    relation: "selected",
  };
}

function saved(
  root: Paper,
  references: Paper[] = [],
  citingPapers: Paper[] = [],
): SavedPaper {
  return {
    paper: root,
    status: "unread",
    note: "",
    folder: null,
    tags: [],
    references,
    citingPapers,
    savedAt: "2026-07-24T00:00:00.000Z",
  };
}

test("audit summarizes coverage and finds frequently shared missing references", () => {
  const shared = paper("X", 50);
  const first = paper("A", 10, ["Public health"]);
  first.year = 2020;
  const second = paper("B", 30, ["Public health", "Policy"]);
  const third = paper("C", 20, ["Policy"]);
  const collection = [
    saved(first, [shared, paper("Y")]),
    saved(second, [shared]),
    saved(third, [shared]),
  ];

  const audit = calculateAudit(collection);

  assert.equal(audit.totalCitations, 60);
  assert.equal(audit.medianCitations, 20);
  assert.equal(audit.openAccessCount, 2);
  assert.deepEqual(audit.years, [
    { label: "2022", count: 2 },
    { label: "2020", count: 1 },
  ]);
  assert.deepEqual(audit.topics, [
    { label: "Policy", count: 2 },
    { label: "Public health", count: 2 },
  ]);
  assert.equal(audit.sharedReferences[0].paper.id, "X");
  assert.equal(audit.sharedReferences[0].count, 3);
  assert.equal(audit.missingFrequentPapers[0].paper.id, "X");
  assert.equal(audit.bridgePapers[0].paper.id, "X");
  assert.equal(audit.bridgePapers[0].count, 3);
  assert.equal(audit.bridgePapers[0].referencedByCount, 3);
  assert.equal(audit.bridgePapers[0].citesSavedCount, 0);
});

test("bridge papers include common citers and exclude saved papers", () => {
  const first = paper("A");
  const second = paper("B");
  const bridge = paper("X", 75);
  const collection = [
    saved(first, [], [bridge]),
    saved(second, [], [bridge]),
    saved(bridge),
  ];

  assert.deepEqual(calculateAudit(collection).bridgePapers, []);

  const withoutBridge = collection.slice(0, 2);
  const [candidate] = calculateAudit(withoutBridge).bridgePapers;
  assert.equal(candidate.paper.id, "X");
  assert.equal(candidate.count, 2);
  assert.equal(candidate.referencedByCount, 0);
  assert.equal(candidate.citesSavedCount, 2);
});

test("comparison separates shared and unique links and detects direct citations", () => {
  const firstPaper = paper("A");
  const secondPaper = paper("B");
  const sharedReference = paper("X");
  const commonCiting = paper("C");
  const first = saved(
    firstPaper,
    [sharedReference, secondPaper, paper("Y")],
    [commonCiting],
  );
  const second = saved(
    secondPaper,
    [sharedReference, paper("Z")],
    [commonCiting, paper("D")],
  );

  const comparison = compareSavedPapers(first, second);

  assert.deepEqual(
    comparison.sharedReferences.map((item) => item.id),
    ["X"],
  );
  assert.deepEqual(
    comparison.firstOnlyReferences.map((item) => item.id),
    ["B", "Y"],
  );
  assert.deepEqual(
    comparison.secondOnlyReferences.map((item) => item.id),
    ["Z"],
  );
  assert.deepEqual(
    comparison.commonCitingPapers.map((item) => item.id),
    ["C"],
  );
  assert.deepEqual(comparison.directRelationships, [
    "Paper A cites Paper B",
  ]);
});

test("saved-paper map links citations and shared content with correct meaning", () => {
  const firstPaper = paper("A", 4, ["Policy"]);
  const secondPaper = paper("B", 8, ["Policy", "Law"]);
  const thirdPaper = paper("C", 2, ["Law"]);
  const sharedReference = paper("X");
  const commonCiting = paper("Y");
  const collection = [
    saved(firstPaper, [secondPaper, sharedReference], [commonCiting]),
    saved(secondPaper, [sharedReference], [commonCiting]),
    saved(thirdPaper),
  ];

  const graph = buildSavedRelationships(collection, ["A", "B", "C"]);

  assert.deepEqual(
    graph.papers.map((item) => item.id),
    ["A", "B", "C"],
  );
  assert.equal(graph.relationships.length, 2);
  const citation = graph.relationships.find(
    (relationship) => relationship.kind === "citation",
  );
  const content = graph.relationships.find(
    (relationship) => relationship.kind === "content",
  );
  assert.equal(citation?.source, "A");
  assert.equal(citation?.target, "B");
  assert.equal(citation?.direction, "forward");
  assert.equal(citation?.sharedReferences[0].id, "X");
  assert.equal(citation?.commonCitingPapers[0].id, "Y");
  assert.deepEqual(citation?.sharedTopics, ["Policy"]);
  assert.equal(content?.source, "B");
  assert.equal(content?.target, "C");
  assert.equal(content?.direction, "none");
  assert.deepEqual(content?.reasons, ["Shared OpenAlex topic: Law"]);
});

test("saved-paper map detects direct citations from the inverse citing list", () => {
  const firstPaper = paper("A");
  const secondPaper = paper("B");
  const graph = buildSavedRelationships(
    [saved(firstPaper), saved(secondPaper, [], [firstPaper])],
    ["A", "B"],
  );

  assert.equal(graph.relationships.length, 1);
  assert.equal(graph.relationships[0].source, "A");
  assert.equal(graph.relationships[0].target, "B");
  assert.equal(graph.relationships[0].kind, "citation");
  assert.deepEqual(graph.relationships[0].directRelationships, [
    "Paper A cites Paper B",
  ]);
});

test("collection merging deduplicates papers and keeps the local free limit explicit", () => {
  const cloud = [saved(paper("A"))];
  const local = [saved(paper("A")), saved(paper("B"))];

  assert.deepEqual(
    mergeCollections(cloud, local).map((entry) => entry.paper.id),
    ["A", "B"],
  );
  assert.equal(LOCAL_COLLECTION_LIMIT, 10);
});

test("cached collections are cleaned when loaded", () => {
  const corrupted = saved(paper("A"));
  corrupted.paper.title =
    "&lt;title&gt;Method for registration of 3-D shapes&lt;/title&gt;";
  corrupted.paper.authors = ["&lt;b&gt;Paul J. Besl&lt;/b&gt;"];
  corrupted.folder = "  &lt;b&gt;Methods&lt;/b&gt;  ";
  corrupted.tags = [" Policy ", "policy", "&lt;i&gt;Law&lt;/i&gt;"];

  const [cleaned] = sanitizeCollection([corrupted]);

  assert.equal(cleaned.paper.title, "Method for registration of 3-D shapes");
  assert.deepEqual(cleaned.paper.authors, ["Paul J. Besl"]);
  assert.equal(cleaned.folder, "Methods");
  assert.deepEqual(cleaned.tags, ["Policy", "Law"]);
});

test("folders and tags are normalized and capped", () => {
  assert.equal(sanitizeFolder("  Reading list  "), "Reading list");
  assert.equal(sanitizeFolder("   "), null);
  assert.deepEqual(
    sanitizeTags([
      "Methods",
      " methods ",
      "Policy",
      "Law",
      "History",
      "Review",
      "Theory",
      "Data",
      "Extra",
      "Ignored",
    ]),
    ["Methods", "Policy", "Law", "History", "Review", "Theory", "Data", "Extra"],
  );
});
