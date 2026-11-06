import type { Paper } from "../../../lib/research-types";

/** OpenAlex access routes, in words a reader can act on. */
const accessLabels: Record<string, { label: string; hint: string }> = {
  gold: { label: "Open, publisher", hint: "Published open access in an open-access journal" },
  diamond: { label: "Open, no-fee journal", hint: "Open access with no fees for authors or readers" },
  hybrid: { label: "Open, hybrid journal", hint: "Open access article in a subscription journal" },
  bronze: { label: "Free to read", hint: "Free on the publisher site without an open licence" },
  green: { label: "Open, repository copy", hint: "A free copy is held in a repository such as arXiv" },
};

export function accessText(paper: Paper): { label: string; hint: string } {
  if (!paper.isOpenAccess) {
    return { label: "Closed access", hint: "No free copy is listed in OpenAlex" };
  }
  return (
    accessLabels[paper.openAccessStatus?.toLowerCase() ?? ""] ?? {
      label: "Open access",
      hint: "OpenAlex lists a free copy",
    }
  );
}

export function authorsText(authors: string[], max = 6): string {
  if (authors.length === 0) return "Authors unavailable";
  if (authors.length <= max) return authors.join(", ");
  return `${authors.slice(0, max).join(", ")} and ${authors.length - max} more`;
}

export function doiText(doi: string): string {
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
}

export function citationsText(count: number): string {
  return `${count.toLocaleString()} citation${count === 1 ? "" : "s"}`;
}
