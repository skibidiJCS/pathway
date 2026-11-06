import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  sortCitationPapers,
  type PaperSort,
} from "../../../lib/graph-view";
import type { CitationGraphData, Paper } from "../../../lib/research-types";

type Relation = "reference" | "citing";

interface CitationGraphProps {
  graph: CitationGraphData;
  visibleNodes: Paper[];
  selectedId: string;
  onSelect: (paper: Paper) => void;
}

function relationPapers(papers: Paper[], relation: Relation): Paper[] {
  return papers.filter(
    (paper) => paper.relation === relation || paper.relation === "both",
  );
}

/** Log scale, so one landmark paper does not flatten every other bar. */
function citationWeight(count: number, max: number): number {
  if (max <= 0) return 0;
  return Math.log10(count + 1) / Math.log10(max + 1);
}

interface PaperRowProps {
  paper: Paper;
  active: boolean;
  weight: number;
  onSelect: (paper: Paper) => void;
}

function PaperRow({ paper, active, weight, onSelect }: PaperRowProps) {
  return (
    <li>
      <button
        className={`paper-row${active ? " active" : ""}`}
        type="button"
        onClick={() => onSelect(paper)}
        aria-pressed={active}
      >
        <span className="paper-row-title">{paper.title}</span>
        <span className="meta-row tabular">
          <span>{paper.year ?? "Year unknown"}</span>
          <span>{paper.citationCount.toLocaleString()} citations</span>
          {paper.relation === "both" ? (
            <span className="mutual">Cites each other</span>
          ) : null}
        </span>
        <span className="citation-bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${weight.toFixed(3)})` }} />
        </span>
      </button>
    </li>
  );
}

interface PaperGroupProps {
  papers: Paper[];
  relation: Relation;
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
  const maxCitations = useMemo(
    () => papers.reduce((max, paper) => Math.max(max, paper.citationCount), 0),
    [papers],
  );
  const Icon = isReference ? ArrowDownLeft : ArrowUpRight;

  return (
    <section
      className={`paper-group ${relation}${papers.length === 0 ? " empty" : ""}`}
      aria-label={isReference ? "References" : "Cited by"}
    >
      <header className="paper-group-heading">
        <div className="paper-group-title">
          <h2>
            <Icon size={16} strokeWidth={1.5} aria-hidden />
            {isReference ? "References" : "Cited by"}
            <span className="count tabular">{papers.length}</span>
          </h2>
        </div>
        <select
          className="compact-select"
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
        <ol className="paper-list">
          {papers.map((paper) => (
            <PaperRow
              key={`${relation}-${paper.id}`}
              paper={paper}
              active={paper.id === selectedId}
              weight={citationWeight(paper.citationCount, maxCitations)}
              onSelect={onSelect}
            />
          ))}
        </ol>
      ) : (
        <p className="paper-group-empty">
          {isReference
            ? "OpenAlex lists no references for this paper, or the filters hide them"
            : "OpenAlex lists no citing papers yet, or the filters hide them"}
        </p>
      )}
    </section>
  );
}

export function CitationGraph({
  graph,
  visibleNodes,
  selectedId,
  onSelect,
}: CitationGraphProps) {
  const [referenceSort, setReferenceSort] = useState<PaperSort>("relevance");
  const [citingSort, setCitingSort] = useState<PaperSort>("relevance");
  const [mobileTab, setMobileTab] = useState<Relation>("reference");
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
    setMobileTab("reference");
  }, [graph.centerId]);

  return (
    <div
      className={`citation-map show-${mobileTab}`}
      aria-label={`${references.length} references and ${citing.length} citing papers`}
    >
      {selected ? (
        <header className="center-paper">
          <button
            className={`center-title${selected.id === selectedId ? " active" : ""}`}
            type="button"
            onClick={() => onSelect(selected)}
            aria-pressed={selected.id === selectedId}
          >
            {selected.title}
          </button>
          <span className="meta-row tabular">
            <span>{selected.year ?? "Year unknown"}</span>
            <span>{selected.citationCount.toLocaleString()} citations</span>
            {visibleNodes.length < graph.nodes.length ? (
              <span>
                {visibleNodes.length} of {graph.nodes.length} shown
              </span>
            ) : null}
          </span>
        </header>
      ) : null}

      <div className="relation-tabs" role="tablist" aria-label="Citation direction">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "reference"}
          onClick={() => setMobileTab("reference")}
        >
          References <span className="tabular">{references.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "citing"}
          onClick={() => setMobileTab("citing")}
        >
          Cited by <span className="tabular">{citing.length}</span>
        </button>
      </div>

      <div className="relation-columns">
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
    </div>
  );
}
