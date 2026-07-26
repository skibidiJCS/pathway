import type { FormEventHandler } from "react";
import type {
  CitationGraphData,
  Paper,
} from "../../../lib/research-types";
import {
  GRAPH_PAPER_LIMIT,
  SEARCH_RESULT_LIMIT,
} from "../../app/config";

interface SearchPanelProps {
  query: string;
  searching: boolean;
  results: Paper[] | null;
  matchedAuthor: string;
  searchError: string;
  graph: CitationGraphData | null;
  minYear: string;
  openAccessOnly: boolean;
  compactPlaceholder: boolean;
  history: Paper[];
  onSearch: FormEventHandler<HTMLFormElement>;
  onQueryChange: (query: string) => void;
  onMinYearChange: (year: string) => void;
  onOpenAccessChange: (enabled: boolean) => void;
  onSelectPaper: (paper: Paper) => void;
}

function resultMeta(paper: Paper): string {
  const authors =
    paper.authors.length > 0
      ? paper.authors.slice(0, 3).join(", ")
      : "Unknown authors";
  return `${authors} · ${paper.year ?? "Year unknown"} · ${paper.citationCount.toLocaleString()} citations`;
}

function compactHistoryTitle(title: string): string {
  return title.length <= 44 ? title : `${title.slice(0, 43)}…`;
}

export function SearchPanel({
  query,
  searching,
  results,
  matchedAuthor,
  searchError,
  graph,
  minYear,
  openAccessOnly,
  compactPlaceholder,
  history,
  onSearch,
  onQueryChange,
  onMinYearChange,
  onOpenAccessChange,
  onSelectPaper,
}: SearchPanelProps) {
  return (
    <section className="search-region" aria-label="Paper search">
      <form className="search-row" onSubmit={onSearch}>
        <div className="search-field">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            className="search-input"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={
              compactPlaceholder
                ? "Title, DOI, keyword"
                : "Title, DOI, keyword or author"
            }
            aria-label="Paper title, DOI, keyword or full author name"
            autoComplete="off"
          />
          {query ? (
            <button
              className="input-clear search-clear"
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>
        <button className="search-button" type="submit" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      <div className="search-meta-row">
        <div
          className={`search-note${searchError ? " error-text" : ""}`}
          role={searchError ? "alert" : "status"}
          aria-live="polite"
        >
          {searchError ||
            `Up to ${SEARCH_RESULT_LIMIT} results · each graph is limited to ${GRAPH_PAPER_LIMIT} papers`}
        </div>
        {graph ? (
          <div className="filters" aria-label="Graph filters">
            <div className="filter-fields">
              <div className="year-field">
                <input
                  className="filter-input year-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={minYear}
                  onChange={(event) =>
                    onMinYearChange(
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  placeholder="Publication year"
                  aria-label="Filter papers published from this year"
                />
                {minYear ? (
                  <button
                    className="input-clear year-clear"
                    type="button"
                    onClick={() => onMinYearChange("")}
                    aria-label="Clear publication year"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <label className="oa-filter">
                <input
                  type="checkbox"
                  checked={openAccessOnly}
                  onChange={(event) =>
                    onOpenAccessChange(event.target.checked)
                  }
                />
                <span>Open access only</span>
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {graph && history.length > 0 ? (
        <nav className="exploration-history" aria-label="Exploration history">
          <span>History</span>
          <div>
            {history.map((paper) => (
              <button
                key={paper.id}
                type="button"
                className={paper.id === graph.centerId ? "active" : ""}
                onClick={() => onSelectPaper(paper)}
                aria-current={
                  paper.id === graph.centerId ? "page" : undefined
                }
                title={paper.title}
              >
                {compactHistoryTitle(paper.title)}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      {results ? (
        <div className="search-results" aria-live="polite">
          {matchedAuthor && results.length > 0 ? (
            <div className="results-context">Papers by {matchedAuthor}</div>
          ) : null}
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
                onClick={() => onSelectPaper(paper)}
              >
                <span className="result-title">{paper.title}</span>
                <span className="result-meta">{resultMeta(paper)}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
