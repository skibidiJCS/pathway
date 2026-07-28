import type { SavedPaper } from "../research-types";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function collectionToCsv(collection: SavedPaper[]): string {
  const rows = [
    [
      "OpenAlex ID",
      "Title",
      "Authors",
      "Year",
      "Source",
      "Citations",
      "Open access",
      "DOI",
      "Status",
      "Folder",
      "Tags",
      "Notes",
    ],
    ...collection.map((entry) => [
      entry.paper.id,
      entry.paper.title,
      entry.paper.authors.join("; "),
      entry.paper.year ?? "",
      entry.paper.source ?? "",
      entry.paper.citationCount,
      entry.paper.isOpenAccess ? "Yes" : "No",
      entry.paper.doi ?? "",
      entry.status,
      entry.folder ?? "",
      entry.tags.join("; "),
      entry.note,
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function bibtexValue(value: string): string {
  return value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("&", "\\&");
}

export function collectionToBibtex(collection: SavedPaper[]): string {
  return collection
    .map((entry, index) => {
      const firstAuthor =
        entry.paper.authors[0]?.split(/\s+/).at(-1) ?? "paper";
      const key = `${firstAuthor.replace(/[^a-z0-9]/gi, "") || "paper"}${entry.paper.year ?? "nd"}${index + 1}`;
      const fields = [
        `  title = {${bibtexValue(entry.paper.title)}}`,
        entry.paper.authors.length
          ? `  author = {${bibtexValue(entry.paper.authors.join(" and "))}}`
          : null,
        entry.paper.year ? `  year = {${entry.paper.year}}` : null,
        entry.paper.source
          ? `  journal = {${bibtexValue(entry.paper.source)}}`
          : null,
        entry.paper.doi
          ? `  doi = {${entry.paper.doi.replace(/^https?:\/\/doi\.org\//i, "")}}`
          : null,
        `  url = {${entry.paper.doi ?? entry.paper.url}}`,
      ].filter((field): field is string => Boolean(field));
      return `@article{${key},\n${fields.join(",\n")}\n}`;
    })
    .join("\n\n");
}
