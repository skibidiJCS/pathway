import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Paper } from "../../../lib/research-types";
import { searchPapers } from "../../services/openalex-client";
import { SEARCH_RESULT_LIMIT } from "../config";

export function usePaperSearch() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Paper[] | null>(null);
  const [matchedAuthor, setMatchedAuthor] = useState("");
  const [searchError, setSearchError] = useState("");
  const searchRequestId = useRef(0);
  const searchTimer = useRef<number | null>(null);

  const cancelTimer = useCallback(() => {
    if (searchTimer.current === null) return;
    window.clearTimeout(searchTimer.current);
    searchTimer.current = null;
  }, []);

  const runSearch = useCallback(async (trimmed: string) => {
    const requestId = ++searchRequestId.current;
    setSearching(true);
    setSearchError("");
    setMatchedAuthor("");

    try {
      const response = await searchPapers(trimmed);
      if (requestId !== searchRequestId.current) return;
      setResults(response.results.slice(0, SEARCH_RESULT_LIMIT));
      setMatchedAuthor(response.matchedAuthor ?? "");
    } catch (error) {
      if (requestId !== searchRequestId.current) return;
      setResults([]);
      setMatchedAuthor("");
      setSearchError(
        error instanceof Error ? error.message : "Search could not be completed.",
      );
    } finally {
      if (requestId === searchRequestId.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    cancelTimer();
    searchRequestId.current += 1;
    setSearching(false);

    if (trimmed.length < 3) {
      setSearchError("");
      setResults(null);
      setMatchedAuthor("");
      return undefined;
    }

    setSearchError("");
    searchTimer.current = window.setTimeout(() => {
      searchTimer.current = null;
      void runSearch(trimmed);
    }, 350);

    return cancelTimer;
  }, [cancelTimer, query, runSearch]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    cancelTimer();
    if (trimmed.length < 3) {
      searchRequestId.current += 1;
      setSearchError("Enter at least 3 characters.");
      setResults([]);
      return;
    }
    void runSearch(trimmed);
  };

  const dismissResults = () => {
    searchRequestId.current += 1;
    cancelTimer();
    setSearching(false);
    setResults(null);
  };

  const resetSearch = () => {
    dismissResults();
    setQuery("");
    setMatchedAuthor("");
    setSearchError("");
  };

  return {
    query,
    searching,
    results,
    matchedAuthor,
    searchError,
    setQuery,
    handleSearch,
    dismissResults,
    resetSearch,
  };
}
