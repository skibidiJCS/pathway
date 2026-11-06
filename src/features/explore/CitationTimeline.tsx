import { useMemo } from "react";
import type { Paper } from "../../../lib/research-types";

const CELL = 8; // height of one paper in a stack
const GAP = 2; // space between papers in a stack
const PAD = 6; // space between the line and the first paper

interface Column {
  year: number;
  cites: Paper[];
  citedBy: Paper[];
}

function tickStep(span: number): number {
  if (span <= 12) return 2;
  if (span <= 30) return 5;
  if (span <= 80) return 10;
  return 20;
}

function byCitations(a: Paper, b: Paper): number {
  return b.citationCount - a.citationCount;
}

/**
 * When the surrounding papers were published. One block per paper, stacked
 * by year: above the line the papers this one cites, below the line the
 * papers that cite it. The labelled rule is the paper itself.
 */
export function CitationTimeline({
  center,
  references,
  citing,
  selectedId,
  onSelect,
}: {
  center: Paper;
  references: Paper[];
  citing: Paper[];
  selectedId: string;
  onSelect: (paper: Paper) => void;
}) {
  const layout = useMemo(() => {
    const years = [...references, ...citing]
      .map((paper) => paper.year)
      .filter((year): year is number => year !== null);
    if (center.year !== null) years.push(center.year);
    if (years.length === 0) return null;
    const min = Math.min(...years);
    const max = Math.max(...years);
    const span = max - min + 1;
    const columns = new Map<number, Column>();
    const column = (year: number) => {
      const existing = columns.get(year);
      if (existing) return existing;
      const created = { year, cites: [], citedBy: [] } as Column;
      columns.set(year, created);
      return created;
    };
    for (const paper of references) {
      if (paper.year !== null) column(paper.year).cites.push(paper);
    }
    for (const paper of citing) {
      if (paper.year !== null) column(paper.year).citedBy.push(paper);
    }
    for (const entry of columns.values()) {
      entry.cites.sort(byCitations);
      entry.citedBy.sort(byCitations);
    }
    const tallest = (key: "cites" | "citedBy") =>
      Math.max(3, ...[...columns.values()].map((entry) => entry[key].length));
    const step = tickStep(span);
    const ticks: number[] = [];
    for (let year = Math.ceil(min / step) * step; year <= max; year += step) {
      ticks.push(year);
    }
    return {
      columns: [...columns.values()],
      min,
      span,
      ticks,
      above: tallest("cites") * (CELL + GAP) + PAD,
      below: tallest("citedBy") * (CELL + GAP) + PAD,
    };
  }, [center.year, citing, references]);

  if (!layout) return null;
  const left = (year: number) => `${((year - layout.min + 0.5) / layout.span) * 100}%`;
  const width = `min(20px, calc(${100 / layout.span}% - 2px))`;
  const undated =
    references.filter((paper) => paper.year === null).length +
    citing.filter((paper) => paper.year === null).length;

  // Blocks grow out of the line from left to right, a beat apart.
  const delay = (year: number, index: number) =>
    `${Math.round(200 + ((year - layout.min) / layout.span) * 500 + index * 25)}ms`;

  const block = (paper: Paper, kind: "cites" | "cited-by", index: number) => (
    <button
      key={paper.id}
      type="button"
      className={`timeline-block ${kind}${paper.id === selectedId ? " active" : ""}`}
      style={
        kind === "cites"
          ? {
              bottom: PAD + index * (CELL + GAP),
              animationDelay: delay(paper.year ?? layout.min, index),
            }
          : {
              top: PAD + index * (CELL + GAP),
              animationDelay: delay(paper.year ?? layout.min, index),
            }
      }
      onClick={() => onSelect(paper)}
      title={`${paper.title}, ${paper.year}`}
      aria-label={`${paper.title}, ${paper.year}`}
    />
  );

  return (
    <figure className="timeline">
      <figcaption className="timeline-caption">
        <span>Each block is one paper, placed by the year it was published</span>
        <span className="timeline-key">
          <span>
            <i className="swatch cites" aria-hidden />
            Papers it cites <b className="tabular">{references.length}</b>
          </span>
          <span>
            <i className="swatch cited-by" aria-hidden />
            Papers citing it <b className="tabular">{citing.length}</b>
          </span>
        </span>
      </figcaption>
      <div className="timeline-chart">
        <div className="timeline-half above" style={{ height: layout.above }}>
          {layout.columns.map((entry) =>
            entry.cites.length ? (
              <div
                key={entry.year}
                className="timeline-column"
                style={{ left: left(entry.year), width }}
              >
                {entry.cites.map((paper, index) => block(paper, "cites", index))}
              </div>
            ) : null,
          )}
        </div>
        <div className="timeline-axis" />
        <div className="timeline-half below" style={{ height: layout.below }}>
          {layout.columns.map((entry) =>
            entry.citedBy.length ? (
              <div
                key={entry.year}
                className="timeline-column"
                style={{ left: left(entry.year), width }}
              >
                {entry.citedBy.map((paper, index) => block(paper, "cited-by", index))}
              </div>
            ) : null,
          )}
        </div>
        {center.year !== null ? (
          <div className="timeline-center" style={{ left: left(center.year) }}>
            <span className="timeline-center-label tabular">
              This paper, {center.year}
            </span>
          </div>
        ) : null}
        <div className="timeline-ticks">
          {layout.ticks.map((year) => (
            <span key={year} className="tabular" style={{ left: left(year) }}>
              {year}
            </span>
          ))}
        </div>
      </div>
      {undated ? (
        <p className="timeline-note tabular">
          {undated} paper{undated === 1 ? " has" : "s have"} no year and{" "}
          {undated === 1 ? "is" : "are"} only in the lists below
        </p>
      ) : null}
    </figure>
  );
}
