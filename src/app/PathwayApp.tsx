import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  loadCitationGraph,
  loadCollectionUpdates,
  searchPapers,
} from "../services/openalex-client";
import {
  CLOUD_COLLECTION_LIMIT,
  LOCAL_COLLECTION_LIMIT,
  createSavedPaper,
  loadAccountCache,
  loadAccountSettings,
  loadGuestCollection,
  loadGuestSettings,
  mergeCollections,
  sanitizeFolder,
  sanitizeTags,
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
import { firebaseConfigured } from "../services/firebase-config";
import type { PathwayAccount } from "../services/firebase-client";
import { ExploreWorkspace } from "../features/explore/ExploreWorkspace";
import { SearchPanel } from "../features/explore/SearchPanel";
import { ReviewPage } from "../features/review/ReviewPage";
import { AppHeader } from "./AppHeader";
import type { LoadState, SyncState, Theme, View } from "./app-types";
import { SEARCH_RESULT_LIMIT } from "./config";

function releaseMobileFocus(): void {
  if (!window.matchMedia("(max-width: 620px)").matches) return;
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();
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
  const [compactSearchPlaceholder, setCompactSearchPlaceholder] = useState(
    () => window.matchMedia("(max-width: 620px)").matches,
  );
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
    } catch {}
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 620px)");
    const updatePlaceholder = () =>
      setCompactSearchPlaceholder(media.matches);
    updatePlaceholder();
    media.addEventListener("change", updatePlaceholder);
    return () => media.removeEventListener("change", updatePlaceholder);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    let stop: () => void = () => undefined;

    if (firebaseConfigured) {
      void import("../services/firebase-client").then((firebase) => {
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
        const { saveCloudPaper } = await import(
          "../services/firebase-client"
        );
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
    releaseMobileFocus();
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

  const selectGraphPaper = (paper: Paper) => {
    releaseMobileFocus();
    setSelectedPaper(paper);
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
      void import("../services/firebase-client")
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

  const handleFolderChange = (paperId: string, folder: string | null) => {
    updateSavedEntry(
      paperId,
      (entry) => ({ ...entry, folder: sanitizeFolder(folder) }),
      300,
    );
  };

  const handleTagsChange = (paperId: string, tags: string[]) => {
    updateSavedEntry(
      paperId,
      (entry) => ({ ...entry, tags: sanitizeTags(tags) }),
      300,
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
      const { signInWithGoogle } = await import(
        "../services/firebase-client"
      );
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
    const { signOutAccount } = await import("../services/firebase-client");
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
      const { mergeIntoCloud } = await import("../services/firebase-client");
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
        const { saveCloudSettings } = await import(
          "../services/firebase-client"
        );
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
    <main
      className={`app-shell${
        detailsExpanded && selectedPaper ? " mobile-details-open" : ""
      }`}
    >
      <AppHeader
        view={view}
        collectionSize={collection.length}
        account={account}
        syncState={syncState}
        authBusy={authBusy}
        authReady={authReady}
        theme={theme}
        onHome={resetApp}
        onReview={() => setView("review")}
        onSignIn={() => void handleSignIn()}
        onSignOut={() => void handleSignOut()}
        onToggleTheme={toggleTheme}
      />

      {view === "review" ? (
        <ReviewPage
          collection={collection}
          limit={collectionLimit}
          signedIn={Boolean(account)}
          mergeCandidate={mergeCandidate}
          theme={theme}
          updates={updates}
          checkingUpdates={checkingUpdates}
          lastCheckedAt={settings.lastCheckedAt}
          onSignIn={() => void handleSignIn()}
          onMerge={() => void handleMerge()}
          onDismissMerge={() => setMergeCandidate(null)}
          onExplore={(paper) => void selectSearchResult(paper)}
          onRemove={handleRemove}
          onStatusChange={handleStatusChange}
          onNoteChange={handleNoteChange}
          onFolderChange={handleFolderChange}
          onTagsChange={handleTagsChange}
          onCheckUpdates={() => void handleCheckUpdates()}
        />
      ) : (
        <>
          <SearchPanel
            query={query}
            searching={searching}
            results={results}
            matchedAuthor={matchedAuthor}
            searchError={searchError}
            graph={graph}
            minYear={minYear}
            openAccessOnly={openAccessOnly}
            compactPlaceholder={compactSearchPlaceholder}
            history={explorationHistory}
            onSearch={handleSearch}
            onQueryChange={setQuery}
            onMinYearChange={setMinYear}
            onOpenAccessChange={setOpenAccessOnly}
            onSelectPaper={(paper) => void selectSearchResult(paper)}
          />

          <ExploreWorkspace
            graph={graph}
            graphState={graphState}
            graphError={graphError}
            visibleNodes={visibleNodes}
            selectedPaper={selectedPaper}
            selectedSavedEntry={selectedSavedEntry}
            detailsExpanded={detailsExpanded}
            collectionFull={collection.length >= collectionLimit}
            saving={savingPaperId === selectedPaper?.id}
            theme={theme}
            onSelectPaper={selectGraphPaper}
            onToggleDetails={() => setDetailsExpanded((value) => !value)}
            onSave={(paper) => void handleSave(paper)}
            onRemove={handleRemove}
            onStatusChange={handleStatusChange}
            onNoteChange={handleNoteChange}
          />
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
