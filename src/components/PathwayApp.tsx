"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  loadCitationGraph,
  loadCollectionUpdates,
  searchPapers,
} from "../api-client";
import {
  CLOUD_COLLECTION_LIMIT,
  LOCAL_COLLECTION_LIMIT,
  createSavedPaper,
  loadAccountCache,
  loadAccountSettings,
  loadGuestCollection,
  loadGuestSettings,
  mergeCollections,
  storeAccountCache,
  storeAccountSettings,
  storeGuestCollection,
  storeGuestSettings,
} from "../../lib/collection";
import {
  loadExplorationHistory,
  storeExplorationHistory,
  updateExplorationHistory,
} from "../../lib/history";
import type {
  CitationGraphData,
  CollectionSettings,
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../lib/research-types";
import { firebaseConfigured } from "../firebase-config";
import type { PathwayAccount } from "../firebase-client";
import { CitationGraph } from "./CitationGraph";
import { PaperDetails } from "./PaperDetails";
import { ReviewAudit } from "./ReviewAudit";

type LoadState = "idle" | "loading" | "ready" | "error";
type SyncState = "idle" | "loading" | "syncing" | "ready" | "error";
type Theme = "light" | "dark";
type View = "explore" | "review";

const SEARCH_RESULT_LIMIT = 12;
const GRAPH_PAPER_LIMIT = 29;

function resultMeta(paper: Paper): string {
  const authors =
    paper.authors.length > 0
      ? paper.authors.slice(0, 3).join(", ")
      : "Unknown authors";
  return `${authors} · ${paper.year ?? "Year unknown"} · ${paper.citationCount.toLocaleString()} citations`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Account";
}

function compactHistoryTitle(title: string): string {
  return title.length <= 44 ? title : `${title.slice(0, 43)}…`;
}

export function PathwayApp() {
  const [view, setView] = useState<View>("explore");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Paper[] | null>(null);
  const [matchedAuthor, setMatchedAuthor] = useState("");
  const [searchError, setSearchError] = useState("");
  const [graph, setGraph] = useState<CitationGraphData | null>(null);
  const [graphState, setGraphState] = useState<LoadState>("idle");
  const [graphError, setGraphError] = useState("");
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [minYear, setMinYear] = useState("");
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [explorationHistory, setExplorationHistory] = useState<Paper[]>(() =>
    loadExplorationHistory(),
  );
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );

  const [guestCollection, setGuestCollection] = useState<SavedPaper[]>(() =>
    loadGuestCollection(),
  );
  const [collection, setCollection] = useState<SavedPaper[]>(() =>
    loadGuestCollection(),
  );
  const [settings, setSettings] = useState<CollectionSettings>(() =>
    loadGuestSettings(),
  );
  const [account, setAccount] = useState<PathwayAccount | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [authBusy, setAuthBusy] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [mergeCandidate, setMergeCandidate] = useState<SavedPaper[] | null>(
    null,
  );
  const [updates, setUpdates] = useState<Paper[]>([]);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [savingPaperId, setSavingPaperId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const searchRequestId = useRef(0);
  const graphRequestId = useRef(0);
  const authRequestId = useRef(0);
  const searchTimer = useRef<number | null>(null);
  const cloudSaveTimers = useRef(new Map<string, number>());
  const collectionRef = useRef(collection);
  const guestCollectionRef = useRef(guestCollection);
  const accountRef = useRef<PathwayAccount | null>(account);

  collectionRef.current = collection;
  guestCollectionRef.current = guestCollection;
  accountRef.current = account;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("pathway:theme", theme);
    } catch {
      // The active theme still works when browser storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    let stop: () => void = () => undefined;

    if (firebaseConfigured) {
      void import("../firebase-client").then((firebase) => {
        if (!active) return;
        stop = firebase.observeAccount((nextAccount) => {
          if (!active) return;
          const requestId = ++authRequestId.current;
          for (const timer of cloudSaveTimers.current.values()) {
            window.clearTimeout(timer);
          }
          cloudSaveTimers.current.clear();
          accountRef.current = nextAccount;
          setAccount(nextAccount);
          setAuthReady(true);
          setUpdates([]);

          if (!nextAccount) {
            const local = guestCollectionRef.current;
            collectionRef.current = local;
            setCollection(local);
            setSettings(loadGuestSettings());
            setMergeCandidate(null);
            setSyncState("idle");
            return;
          }

          const cached = loadAccountCache(nextAccount.uid);
          collectionRef.current = cached;
          setCollection(cached);
          setSettings(loadAccountSettings(nextAccount.uid));
          setSyncState("loading");

          void Promise.all([
            firebase.loadCloudCollection(nextAccount.uid),
            firebase.loadCloudSettings(nextAccount.uid),
          ])
            .then(([cloudCollection, cloudSettings]) => {
              if (!active || requestId !== authRequestId.current) return;
              collectionRef.current = cloudCollection;
              setCollection(cloudCollection);
              storeAccountCache(nextAccount.uid, cloudCollection);
              setSettings(cloudSettings);
              storeAccountSettings(nextAccount.uid, cloudSettings);
              const localOnly = guestCollectionRef.current.filter(
                (entry) =>
                  !cloudCollection.some(
                    (cloudEntry) => cloudEntry.paper.id === entry.paper.id,
                  ),
              );
              setMergeCandidate(
                localOnly.length > 0 ? guestCollectionRef.current : null,
              );
              setSyncState("ready");
            })
            .catch(() => {
              if (!active || requestId !== authRequestId.current) return;
              setSyncState("error");
              setNotice(
                "Google sync is temporarily unavailable. Your cached collection is still here.",
              );
            });
        });
      });
    }

    return () => {
      active = false;
      stop();
      for (const timer of cloudSaveTimers.current.values()) {
        window.clearTimeout(timer);
      }
      cloudSaveTimers.current.clear();
    };
  }, []);

  const visibleNodes = useMemo(() => {
    if (!graph) return [];
    const year = Number(minYear);
    return graph.nodes.filter((paper) => {
      if (paper.id === graph.centerId) return true;
      if (minYear && (paper.year === null || paper.year < year)) return false;
      if (openAccessOnly && !paper.isOpenAccess) return false;
      return true;
    });
  }, [graph, minYear, openAccessOnly]);

  const collectionLimit = account
    ? CLOUD_COLLECTION_LIMIT
    : LOCAL_COLLECTION_LIMIT;
  const selectedSavedEntry =
    collection.find((entry) => entry.paper.id === selectedPaper?.id) ?? null;

  const applyCollection = (
    nextCollection: SavedPaper[],
    activeAccount = accountRef.current,
  ) => {
    collectionRef.current = nextCollection;
    setCollection(nextCollection);
    if (activeAccount) {
      storeAccountCache(activeAccount.uid, nextCollection);
    } else {
      guestCollectionRef.current = nextCollection;
      setGuestCollection(nextCollection);
      storeGuestCollection(nextCollection);
    }
  };

  const scheduleCloudSave = (
    activeAccount: PathwayAccount,
    entry: SavedPaper,
    delay = 0,
  ) => {
    const existing = cloudSaveTimers.current.get(entry.paper.id);
    if (existing !== undefined) window.clearTimeout(existing);

    const save = async () => {
      cloudSaveTimers.current.delete(entry.paper.id);
      setSyncState("syncing");
      try {
        const { saveCloudPaper } = await import("../firebase-client");
        await saveCloudPaper(activeAccount.uid, entry);
        if (accountRef.current?.uid === activeAccount.uid) {
          setSyncState("ready");
        }
      } catch {
        if (accountRef.current?.uid === activeAccount.uid) {
          setSyncState("error");
          setNotice("This change is cached locally and will need to be synced again.");
        }
      }
    };

    if (delay > 0) {
      const timer = window.setTimeout(() => void save(), delay);
      cloudSaveTimers.current.set(entry.paper.id, timer);
    } else {
      void save();
    }
  };

  const updateSavedEntry = (
    paperId: string,
    update: (entry: SavedPaper) => SavedPaper,
    cloudDelay = 0,
  ) => {
    let changed: SavedPaper | null = null;
    const next = collectionRef.current.map((entry) => {
      if (entry.paper.id !== paperId) return entry;
      changed = update(entry);
      return changed;
    });
    if (!changed) return;
    const activeAccount = accountRef.current;
    applyCollection(next, activeAccount);
    if (activeAccount) scheduleCloudSave(activeAccount, changed, cloudDelay);
  };

  const runSearch = async (trimmed: string) => {
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
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
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

    return () => {
      if (searchTimer.current !== null) {
        window.clearTimeout(searchTimer.current);
        searchTimer.current = null;
      }
    };
  }, [query]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    if (trimmed.length < 3) {
      searchRequestId.current += 1;
      setSearchError("Enter at least 3 characters.");
      setResults([]);
      return;
    }
    void runSearch(trimmed);
  };

  const selectSearchResult = async (paper: Paper) => {
    setView("explore");
    const requestId = ++graphRequestId.current;
    searchRequestId.current += 1;
    setSearching(false);
    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    setResults(null);
    setGraphState("loading");
    setGraphError("");
    setGraph(null);
    setSelectedPaper(paper);
    setDetailsExpanded(false);
    setMinYear("");
    setOpenAccessOnly(false);

    try {
      const nextGraph = await loadCitationGraph(paper.id);
      if (requestId !== graphRequestId.current) return;
      const center =
        nextGraph.nodes.find((node) => node.id === nextGraph.centerId) ?? paper;
      setGraph(nextGraph);
      setSelectedPaper(center);
      setExplorationHistory((current) => {
        const next = updateExplorationHistory(current, center);
        storeExplorationHistory(next);
        return next;
      });
      setGraphState("ready");
    } catch (error) {
      if (requestId !== graphRequestId.current) return;
      setGraphError(
        error instanceof Error
          ? error.message
          : "The citation graph could not be loaded.",
      );
      setGraphState("error");
    }
  };

  const resetApp = () => {
    searchRequestId.current += 1;
    graphRequestId.current += 1;
    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    setView("explore");
    setQuery("");
    setSearching(false);
    setResults(null);
    setMatchedAuthor("");
    setSearchError("");
    setGraph(null);
    setGraphState("idle");
    setGraphError("");
    setSelectedPaper(null);
    setDetailsExpanded(false);
    setMinYear("");
    setOpenAccessOnly(false);
  };

  const toggleTheme = () => {
    const nextTheme: Theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  };

  const handleSave = async (paper: Paper) => {
    const activeAccount = accountRef.current;
    const limit = activeAccount
      ? CLOUD_COLLECTION_LIMIT
      : LOCAL_COLLECTION_LIMIT;
    if (collectionRef.current.some((entry) => entry.paper.id === paper.id)) return;
    if (collectionRef.current.length >= limit) {
      setNotice(
        activeAccount
          ? `Your synced collection is limited to ${limit} papers.`
          : `Local saving is limited to ${limit} papers. Sign in with Google for ${CLOUD_COLLECTION_LIMIT}.`,
      );
      return;
    }

    setSavingPaperId(paper.id);
    try {
      const paperGraph =
        graph?.centerId === paper.id ? graph : await loadCitationGraph(paper.id);
      const entry = createSavedPaper(paper, paperGraph);
      const next = [entry, ...collectionRef.current].slice(0, limit);
      applyCollection(next, activeAccount);
      if (activeAccount) scheduleCloudSave(activeAccount, entry);
      setNotice(
        activeAccount ? "Paper saved to your synced collection." : "Paper saved on this device.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "The paper could not be saved.",
      );
    } finally {
      setSavingPaperId(null);
    }
  };

  const handleRemove = (paperId: string) => {
    const activeAccount = accountRef.current;
    const next = collectionRef.current.filter(
      (entry) => entry.paper.id !== paperId,
    );
    const timer = cloudSaveTimers.current.get(paperId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      cloudSaveTimers.current.delete(paperId);
    }
    applyCollection(next, activeAccount);
    if (activeAccount) {
      setSyncState("syncing");
      void import("../firebase-client")
        .then(({ deleteCloudPaper }) =>
          deleteCloudPaper(activeAccount.uid, paperId),
        )
        .then(() => setSyncState("ready"))
        .catch(() => {
          setSyncState("error");
          setNotice("The paper was removed here, but Google sync failed.");
        });
    }
  };

  const handleStatusChange = (paperId: string, status: ReviewStatus) => {
    updateSavedEntry(paperId, (entry) => ({ ...entry, status }));
  };

  const handleNoteChange = (paperId: string, note: string) => {
    updateSavedEntry(
      paperId,
      (entry) => ({ ...entry, note: note.slice(0, 2000) }),
      650,
    );
  };

  const handleSignIn = async () => {
    if (!firebaseConfigured) {
      setNotice(
        "Google sync needs the Firebase project values listed in the setup guide.",
      );
      return;
    }
    setAuthBusy(true);
    try {
      const { signInWithGoogle } = await import("../firebase-client");
      await signInWithGoogle();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Google sign-in was cancelled.",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    const { signOutAccount } = await import("../firebase-client");
    await signOutAccount();
  };

  const handleMerge = async () => {
    const activeAccount = accountRef.current;
    if (!activeAccount || !mergeCandidate) return;
    const merged = mergeCollections(
      collectionRef.current,
      mergeCandidate,
      CLOUD_COLLECTION_LIMIT,
    );
    applyCollection(merged, activeAccount);
    setSyncState("syncing");
    try {
      const { mergeIntoCloud } = await import("../firebase-client");
      await mergeIntoCloud(activeAccount.uid, merged);
      setMergeCandidate(null);
      setSyncState("ready");
      setNotice("Local papers were added to your Google-synced collection.");
    } catch {
      setSyncState("error");
      setNotice("The merge is cached locally, but Google sync failed.");
    }
  };

  const handleCheckUpdates = async () => {
    if (collectionRef.current.length === 0) return;
    setCheckingUpdates(true);
    try {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() - 30);
      const since = (settings.lastCheckedAt
        ? new Date(settings.lastCheckedAt)
        : fallback
      )
        .toISOString()
        .slice(0, 10);
      const nextUpdates = await loadCollectionUpdates(
        collectionRef.current.map((entry) => entry.paper.id),
        since,
      );
      const savedIds = new Set(
        collectionRef.current.map((entry) => entry.paper.id),
      );
      setUpdates(
        nextUpdates.results.filter((paper) => !savedIds.has(paper.id)),
      );
      const nextSettings = { lastCheckedAt: new Date().toISOString() };
      setSettings(nextSettings);
      const activeAccount = accountRef.current;
      if (activeAccount) {
        storeAccountSettings(activeAccount.uid, nextSettings);
        const { saveCloudSettings } = await import("../firebase-client");
        await saveCloudSettings(activeAccount.uid, nextSettings);
      } else {
        storeGuestSettings(nextSettings);
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "New citing papers could not be checked.",
      );
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          type="button"
          onClick={resetApp}
          aria-label="Return to the Pathway homepage"
          title="Return to homepage"
        >
          <img
            className="brand-logo"
            src="/pathway-logo-full.png"
            alt="Pathway Research"
          />
        </button>
        <div className="header-actions">
          <button
            className={`header-text-button${view === "review" ? " active" : ""}`}
            type="button"
            onClick={() => setView("review")}
            aria-pressed={view === "review"}
          >
            Saved <span>{collection.length}</span>
          </button>
          {account ? (
            <details className="account-menu">
              <summary className="header-text-button">
                {firstName(account.name)}
              </summary>
              <div className="account-popover">
                <strong>{account.name}</strong>
                <span>{account.email}</span>
                <span className={`sync-label ${syncState}`}>
                  {syncState === "loading"
                    ? "Loading collection…"
                    : syncState === "syncing"
                      ? "Syncing…"
                      : syncState === "error"
                        ? "Sync needs attention"
                        : "Synced with Google"}
                </span>
                <button type="button" onClick={() => void handleSignOut()}>
                  Sign out
                </button>
              </div>
            </details>
          ) : (
            <button
              className="header-text-button"
              type="button"
              onClick={() => void handleSignIn()}
              disabled={authBusy || !authReady}
            >
              {authBusy ? "Signing in…" : "Sign in"}
            </button>
          )}
          <a
            className="source-link"
            href="https://openalex.org"
            target="_blank"
            rel="noreferrer"
          >
            Data by OpenAlex ↗
          </a>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-pressed={theme === "dark"}
          >
            <span className="theme-icon moon" aria-hidden="true">
              ☾
            </span>
            <span className="theme-icon sun" aria-hidden="true">
              ☀
            </span>
          </button>
        </div>
      </header>

      {view === "review" ? (
        <section className="review-page">
          {!firebaseConfigured ? (
            <div className="review-sync-note">
              Local saving is active. Add the Firebase project values to enable
              Google sign-in and cross-device sync.
            </div>
          ) : !account ? (
            <div className="review-sync-note">
              Stored on this device only.{" "}
              <button type="button" onClick={() => void handleSignIn()}>
                Sign in with Google
              </button>{" "}
              to save up to {CLOUD_COLLECTION_LIMIT} papers across devices.
            </div>
          ) : null}
          {mergeCandidate ? (
            <div className="merge-notice">
              <span>
                Add your {mergeCandidate.length} local paper
                {mergeCandidate.length === 1 ? "" : "s"} to this synced
                collection?
              </span>
              <div>
                <button type="button" onClick={() => void handleMerge()}>
                  Merge
                </button>
                <button type="button" onClick={() => setMergeCandidate(null)}>
                  Keep separate
                </button>
              </div>
            </div>
          ) : null}
          <ReviewAudit
            collection={collection}
            limit={collectionLimit}
            synced={Boolean(account)}
            theme={theme}
            updates={updates}
            checkingUpdates={checkingUpdates}
            lastCheckedAt={settings.lastCheckedAt}
            onExplore={(paper) => void selectSearchResult(paper)}
            onRemove={handleRemove}
            onStatusChange={handleStatusChange}
            onNoteChange={handleNoteChange}
            onCheckUpdates={() => void handleCheckUpdates()}
          />
        </section>
      ) : (
        <>
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
                  placeholder="Search by title, DOI, keyword or author"
                  aria-label="Paper title, DOI, keyword or full author name"
                  autoComplete="off"
                />
                {query ? (
                  <button
                    className="input-clear search-clear"
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <button
                className="search-button"
                type="submit"
                disabled={searching}
              >
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
                          setMinYear(
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
                          onClick={() => setMinYear("")}
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
                          setOpenAccessOnly(event.target.checked)
                        }
                      />
                      <span>Open access only</span>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>

            {graph && explorationHistory.length > 0 ? (
              <nav
                className="exploration-history"
                aria-label="Exploration history"
              >
                <span>History</span>
                <div>
                  {explorationHistory.map((paper) => (
                    <button
                      key={paper.id}
                      type="button"
                      className={paper.id === graph.centerId ? "active" : ""}
                      onClick={() => void selectSearchResult(paper)}
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
                  <div className="results-context">
                    Papers by {matchedAuthor}
                  </div>
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
            className={`workspace${detailsExpanded ? " details-expanded" : ""}`}
          >
            <div className="graph-stage">
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
                  <p>
                    Loading the selected paper, references, and citing papers.
                  </p>
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
                    onSelect={setSelectedPaper}
                    selectedId={selectedPaper?.id ?? graph.centerId}
                    theme={theme}
                  />
                  <div className="graph-footer">
                    Showing {visibleNodes.length} of {graph.nodes.length} papers
                    · click a paper for details
                  </div>
                </>
              ) : null}
            </div>

            <PaperDetails
              paper={selectedPaper}
              expanded={detailsExpanded}
              savedEntry={selectedSavedEntry}
              collectionFull={collection.length >= collectionLimit}
              saving={savingPaperId === selectedPaper?.id}
              onToggle={() => setDetailsExpanded((value) => !value)}
              onSave={(paper) => void handleSave(paper)}
              onRemove={handleRemove}
              onStatusChange={handleStatusChange}
              onNoteChange={handleNoteChange}
            />
          </section>
        </>
      )}

      {notice ? (
        <div className="app-notice" role="status" aria-live="polite">
          {notice}
        </div>
      ) : null}
    </main>
  );
}
