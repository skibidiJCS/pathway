"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type cytoscape from "cytoscape";
import {
  buildSavedRelationships,
  type SavedRelationship,
} from "../../lib/collection";
import type { Paper, SavedPaper } from "../../lib/research-types";

interface SavedGraphProps {
  collection: SavedPaper[];
  selectedIds: string[];
  theme: "light" | "dark";
  onExplore: (paper: Paper) => void;
}

function compactTitle(title: string, maxLength = 54): string {
  return title.length <= maxLength ? title : `${title.slice(0, maxLength - 1)}…`;
}

function relationshipLabel(
  relationship: SavedRelationship,
  papers: Map<string, Paper>,
): string {
  const source = papers.get(relationship.source)?.title ?? relationship.source;
  const target = papers.get(relationship.target)?.title ?? relationship.target;
  return `${compactTitle(source, 35)} — ${compactTitle(target, 35)}`;
}

export function SavedGraph({
  collection,
  selectedIds,
  theme,
  onExplore,
}: SavedGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeRelationshipId, setActiveRelationshipId] = useState("");
  const [activePaperId, setActivePaperId] = useState("");
  const graph = useMemo(
    () => buildSavedRelationships(collection, selectedIds),
    [collection, selectedIds],
  );
  const papers = useMemo(
    () => new Map(graph.papers.map((paper) => [paper.id, paper])),
    [graph.papers],
  );
  const activeRelationship =
    graph.relationships.find(
      (relationship) => relationship.id === activeRelationshipId,
    ) ?? graph.relationships[0] ?? null;
  const activePaper = papers.get(activePaperId) ?? null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || graph.papers.length < 2) return undefined;
    let disposed = false;
    let instance: cytoscape.Core | null = null;
    let observer: ResizeObserver | null = null;

    void import("cytoscape").then(({ default: createGraph }) => {
      if (disposed || !containerRef.current) return;
      const dark = theme === "dark";
      instance = createGraph({
        container,
        elements: [
          ...graph.papers.map((paper) => ({
            data: {
              id: paper.id,
              label: compactTitle(paper.title, 34),
            },
          })),
          ...graph.relationships.map((relationship) => ({
            data: {
              id: relationship.id,
              source: relationship.source,
              target: relationship.target,
              direction: relationship.direction,
            },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              "background-color": dark ? "#8aa7c4" : "#3f6489",
              "border-color": dark ? "#d5e0ea" : "#274968",
              "border-width": 1,
              color: dark ? "#eef2f7" : "#18202b",
              "font-size": 9,
              "font-weight": 600,
              height: 35,
              label: "data(label)",
              "text-background-color": dark ? "#111923" : "#ffffff",
              "text-background-opacity": 0.9,
              "text-background-padding": "3px",
              "text-halign": "center",
              "text-margin-y": 28,
              "text-max-width": "110px",
              "text-valign": "bottom",
              "text-wrap": "wrap",
              width: 35,
            },
          },
          {
            selector: "node:selected",
            style: {
              "background-color": dark ? "#c49a6b" : "#94602d",
              "border-width": 2,
            },
          },
          {
            selector: "edge",
            style: {
              "curve-style": "bezier",
              "line-color": dark ? "#687586" : "#9099a4",
              "line-style": "solid",
              "target-arrow-color": dark ? "#8aa7c4" : "#3f6489",
              width: 1.5,
            },
          },
          {
            selector: 'edge[direction = "none"]',
            style: {
              "line-style": "dashed",
            },
          },
          {
            selector: 'edge[direction = "forward"]',
            style: {
              "target-arrow-shape": "triangle",
            },
          },
          {
            selector: 'edge[direction = "both"]',
            style: {
              "source-arrow-color": dark ? "#8aa7c4" : "#3f6489",
              "source-arrow-shape": "triangle",
              "target-arrow-shape": "triangle",
            },
          },
          {
            selector: "edge:selected",
            style: {
              "line-color": dark ? "#c49a6b" : "#94602d",
              "source-arrow-color": dark ? "#c49a6b" : "#94602d",
              "target-arrow-color": dark ? "#c49a6b" : "#94602d",
              width: 3,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: false,
          componentSpacing: 80,
          idealEdgeLength: 155,
          nodeRepulsion: 120000,
          padding: 42,
          randomize: true,
        },
        minZoom: 0.35,
        maxZoom: 2.2,
      });
      instance.on("tap", "edge", (event) => {
        setActivePaperId("");
        setActiveRelationshipId(event.target.id());
      });
      instance.on("tap", "node", (event) => {
        setActiveRelationshipId("");
        setActivePaperId(event.target.id());
      });
      observer = new ResizeObserver(() => {
        instance?.resize();
        instance?.fit(undefined, 36);
      });
      observer.observe(container);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      instance?.destroy();
    };
  }, [graph, theme]);

  if (graph.papers.length < 2) {
    return (
      <p className="saved-map-empty">
        Select at least two papers to map their relationships.
      </p>
    );
  }

  return (
    <div className="saved-graph-layout">
      <div
        className="saved-graph-canvas"
        ref={containerRef}
        aria-label={`Relationship graph with ${graph.papers.length} papers and ${graph.relationships.length} links`}
      />
      <aside className="saved-graph-explanation">
        {activePaper ? (
          <>
            <span className="saved-map-kicker">Selected paper</span>
            <h3>{activePaper.title}</h3>
            <p>
              {activePaper.year ?? "Year unknown"} ·{" "}
              {activePaper.citationCount.toLocaleString()} citations
            </p>
            <button type="button" onClick={() => onExplore(activePaper)}>
              Explore paper
            </button>
          </>
        ) : activeRelationship ? (
          <>
            <span className="saved-map-kicker">Why they connect</span>
            <h3>{relationshipLabel(activeRelationship, papers)}</h3>
            <ul>
              {activeRelationship.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <span className="saved-map-kicker">No links found</span>
            <h3>The selected papers are disconnected.</h3>
            <p>
              Their stored references and citing-paper lists do not overlap.
            </p>
          </>
        )}
        <div className="saved-relationship-list">
          <span>
            {graph.relationships.length} connection
            {graph.relationships.length === 1 ? "" : "s"}
          </span>
          {graph.relationships.map((relationship) => (
            <button
              key={relationship.id}
              type="button"
              className={
                relationship.id === activeRelationship?.id &&
                !activePaper
                  ? "active"
                  : ""
              }
              onClick={() => {
                setActivePaperId("");
                setActiveRelationshipId(relationship.id);
              }}
            >
              {relationshipLabel(relationship, papers)}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
