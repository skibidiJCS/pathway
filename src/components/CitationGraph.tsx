"use client";

import { useEffect, useRef } from "react";
import type { Core, ElementDefinition } from "cytoscape";
import type { CitationGraphData, Paper } from "../../lib/research-types";

interface CitationGraphProps {
  graph: CitationGraphData;
  visibleNodes: Paper[];
  onSelect: (paper: Paper) => void;
}

function shortLabel(title: string): string {
  return title.length > 46 ? `${title.slice(0, 45)}…` : title;
}

export function CitationGraph({
  graph,
  visibleNodes,
  onSelect,
}: CitationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cy: Core | undefined;
    let cancelled = false;

    const render = async () => {
      const { default: cytoscape } = await import("cytoscape");
      if (cancelled || !containerRef.current) return;

      const references = visibleNodes.filter(
        (paper) => paper.relation === "reference" || paper.relation === "both",
      );
      const citing = visibleNodes.filter(
        (paper) => paper.relation === "citing" || paper.relation === "both",
      );
      const positions = new Map<string, { x: number; y: number }>();
      positions.set(graph.centerId, { x: 0, y: 0 });

      const placeGroup = (papers: Paper[], side: "left" | "right") => {
        const columns = papers.length > 6 ? 2 : 1;
        const rows = Math.ceil(papers.length / columns);
        const spacing = 70;
        const start = -((rows - 1) * spacing) / 2;
        const xPositions =
          side === "left"
            ? columns === 2
              ? [-445, -255]
              : [-340]
            : columns === 2
              ? [255, 445]
              : [340];

        papers.forEach((paper, index) => {
          if (!positions.has(paper.id)) {
            positions.set(paper.id, {
              x: xPositions[index % columns],
              y: start + Math.floor(index / columns) * spacing,
            });
          }
        });
      };

      placeGroup(references, "left");
      placeGroup(citing, "right");

      const elements: ElementDefinition[] = visibleNodes.map((paper) => ({
        data: {
          id: paper.id,
          label: shortLabel(paper.title),
          relation: paper.relation,
          citations: paper.citationCount,
          paper,
        },
        position: positions.get(paper.id) ?? { x: 0, y: 0 },
      }));

      cy = cytoscape({
        container: containerRef.current,
        elements,
        layout: { name: "preset", fit: true, padding: 110 },
        minZoom: 0.35,
        maxZoom: 1.15,
        userZoomingEnabled: false,
        userPanningEnabled: false,
        boxSelectionEnabled: false,
        autoungrabify: true,
        style: [
          {
            selector: "node",
            style: {
              width: 172,
              height: 54,
              shape: "round-rectangle",
              "background-color": "#ffffff",
              "border-width": 1.5,
              "border-color": "#9aa5b1",
              label: "data(label)",
              color: "#1d2733",
              "font-size": 9.5,
              "font-family": "Inter, system-ui, sans-serif",
              "font-weight": 600,
              "text-wrap": "wrap",
              "text-max-width": "148px",
              "text-valign": "center",
              "text-halign": "center",
              "overlay-opacity": 0,
            },
          },
          {
            selector: 'node[relation = "selected"]',
            style: {
              "background-color": "#6746a5",
              "border-color": "#513384",
              width: 212,
              height: 66,
              color: "#ffffff",
              "font-size": 11,
              "font-weight": 700,
            },
          },
          {
            selector: 'node[relation = "reference"]',
            style: {
              "background-color": "#edf4fd",
              "border-color": "#5683bf",
            },
          },
          {
            selector: 'node[relation = "citing"]',
            style: {
              "background-color": "#fff2df",
              "border-color": "#c48235",
            },
          },
          {
            selector: 'node[relation = "both"]',
            style: {
              "background-color": "#eee9f8",
              "border-color": "#7959ad",
            },
          },
          {
            selector: "node:selected",
            style: {
              "border-width": 3,
              "border-color": "#18202b",
            },
          },
        ],
      });

      cy.on("tap", "node", (event) => {
        const paper = event.target.data("paper") as Paper;
        onSelectRef.current(paper);
      });

      const observer = new ResizeObserver(() => {
        cy?.resize();
        cy?.fit(undefined, 110);
      });
      observer.observe(containerRef.current);
      cy.one("destroy", () => observer.disconnect());
    };

    void render();
    return () => {
      cancelled = true;
      cy?.destroy();
    };
  }, [graph, visibleNodes]);

  return (
    <>
      <div className="graph-zone reference" aria-hidden="true" />
      <div className="graph-zone citing" aria-hidden="true" />
      <div className="graph-group-headings" aria-hidden="true">
        <div className="graph-group-heading reference">
          <strong>{referencesLabel(visibleNodes)}</strong>
          <span>The selected paper cites these</span>
        </div>
        <div className="graph-group-heading selected">Selected paper</div>
        <div className="graph-group-heading citing">
          <strong>{citingLabel(visibleNodes)}</strong>
          <span>These papers cite the selected paper</span>
        </div>
      </div>
      <div
        ref={containerRef}
        className="graph-container"
        role="img"
        aria-label={`Citation map with ${relationCount(visibleNodes, "reference")} references that the selected paper cites and ${relationCount(visibleNodes, "citing")} papers that cite the selected paper.`}
      />
    </>
  );
}

function relationCount(
  papers: Paper[],
  relation: "reference" | "citing",
): number {
  return papers.filter(
    (paper) => paper.relation === relation || paper.relation === "both",
  ).length;
}

function referencesLabel(papers: Paper[]): string {
  const count = relationCount(papers, "reference");
  return count === 0
    ? "No indexed references"
    : `${count} ${count === 1 ? "reference" : "references"}`;
}

function citingLabel(papers: Paper[]): string {
  const count = relationCount(papers, "citing");
  return count === 0
    ? "No citing papers found"
    : `${count} citing ${count === 1 ? "paper" : "papers"}`;
}
