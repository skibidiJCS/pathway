"use client";

import type { CitationGraphData, Paper } from "../../lib/research-types";

interface CitationGraphProps {
  graph: CitationGraphData;
  visibleNodes: Paper[];
  selectedId: string;
  theme: "light" | "dark";
  onSelect: (paper: Paper) => void;
}

function relationPapers(
  papers: Paper[],
  relation: "reference" | "citing",
): Paper[] {
  return papers.filter(
    (paper) => paper.relation === relation || paper.relation === "both",
  );
}

function groupLabel(count: number, relation: "reference" | "citing"): string {
  if (count === 0) {
    return relation === "reference"
      ? "No indexed references"
      : "No citing papers found";
  }
  if (relation === "reference") {
    return `${count} ${count === 1 ? "reference" : "references"}`;
  }
  return `${count} citing ${count === 1 ? "paper" : "papers"}`;
}

interface PaperSheetProps {
  paper: Paper;
  active: boolean;
  onSelect: (paper: Paper) => void;
}

function PaperSheet({ paper, active, onSelect }: PaperSheetProps) {
  return (
    <button
      className={`paper-sheet ${paper.relation}${active ? " active" : ""}`}
      type="button"
      onClick={() => onSelect(paper)}
      aria-pressed={active}
      title={paper.title}
    >
      <span className="paper-sheet-title">{paper.title}</span>
      <span className="paper-sheet-meta">
        {paper.year ?? "Year unknown"} ·{" "}
        {paper.citationCount.toLocaleString()} citations
      </span>
      {paper.relation === "both" ? (
        <span className="paper-sheet-relation">Mutual citation</span>
      ) : null}
    </button>
  );
}

interface PaperGroupProps {
  papers: Paper[];
  relation: "reference" | "citing";
  selectedId: string;
  onSelect: (paper: Paper) => void;
}

function PaperGroup({
  papers,
  relation,
  selectedId,
  onSelect,
}: PaperGroupProps) {
  const isReference = relation === "reference";

  return (
    <section
      className={`paper-group ${relation}${papers.length === 0 ? " empty" : ""}`}
      aria-label={isReference ? "References" : "Citing papers"}
    >
      <header className="paper-group-heading">
        <strong>{groupLabel(papers.length, relation)}</strong>
        <span>
          {isReference
            ? "The selected paper cites these"
            : "These papers cite the selected paper"}
        </span>
      </header>
      {papers.length > 0 ? (
        <div className="paper-grid">
          {papers.map((paper) => (
            <PaperSheet
              key={`${relation}-${paper.id}`}
              paper={paper}
              active={paper.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <p className="paper-group-empty">
          No records available from OpenAlex.
        </p>
      )}
    </section>
  );
}

export function CitationGraph({
  graph,
  visibleNodes,
  selectedId,
  theme,
  onSelect,
}: CitationGraphProps) {
  const references = relationPapers(visibleNodes, "reference");
  const citing = relationPapers(visibleNodes, "citing");
  const selected =
    visibleNodes.find((paper) => paper.id === graph.centerId) ??
    graph.nodes.find((paper) => paper.id === graph.centerId) ??
    null;
  const layoutClasses = [
    "citation-map",
    references.length === 0 ? "no-references" : "",
    citing.length === 0 ? "no-citing" : "",
    `theme-${theme}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={layoutClasses}
      aria-label={`Citation map with ${references.length} references that the selected paper cites and ${citing.length} papers that cite the selected paper.`}
    >
      <PaperGroup
        papers={references}
        relation="reference"
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <section className="selected-paper-column" aria-label="Selected paper">
        <span className="selected-paper-label">Selected paper</span>
        {selected ? (
          <PaperSheet
            paper={selected}
            active={selected.id === selectedId}
            onSelect={onSelect}
          />
        ) : null}
        <p className="relationship-summary">
          <span className="reference-text">References</span> are cited by this
          paper. <span className="citing-text">Citing papers</span> cite it.
        </p>
      </section>

      <PaperGroup
        papers={citing}
        relation="citing"
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
