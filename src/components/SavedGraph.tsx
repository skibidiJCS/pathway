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

function paperNodeLabel(paper: Paper): string {
  const authors =
    paper.authors.length === 0
      ? "Unknown authors"
      : `${paper.authors.slice(0, 2).join(", ")}${paper.authors.length > 2 ? " et al." : ""}`;
  return [
    compactTitle(paper.title, 70),
    "",
    compactTitle(authors, 42),
    String(paper.year ?? "Year unknown"),
  ].join("\n");
}

function relationshipLabel(
  relationship: SavedRelationship,
  papers: Map<string, Paper>,
): string {
  const source = papers.get(relationship.source)?.title ?? relationship.source;
  const target = papers.get(relationship.target)?.title ?? relationship.target;
  return `${compactTitle(source, 35)} — ${compactTitle(target, 35)}`;
}

function graphStyles(theme: "light" | "dark"): cytoscape.StylesheetJson {
  const dark = theme === "dark";
  const paper = dark ? "#151f2b" : "#ffffff";
  const paperSelected = dark ? "#1a2531" : "#f2f4f6";
  const edge = dark ? "#687586" : "#9099a4";
  const blue = dark ? "#8aa7c4" : "#3f6489";
  const border = dark ? "#526173" : "#b7c0ca";
  const selected = dark ? "#c49a6b" : "#94602d";
  const transition =
    "background-color, border-color, border-width, color, height, line-color, opacity, source-arrow-color, target-arrow-color, width";

  return [
    {
      selector: "node",
      style: {
        "background-color": paper,
        "border-color": border,
        "border-width": 1,
        color: blue,
        "font-family": 'Georgia, "Times New Roman", serif',
        "font-size": 10,
        "font-weight": 500,
        height: 167,
        label: "data(label)",
        "line-height": 1.25,
        shape: "rectangle",
        "text-halign": "center",
        "text-max-width": "96px",
        "text-valign": "center",
        "text-wrap": "wrap",
        "transition-duration": 360,
        "transition-property": transition,
        "transition-timing-function": "ease-in-out",
        width: 118,
      },
    },
    {
      selector: "node:selected",
      style: {
        "background-color": paperSelected,
        "border-color": selected,
        "border-width": 2,
        height: 173,
        width: 122,
      },
    },
    {
      selector: "node:active",
      style: {
        opacity: 0.78,
      },
    },
    {
      selector: "edge",
      style: {
        "curve-style": "bezier",
        "line-color": edge,
        "line-style": "solid",
        "target-arrow-color": blue,
        "transition-duration": 360,
        "transition-property": transition,
        "transition-timing-function": "ease-in-out",
        width: 1.5,
      },
    },
    {
      selector: 'edge[kind = "overlap"]',
      style: {
        "line-style": "dashed",
      },
    },
    {
      selector: 'edge[kind = "content"]',
      style: {
        "line-color": dark ? "#6f879f" : "#8095a9",
        "line-style": "dotted",
        width: 1.25,
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
        "source-arrow-color": blue,
        "source-arrow-shape": "triangle",
        "target-arrow-shape": "triangle",
      },
    },
    {
      selector: "edge:selected",
      style: {
        "line-color": selected,
        "source-arrow-color": selected,
        "target-arrow-color": selected,
        width: 3,
      },
    },
  ];
}

export function SavedGraph({
  collection,
  selectedIds,
  theme,
  onExplore,
}: SavedGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<cytoscape.Core | null>(null);
  const themeRef = useRef(theme);
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
  themeRef.current = theme;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || graph.papers.length < 2) return undefined;
    let disposed = false;
    let instance: cytoscape.Core | null = null;
    let observer: ResizeObserver | null = null;

    void import("cytoscape").then(({ default: createGraph }) => {
      if (disposed || !containerRef.current) return;
      instance = createGraph({
        container,
        elements: [
          ...graph.papers.map((paper) => ({
            data: {
              id: paper.id,
              label: paperNodeLabel(paper),
            },
          })),
          ...graph.relationships.map((relationship) => ({
            data: {
              id: relationship.id,
              source: relationship.source,
              target: relationship.target,
              direction: relationship.direction,
              kind: relationship.kind,
            },
          })),
        ],
        style: graphStyles(themeRef.current),
        layout:
          graph.relationships.length > 0
            ? {
                name: "cose",
                animate: false,
                componentSpacing: 110,
                idealEdgeLength: 210,
                nodeDimensionsIncludeLabels: true,
                nodeRepulsion: 360000,
                padding: 48,
                randomize: true,
              }
            : {
                name: "grid",
                avoidOverlap: true,
                condense: false,
                padding: 48,
        },
        minZoom: 0.35,
        maxZoom: 1.25,
      });
      graphRef.current = instance;
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
      if (graphRef.current === instance) graphRef.current = null;
    };
  }, [graph]);

  useEffect(() => {
    const instance = graphRef.current;
    if (!instance) return;
    instance.style().fromJson(graphStyles(theme)).update();
  }, [theme]);

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
              Their stored citation neighborhoods and OpenAlex topics do not
              overlap.
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
