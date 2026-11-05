import { Search, X } from "lucide-react";
import type { FormEventHandler } from "react";
import type {
  CitationGraphData,
  Paper,
} from "../../../lib/research-types";
import { SEARCH_RESULT_LIMIT } from "../../app/config";

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
  onSearch: FormEventHandler<HTMLFormElement>;
  onQueryChange: (query: string) => void;
  onDismissResults: () => void;
  onMinYearChange: (year: string) => void;
  onOpenAccessChange: (enabled: boolean) => void;
  onSelectPaper: (paper: Paper) => void;
}

function resultAuthors(paper: Paper): string {
  if (paper.authors.length === 0) return "Unknown authors";
  const shown = paper.authors.slice(0, 3).join(", ");
  return paper.authors.length > 3 ? `${shown} et al.` : shown;
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
  onSearch,
  onQueryChange,
  onDismissResults,
  onMinYearChange,
  onOpenAccessChange,
  onSelectPaper,
}: SearchPanelProps) {
  return (
    <section
      className="search-region"
      aria-label="Paper search"
      onKeyDown={(event) => {
        if (event.key === "Escape" && results) onDismissResults();
      }}
    >
      <div className="search-bar">
        <form className="search-row" onSubmit={onSearch} role="search">
          <div className="search-field">
            <Search
              className="search-icon"
              size={16}
              strokeWidth={1.5}
              aria-hidden
            />
            <input
              className="search-input"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={
                compactPlaceholder
                  ? "Title, DOI or author"
                  : "Title, DOI, keyword or author"
              }
              aria-label="Paper title, DOI, keyword or full author name"
              autoComplete="off"
            />
            {query ? (
              <button
                className="input-clear"
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={1.5} aria-hidden />
              </button>
            ) : null}
          </div>
          <button className="button primary search-button" type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {graph ? (
          <div className="filters" aria-label="Citation filters">
            <label className="year-field">
              <span>From</span>
              <input
                className="filter-input year-input tabular"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={minYear}
                onChange={(event) =>
                  onMinYearChange(
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                placeholder="Year"
                aria-label="Show papers published from this year"
              />
              {minYear ? (
                <button
                  className="input-clear"
                  type="button"
                  onClick={() => onMinYearChange("")}
                  aria-label="Clear publication year"
                >
                  <X size={14} strokeWidth={1.5} aria-hidden />
                </button>
              ) : null}
            </label>
            <label className="oa-filter">
              <input
                type="checkbox"
                checked={openAccessOnly}
                onChange={(event) => onOpenAccessChange(event.target.checked)}
              />
              <span>Open access only</span>
            </label>
          </div>
        ) : null}
      </div>

      {searchError && !results ? (
        <p className="search-error" role="alert">
          {searchError}
        </p>
      ) : null}

      {results ? (
        <div className="search-results" aria-live="polite">
          <div className="results-header">
            <span>
              {matchedAuthor && results.length > 0
                ? `Papers by ${matchedAuthor}`
                : results.length === 0
                  ? "No matches"
                  : results.length >= SEARCH_RESULT_LIMIT
                    ? `Top ${results.length} results`
                    : `${results.length} result${results.length === 1 ? "" : "s"}`}
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={onDismissResults}
              aria-label="Close results"
            >
              <X size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          {results.length === 0 ? (
            <p className="result-empty">
              {searchError || "No papers matched that search"}
            </p>
          ) : (
            <ul className="result-list">
              {results.map((paper) => (
                <li key={paper.id}>
                  <button
                    className="result-button"
                    type="button"
                    onClick={() => onSelectPaper(paper)}
                  >
                    <span className="result-title">{paper.title}</span>
                    <span className="result-meta">
                      <span>{resultAuthors(paper)}</span>
                      <span className="tabular">
                        {paper.year ?? "n.d."} ·{" "}
                        {paper.citationCount.toLocaleString()} citations
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
