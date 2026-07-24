"use client";

import { FormEvent, useMemo, useState } from "react";
import { loadCitationGraph, searchPapers } from "../api-client";
import type {
  CitationGraphData,
  Paper,
} from "../../lib/research-types";
import { CitationGraph } from "./CitationGraph";
import { PaperDetails } from "./PaperDetails";

type LoadState = "idle" | "loading" | "ready" | "error";

function resultMeta(paper: Paper): string {
  const authors =
    paper.authors.length > 0 ? paper.authors.slice(0, 3).join(", ") : "Unknown authors";
  return `${authors} · ${paper.year ?? "Year unknown"} · ${paper.citationCount.toLocaleString()} citations`;
}

export function PathwayApp() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Paper[] | null>(null);
  const [searchError, setSearchError] = useState("");
  const [graph, setGraph] = useState<CitationGraphData | null>(null);
  const [graphState, setGraphState] = useState<LoadState>("idle");
  const [graphError, setGraphError] = useState("");
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [minYear, setMinYear] = useState("");
  const [minCitations, setMinCitations] = useState("");

  const visibleNodes = useMemo(() => {
    if (!graph) return [];
    const year = Number(minYear);
    const citations = Number(minCitations);
    return graph.nodes.filter((paper) => {
      if (paper.id === graph.centerId) return true;
      if (minYear && (paper.year === null || paper.year < year)) return false;
      if (minCitations && paper.citationCount < citations) return false;
      return true;
    });
  }, [graph, minYear, minCitations]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSearchError("Enter at least 3 characters.");
      setResults([]);
      return;
    }

    setSearching(true);
    setSearchError("");
    try {
      const response = await searchPapers(trimmed);
      setResults(response.results.slice(0, 8));
    } catch (error) {
      setResults([]);
      setSearchError(
        error instanceof Error ? error.message : "Search could not be completed.",
      );
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = async (paper: Paper) => {
    setResults(null);
    setGraphState("loading");
    setGraphError("");
    setGraph(null);
    setSelectedPaper(paper);
    setDetailsCollapsed(false);
    setMinYear("");
    setMinCitations("");

    try {
      const nextGraph = await loadCitationGraph(paper.id);
      setGraph(nextGraph);
      setSelectedPaper(
        nextGraph.nodes.find((node) => node.id === nextGraph.centerId) ?? paper,
      );
      setGraphState("ready");
    } catch (error) {
      setGraphError(
        error instanceof Error
          ? error.message
          : "The citation graph could not be loaded.",
      );
      setGraphState("error");
    }
  };

  const selectNode = (paper: Paper) => {
    setSelectedPaper(paper);
    setDetailsCollapsed(false);
  };

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="brand">
          <img
            className="brand-mark"
            src="/pathway-logo.png"
            alt=""
            aria-hidden="true"
          />
          <span className="brand-name">Pathway</span>
          <span className="brand-subtitle">Open citation explorer</span>
        </div>
        <a
          className="source-link"
          href="https://openalex.org"
          target="_blank"
          rel="noreferrer"
        >
          Data by OpenAlex ↗
        </a>
      </header>

      <section className="search-region" aria-label="Paper search">
        <form className="search-row" onSubmit={handleSearch}>
          <div className="search-field">
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              className="search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by paper title or DOI"
              aria-label="Paper title or DOI"
              autoComplete="off"
            />
          </div>
          <button className="search-button" type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
        <div
          className={`search-note${searchError ? " error-text" : ""}`}
          role={searchError ? "alert" : "status"}
          aria-live="polite"
        >
          {searchError ||
            "Up to 8 results · each graph is limited to 25 papers"}
        </div>

        {results ? (
          <div className="search-results" aria-live="polite">
            {results.length === 0 ? (
              <div className="result-empty">
                {searchError || "No papers matched that search."}
              </div>
            ) : (
              results.map((paper) => (
                <button
                  key={paper.id}
                  className="result-button"
                  type="button"
                  onClick={() => void selectSearchResult(paper)}
                >
                  <span className="result-title">{paper.title}</span>
                  <span className="result-meta">{resultMeta(paper)}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section
        className={`workspace${detailsCollapsed ? " details-collapsed" : ""}`}
      >
        <div className="graph-stage">
          <div className="graph-toolbar">
            <div className="legend" aria-label="Graph legend">
              <span className="legend-item">
                <span className="legend-dot selected" />
                Selected paper
              </span>
              <span className="legend-item">
                <span className="legend-dot reference" />
                References · this paper cites
              </span>
              <span className="legend-item">
                <span className="legend-dot citing" />
                Citing papers · cite this paper
              </span>
              <span className="legend-item">
                <span className="legend-dot both" />
                Both
              </span>
              <span className="legend-item">Arrow = cites</span>
            </div>

            {graph ? (
              <div className="filters" aria-label="Graph filters">
                <div className="filter-fields">
                  <label className="filter-label">
                    Year from
                    <input
                      className="filter-input"
                      type="number"
                      inputMode="numeric"
                      min="1000"
                      max="2100"
                      value={minYear}
                      onChange={(event) => setMinYear(event.target.value)}
                      placeholder="Any"
                    />
                  </label>
                  <label className="filter-label">
                    Min. citations
                    <input
                      className="filter-input"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={minCitations}
                      onChange={(event) => setMinCitations(event.target.value)}
                      placeholder="Any"
                    />
                  </label>
                  <button
                    className="clear-filters"
                    type="button"
                    onClick={() => {
                      setMinYear("");
                      setMinCitations("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {graphState === "idle" ? (
            <div className="graph-state">
              <div className="state-mark" aria-hidden="true">
                ↗
              </div>
              <h2>Start with a paper</h2>
              <p>
                Search above, choose one result, and its immediate citation
                neighborhood will appear here.
              </p>
            </div>
          ) : null}

          {graphState === "loading" ? (
            <div className="graph-state" role="status">
              <div className="state-mark">
                <span className="loading-ring" aria-hidden="true" />
              </div>
              <h2>Building citation graph</h2>
              <p>Loading the selected paper, references, and citing papers.</p>
            </div>
          ) : null}

          {graphState === "error" ? (
            <div className="graph-state error" role="alert">
              <div className="state-mark" aria-hidden="true">
                !
              </div>
              <h2>Graph unavailable</h2>
              <p>{graphError}</p>
            </div>
          ) : null}

          {graph && graphState === "ready" ? (
            <>
              <CitationGraph
                graph={graph}
                visibleNodes={visibleNodes}
                onSelect={selectNode}
              />
              <div className="graph-footer">
                Arrow = citing paper → cited paper · showing{" "}
                {visibleNodes.length} of {graph.nodes.length} papers
              </div>
            </>
          ) : null}
        </div>

        <PaperDetails
          paper={selectedPaper}
          collapsed={detailsCollapsed}
          onToggle={() => setDetailsCollapsed((value) => !value)}
        />
      </section>
    </main>
  );
}
