import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useRef, type FormEventHandler } from "react";
import type { Paper } from "../../../lib/research-types";
import { SEARCH_RESULT_LIMIT } from "../../app/config";

interface SearchPanelProps {
  variant: "hero" | "bar";
  query: string;
  searching: boolean;
  results: Paper[] | null;
  matchedAuthor: string;
  searchError: string;
  compactPlaceholder: boolean;
  autoFocus?: boolean;
  onSearch: FormEventHandler<HTMLFormElement>;
  onQueryChange: (query: string) => void;
  onDismissResults: () => void;
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
  variant,
  query,
  searching,
  results,
  matchedAuthor,
  searchError,
  compactPlaceholder,
  autoFocus = false,
  onSearch,
  onQueryChange,
  onDismissResults,
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
    <div
      className={`search-panel ${variant}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && results) onDismissResults();
      }}
    >
      <form className="search-row" onSubmit={onSearch} role="search">
        <label className="search-field">
          <Search
            className="search-icon"
            size={variant === "hero" ? 22 : 18}
            strokeWidth={1.5}
            aria-hidden
          />
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={
              variant === "hero"
                ? compactPlaceholder
                  ? "A title, DOI or author"
                  : "Paste a paper title, a DOI or an author’s name"
                : "Search another paper"
            }
            aria-label="Paper title, DOI, keyword or full author name"
            aria-describedby="search-kind"
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocus}
          />
          <span id="search-kind" className="search-kind" aria-live="polite">
            {searching ? "Searching…" : kind}
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
        <button className="search-submit" type="submit" aria-label="Search">
          <ArrowRight size={variant === "hero" ? 22 : 18} strokeWidth={1.75} aria-hidden />
        </button>
      </form>

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
                ? `Papers by ${matchedAuthor}. Pick one to start from`
                : results.length === 0
                  ? "No matches"
                  : results.length >= SEARCH_RESULT_LIMIT
                    ? `Top ${results.length} matches. Pick one to start from`
                    : `${results.length} match${results.length === 1 ? "" : "es"}. Pick one to start from`}
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
              {searchError || "No papers matched. Try fewer words or a DOI"}
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
    </div>
  );
}
