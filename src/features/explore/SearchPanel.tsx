import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useRef, type FormEventHandler, type ReactNode } from "react";
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
  accessory?: ReactNode;
  onSearch: FormEventHandler<HTMLFormElement>;
  onQueryChange: (query: string) => void;
  onDismissResults: () => void;
  onMinYearChange: (year: string) => void;
  onOpenAccessChange: (enabled: boolean) => void;
  onSelectPaper: (paper: Paper) => void;
}

/**
 * Mirrors how the OpenAlex proxy routes a query, so the field can say what
 * it is about to do before the search runs.
 */
function queryKind(query: string): string {
  const trimmed = query.trim();
  if (trimmed.length < 3) return "";
  const doi = trimmed
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  if (/^10\.\d{4,9}\/\S+$/i.test(doi)) return "DOI lookup";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (
    words.length >= 2 &&
    words.length <= 6 &&
    trimmed.length <= 90 &&
    !/\d/.test(trimmed)
  ) {
    return "Author or title";
  }
  return "Title or keyword";
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
  accessory,
  onSearch,
  onQueryChange,
  onDismissResults,
  onMinYearChange,
  onOpenAccessChange,
  onSelectPaper,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const kind = queryKind(query);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

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
          <label className="search-field">
            <Search className="search-icon" size={18} strokeWidth={1.5} aria-hidden />
            <input
              ref={inputRef}
              className="search-input"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={
                compactPlaceholder
                  ? "Title, DOI or author"
                  : "Search by title, DOI, keyword or author"
              }
              aria-label="Paper title, DOI, keyword or full author name"
              aria-describedby="search-kind"
              autoComplete="off"
              spellCheck={false}
            />
            <span id="search-kind" className="search-kind" aria-live="polite">
              {kind}
            </span>
            {query ? (
              <button
                className="input-clear"
                type="button"
                onClick={() => {
                  onQueryChange("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={16} strokeWidth={1.5} aria-hidden />
              </button>
            ) : null}
          </label>
          <button
            className="search-submit"
            type="submit"
            disabled={searching}
            aria-label="Search"
          >
            {searching ? (
              "Searching…"
            ) : (
              <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
            )}
          </button>
        </form>

        {graph ? (
          <div className="filters" aria-label="Citation filters">
            <label className="year-field">
              <span>From</span>
              <input
                className="year-input tabular"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={minYear}
                onChange={(event) =>
                  onMinYearChange(
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                placeholder="year"
                aria-label="Show papers published from this year"
              />
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

        {accessory ? <div className="search-accessory">{accessory}</div> : null}
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
                    <span className="meta-row">
                      <span>{resultAuthors(paper)}</span>
                      <span className="tabular">{paper.year ?? "Year unknown"}</span>
                      <span className="tabular">
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
