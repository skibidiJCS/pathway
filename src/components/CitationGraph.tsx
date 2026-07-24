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
  return title.length > 40 ? `${title.slice(0, 39)}…` : title;
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

      const visibleIds = new Set(visibleNodes.map((paper) => paper.id));
      const references = visibleNodes.filter(
        (paper) => paper.relation === "reference" || paper.relation === "both",
      );
      const citing = visibleNodes.filter(
        (paper) => paper.relation === "citing" || paper.relation === "both",
      );
      const positions = new Map<string, { x: number; y: number }>();
      positions.set(graph.centerId, { x: 0, y: 0 });

      const placeColumn = (papers: Paper[], x: number) => {
        const spacing = Math.min(92, 560 / Math.max(1, papers.length));
        const start = -((papers.length - 1) * spacing) / 2;
        papers.forEach((paper, index) => {
          if (!positions.has(paper.id)) {
            positions.set(paper.id, { x, y: start + index * spacing });
          }
        });
      };

      placeColumn(references, -310);
      placeColumn(citing, 310);

      const elements: ElementDefinition[] = [
        ...visibleNodes.map((paper) => ({
          data: {
            id: paper.id,
            label: shortLabel(paper.title),
            relation: paper.relation,
            citations: paper.citationCount,
            paper,
          },
          position: positions.get(paper.id) ?? { x: 0, y: 0 },
        })),
        ...graph.edges
          .filter(
            (edge) =>
              visibleIds.has(edge.source) && visibleIds.has(edge.target),
          )
          .map((edge) => ({
            data: {
              id: edge.id,
              source: edge.source,
              target: edge.target,
            },
          })),
      ];

      cy = cytoscape({
        container: containerRef.current,
        elements,
        layout: { name: "preset", fit: true, padding: 85 },
        minZoom: 0.38,
        maxZoom: 2.1,
        wheelSensitivity: 0.18,
        style: [
          {
            selector: "node",
            style: {
              width: 188,
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
              "text-max-width": "162px",
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
              color: "#ffffff",
              "font-size": 10.5,
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
          {
            selector: "edge",
            style: {
              width: 1.3,
              "line-color": "#a8b0ba",
              "target-arrow-color": "#77818d",
              "target-arrow-shape": "triangle",
              "arrow-scale": 0.85,
              "curve-style": "bezier",
              opacity: 0.8,
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
        cy?.fit(undefined, 80);
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
    <div
      ref={containerRef}
      className="graph-container"
      role="img"
      aria-label="Citation graph. Arrows point from the citing paper to the paper it references."
    />
  );
}
