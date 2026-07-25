"use client";

import { useEffect, useMemo, useState } from "react";
import {
  sortCitationPapers,
  type PaperSort,
} from "../../lib/graph-view";
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
  if (relation === "reference") {
    return `References (${count})`;
  }
  return `Citing papers (${count})`;
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
  sort: PaperSort;
  selectedId: string;
  onSelect: (paper: Paper) => void;
  onSort: (sort: PaperSort) => void;
}

function PaperGroup({
  papers,
  relation,
  sort,
  selectedId,
  onSelect,
  onSort,
}: PaperGroupProps) {
  const isReference = relation === "reference";

  return (
    <section
      className={`paper-group ${relation}${papers.length === 0 ? " empty" : ""}`}
      aria-label={isReference ? "References" : "Citing papers"}
    >
      <header className="paper-group-heading">
        <div>
          <strong>{groupLabel(papers.length, relation)}</strong>
          <span>
            {isReference
              ? "The selected paper cites these"
              : "These papers cite the selected paper"}
          </span>
        </div>
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as PaperSort)}
          aria-label={`Sort ${isReference ? "references" : "citing papers"}`}
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-cited">Most cited</option>
        </select>
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
  const [referenceSort, setReferenceSort] = useState<PaperSort>("relevance");
  const [citingSort, setCitingSort] = useState<PaperSort>("relevance");
  const selected =
    visibleNodes.find((paper) => paper.id === graph.centerId) ??
    graph.nodes.find((paper) => paper.id === graph.centerId) ??
    null;
  const references = useMemo(
    () =>
      selected
        ? sortCitationPapers(
            relationPapers(visibleNodes, "reference"),
            referenceSort,
            selected,
          )
        : [],
    [referenceSort, selected, visibleNodes],
  );
  const citing = useMemo(
    () =>
      selected
        ? sortCitationPapers(
            relationPapers(visibleNodes, "citing"),
            citingSort,
            selected,
          )
        : [],
    [citingSort, selected, visibleNodes],
  );

  useEffect(() => {
    setReferenceSort("relevance");
    setCitingSort("relevance");
  }, [graph.centerId]);
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
      <section className="selected-paper-column" aria-label="Selected paper">
        <span className="selected-paper-label">Selected paper</span>
        {selected ? (
          <button
            className="selected-paper-summary"
            type="button"
            onClick={() => onSelect(selected)}
            aria-pressed={selected.id === selectedId}
            title={selected.title}
          >
            <span className="selected-paper-title">{selected.title}</span>
            <span className="selected-paper-meta">
              {selected.year ?? "Year unknown"} ·{" "}
              {selected.citationCount.toLocaleString()} citations
            </span>
          </button>
        ) : null}
      </section>

      <PaperGroup
        papers={references}
        relation="reference"
        sort={referenceSort}
        selectedId={selectedId}
        onSelect={onSelect}
        onSort={setReferenceSort}
      />

      <PaperGroup
        papers={citing}
        relation="citing"
        sort={citingSort}
        selectedId={selectedId}
        onSelect={onSelect}
        onSort={setCitingSort}
      />
    </div>
  );
}
