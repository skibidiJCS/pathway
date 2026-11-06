import { useMemo } from "react";
import type { Paper } from "../../../lib/research-types";

const STEP = 12; // vertical distance between stacked squares
const AXIS_GAP = 14; // space between the axis and the first square

interface Placed {
  paper: Paper;
  year: number;
  level: number;
  group: "reference" | "citing";
}

function stack(papers: Paper[], group: Placed["group"]): Placed[] {
  const levels = new Map<number, number>();
  return papers
    .filter((paper): paper is Paper & { year: number } => paper.year !== null)
    .sort((a, b) => b.citationCount - a.citationCount)
    .map((paper) => {
      const level = levels.get(paper.year) ?? 0;
      levels.set(paper.year, level + 1);
      return { paper, year: paper.year, level, group };
    });
}

function tickStep(span: number): number {
  if (span <= 12) return 2;
  if (span <= 30) return 5;
  if (span <= 80) return 10;
  return 20;
}

/**
 * Every paper in the neighborhood on one year axis. What the paper builds on
 * sits above the line, what was built on it below, the paper itself is the
 * ink rule. Each square opens that paper.
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
    const above = stack(references, "reference");
    const below = stack(citing, "citing");
    const years = [...above, ...below].map((item) => item.year);
    if (center.year !== null) years.push(center.year);
    if (years.length === 0) return null;
    const min = Math.min(...years) - 1;
    const max = Math.max(...years) + 1;
    const span = Math.max(max - min, 1);
    const maxAbove = above.reduce((m, item) => Math.max(m, item.level + 1), 0);
    const maxBelow = below.reduce((m, item) => Math.max(m, item.level + 1), 0);
    const step = tickStep(span);
    const ticks: number[] = [];
    for (let year = Math.ceil(min / step) * step; year <= max; year += step) {
      ticks.push(year);
    }
    return {
      items: [...above, ...below],
      min,
      span,
      ticks,
      axisTop: AXIS_GAP + Math.max(maxAbove, 1) * STEP + 4,
      height:
        AXIS_GAP * 2 + (Math.max(maxAbove, 1) + Math.max(maxBelow, 1)) * STEP + 32,
    };
  }, [center.year, citing, references]);

  if (!layout) return null;
  const x = (year: number) => `${((year - layout.min) / layout.span) * 100}%`;
  const undated =
    references.filter((p) => p.year === null).length +
    citing.filter((p) => p.year === null).length;

  return (
    <figure className="timeline">
      <figcaption className="timeline-legend">
        <span>
          <i className="timeline-key reference" aria-hidden /> Builds on{" "}
          <span className="tabular">{references.length}</span>
        </span>
        <span>
          <i className="timeline-key citing" aria-hidden /> Built upon by{" "}
          <span className="tabular">{citing.length}</span>
        </span>
        {undated ? <span className="tabular">{undated} without a year</span> : null}
      </figcaption>
      <div className="timeline-plot" style={{ height: layout.height }}>
        <div className="timeline-axis" style={{ top: layout.axisTop }} />
        {layout.ticks.map((year) => (
          <span
            key={year}
            className="timeline-tick tabular"
            style={{ left: x(year), top: layout.height - 18 }}
          >
            {year}
          </span>
        ))}
        {center.year !== null ? (
          <span
            className="timeline-center"
            style={{ left: x(center.year), height: layout.height - 22 }}
            title={`${center.title}, ${center.year}`}
          >
            <span className="timeline-center-label tabular">{center.year}</span>
          </span>
        ) : null}
        {layout.items.map((item) => {
          const top =
            item.group === "reference"
              ? layout.axisTop - AXIS_GAP - item.level * STEP
              : layout.axisTop + AXIS_GAP - 8 + item.level * STEP;
          return (
            <button
              key={`${item.group}-${item.paper.id}`}
              type="button"
              className={`timeline-paper ${item.group}${
                item.paper.id === selectedId ? " active" : ""
              }`}
              style={{ left: x(item.year), top }}
              onClick={() => onSelect(item.paper)}
              title={`${item.paper.title}, ${item.year}`}
              aria-label={`${item.paper.title}, ${item.year}`}
            />
          );
        })}
      </div>
    </figure>
  );
}
