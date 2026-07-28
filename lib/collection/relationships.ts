import type { Paper, SavedPaper } from "../research-types";

export interface PaperComparison {
  sharedReferences: Paper[];
  firstOnlyReferences: Paper[];
  secondOnlyReferences: Paper[];
  commonCitingPapers: Paper[];
  directRelationships: string[];
}

export type SavedRelationshipDirection = "forward" | "both" | "none";
export type SavedRelationshipKind = "citation" | "overlap" | "content";

export interface SavedRelationship {
  id: string;
  source: string;
  target: string;
  direction: SavedRelationshipDirection;
  kind: SavedRelationshipKind;
  directRelationships: string[];
  sharedReferences: Paper[];
  commonCitingPapers: Paper[];
  sharedTopics: string[];
  reasons: string[];
}

export interface SavedRelationshipGraph {
  papers: Paper[];
  relationships: SavedRelationship[];
}

function topicKey(topic: string): string {
  return topic.trim().toLocaleLowerCase();
}

export function buildSavedRelationships(
  collection: SavedPaper[],
  selectedIds: string[],
  limit = 25,
): SavedRelationshipGraph {
  const selected = new Set(selectedIds.slice(0, limit));
  const entries = collection
    .filter((entry) => selected.has(entry.paper.id))
    .slice(0, limit);
  const relationships: SavedRelationship[] = [];

  for (let firstIndex = 0; firstIndex < entries.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < entries.length;
      secondIndex += 1
    ) {
      const first = entries[firstIndex];
      const second = entries[secondIndex];
      const firstReferences = new Map(
        first.references.map((paper) => [paper.id, paper]),
      );
      const secondReferences = new Map(
        second.references.map((paper) => [paper.id, paper]),
      );
      const secondCitingIds = new Set(
        second.citingPapers.map((paper) => paper.id),
      );
      const firstCitingIds = new Set(
        first.citingPapers.map((paper) => paper.id),
      );
      const firstCitesSecond =
        firstReferences.has(second.paper.id) ||
        secondCitingIds.has(first.paper.id);
      const secondCitesFirst =
        secondReferences.has(first.paper.id) ||
        firstCitingIds.has(second.paper.id);
      const sharedReferences = [...firstReferences.values()].filter((paper) =>
        secondReferences.has(paper.id),
      );
      const commonCitingPapers = first.citingPapers.filter((paper) =>
        secondCitingIds.has(paper.id),
      );
      const secondTopics = new Set(second.paper.topics.map(topicKey));
      const sharedTopics = first.paper.topics.filter((topic, index, topics) => {
        const key = topicKey(topic);
        return (
          secondTopics.has(key) &&
          topics.findIndex((candidate) => topicKey(candidate) === key) === index
        );
      });

      if (
        !firstCitesSecond &&
        !secondCitesFirst &&
        sharedReferences.length === 0 &&
        commonCitingPapers.length === 0 &&
        sharedTopics.length === 0
      ) {
        continue;
      }

      const directRelationships = [
        ...(firstCitesSecond
          ? [`${first.paper.title} cites ${second.paper.title}`]
          : []),
        ...(secondCitesFirst
          ? [`${second.paper.title} cites ${first.paper.title}`]
          : []),
      ];
      let source = first.paper.id;
      let target = second.paper.id;
      let direction: SavedRelationshipDirection = "none";
      if (firstCitesSecond && secondCitesFirst) {
        direction = "both";
      } else if (firstCitesSecond) {
        direction = "forward";
      } else if (secondCitesFirst) {
        source = second.paper.id;
        target = first.paper.id;
        direction = "forward";
      }
      const kind: SavedRelationshipKind =
        firstCitesSecond || secondCitesFirst
          ? "citation"
          : sharedReferences.length > 0 || commonCitingPapers.length > 0
            ? "overlap"
            : "content";
      const reasons = [
        ...directRelationships,
        ...(sharedReferences.length
          ? [
              `${sharedReferences.length} shared reference${sharedReferences.length === 1 ? "" : "s"}`,
            ]
          : []),
        ...(commonCitingPapers.length
          ? [
              `${commonCitingPapers.length} common citing paper${commonCitingPapers.length === 1 ? "" : "s"}`,
            ]
          : []),
        ...(sharedTopics.length
          ? [`Shared OpenAlex topic: ${sharedTopics.slice(0, 2).join(", ")}`]
          : []),
      ];

      relationships.push({
        id: [first.paper.id, second.paper.id].sort().join("--"),
        source,
        target,
        direction,
        kind,
        directRelationships,
        sharedReferences,
        commonCitingPapers,
        sharedTopics,
        reasons,
      });
    }
  }

  return {
    papers: entries.map((entry) => entry.paper),
    relationships,
  };
}

export function compareSavedPapers(
  first: SavedPaper,
  second: SavedPaper,
): PaperComparison {
  const firstReferences = new Map(
    first.references.map((paper) => [paper.id, paper]),
  );
  const secondReferences = new Map(
    second.references.map((paper) => [paper.id, paper]),
  );
  const secondCitingIds = new Set(
    second.citingPapers.map((paper) => paper.id),
  );
  const firstCitingIds = new Set(
    first.citingPapers.map((paper) => paper.id),
  );

  return {
    sharedReferences: [...firstReferences.values()].filter((paper) =>
      secondReferences.has(paper.id),
    ),
    firstOnlyReferences: [...firstReferences.values()].filter(
      (paper) => !secondReferences.has(paper.id),
    ),
    secondOnlyReferences: [...secondReferences.values()].filter(
      (paper) => !firstReferences.has(paper.id),
    ),
    commonCitingPapers: first.citingPapers.filter((paper) =>
      secondCitingIds.has(paper.id),
    ),
    directRelationships: [
      ...(firstReferences.has(second.paper.id) ||
      secondCitingIds.has(first.paper.id)
        ? [`${first.paper.title} cites ${second.paper.title}`]
        : []),
      ...(secondReferences.has(first.paper.id) ||
      firstCitingIds.has(second.paper.id)
        ? [`${second.paper.title} cites ${first.paper.title}`]
        : []),
    ],
  };
}
