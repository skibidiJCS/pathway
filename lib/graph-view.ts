import type { Paper } from "./research-types";

export type PaperSort = "relevance" | "newest" | "oldest" | "most-cited";

function sharedTopicCount(paper: Paper, center: Paper): number {
  const centerTopics = new Set(
    center.topics.map((topic) => topic.trim().toLocaleLowerCase()),
  );
  return paper.topics.reduce(
    (count, topic) =>
      count + (centerTopics.has(topic.trim().toLocaleLowerCase()) ? 1 : 0),
    0,
  );
}

export function sortCitationPapers(
  papers: Paper[],
  sort: PaperSort,
  center: Paper,
): Paper[] {
  return papers
    .map((paper, index) => ({ paper, index }))
    .sort((first, second) => {
      if (sort === "newest") {
        return (
          (second.paper.year ?? -Infinity) -
            (first.paper.year ?? -Infinity) ||
          second.paper.citationCount - first.paper.citationCount ||
          first.index - second.index
        );
      }
      if (sort === "oldest") {
        const firstYear = first.paper.year ?? Infinity;
        const secondYear = second.paper.year ?? Infinity;
        return (
          firstYear - secondYear ||
          second.paper.citationCount - first.paper.citationCount ||
          first.index - second.index
        );
      }
      if (sort === "most-cited") {
        return (
          second.paper.citationCount - first.paper.citationCount ||
          (second.paper.year ?? 0) - (first.paper.year ?? 0) ||
          first.index - second.index
        );
      }
      return (
        sharedTopicCount(second.paper, center) -
          sharedTopicCount(first.paper, center) ||
        second.paper.citationCount - first.paper.citationCount ||
        first.index - second.index
      );
    })
    .map(({ paper }) => paper);
}
