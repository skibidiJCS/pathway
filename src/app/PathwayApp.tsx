import { Loader, Menu, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Paper } from "../../lib/research-types";
import { HomeView } from "../features/explore/HomeView";
import { PaperPreview } from "../features/explore/PaperPreview";
import { PaperView } from "../features/explore/PaperView";
import { SearchPanel } from "../features/explore/SearchPanel";
import { LibraryPage, SyncPrompt } from "../features/library/LibraryPage";
import {
  ComparePage,
  GapsPage,
  MapPage,
  UpdatesPage,
} from "../features/library/ToolPages";
import type { Route } from "../../lib/routes";
import type { LibraryView, View } from "./app-types";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useCitationExplorer } from "./hooks/useCitationExplorer";
import { useCollectionManager } from "./hooks/useCollectionManager";
import { useHashRoute } from "./hooks/useHashRoute";
import { useInterfacePreferences } from "./hooks/useInterfacePreferences";
import { usePaperSearch } from "./hooks/usePaperSearch";
import { Sidebar } from "./Sidebar";
import { Wordmark } from "./Wordmark";

export function PathwayApp() {
  const { route, navigate } = useHashRoute();
  const view: View =
    route.view === "home" || route.view === "paper"
      ? "explore"
      : route.view === "list"
        ? "library"
        : route.view === "suggested"
          ? "gaps"
          : route.view;
  /** Full paper data for a follow, so the loading view can show its title. */
  const pendingPaper = useRef<Paper | null>(null);
  const requestedId = useRef<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [folderFilter, setFolderFilter] = useState("");
  const mainRef = useRef<HTMLElement | null>(null);
  const {
    query,
    searching,
    results,
    matchedAuthor,
    searchError,
    setQuery,
    handleSearch,
    dismissResults,
    resetSearch,
  } = usePaperSearch();
  const {
    graph,
    graphState,
    graphError,
    selectedPaper,
    minYear,
    openAccessOnly,
    explorationHistory,
    visibleNodes,
    setMinYear,
    setOpenAccessOnly,
    selectPaper,
    selectGraphPaper,
    resetExplorer,
  } = useCitationExplorer();
  const { compactSearchPlaceholder, compactLayout, theme, toggleTheme } =
    useInterfacePreferences();
  const {
    collection,
    collectionLimit,
    settings,
    account,
    authReady,
    authBusy,
    syncState,
    mergeCandidate,
    updates,
    checkingUpdates,
    savingPaperId,
    notice,
    savePaper: handleSave,
    removePaper: handleRemove,
    changeStatus: handleStatusChange,
    changeNote: handleNoteChange,
    changeFolder: handleFolderChange,
    changeTags: handleTagsChange,
    signIn: handleSignIn,
    signOut: handleSignOut,
    mergeLocalCollection: handleMerge,
    dismissMerge,
    checkUpdates: handleCheckUpdates,
  } = useCollectionManager(graph);
  const collectionFull = collection.length >= collectionLimit;
  const center =
    graph?.nodes.find((paper) => paper.id === graph.centerId) ?? null;
  const previewPaper =
    graph && graphState === "ready" && selectedPaper && selectedPaper.id !== graph.centerId
      ? selectedPaper
      : null;

  useEffect(() => {
    if (!compactLayout) setNavOpen(false);
  }, [compactLayout]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [navOpen]);

  // The URL decides which paper is open; Back and links work through it.
  useEffect(() => {
    if (route.view !== "paper") return;
    if (route.id === graph?.centerId || route.id === requestedId.current) return;
    requestedId.current = route.id;
    const known =
      pendingPaper.current?.id === route.id
        ? pendingPaper.current
        : (explorationHistory.find((paper) => paper.id === route.id) ?? null);
    void selectPaper(known ?? stubPaper(route.id));
  }, [explorationHistory, graph?.centerId, route, selectPaper]);

  // Every page starts at its top.
  useEffect(() => {
    mainRef.current?.querySelector(".scroll-area")?.scrollTo({ top: 0 });
  }, [view, graph?.centerId]);

  const follow = (paper: Paper) => {
    setNavOpen(false);
    resetSearch();
    pendingPaper.current = paper;
    navigate({ view: "paper", id: paper.id });
  };

  const goHome = () => {
    setNavOpen(false);
    resetSearch();
    resetExplorer();
    requestedId.current = null;
    navigate({ view: "home" });
  };

  /** Back to exploring: the open paper if there is one, otherwise home. */
  const explore = () => {
    setNavOpen(false);
    navigate(graph ? { view: "paper", id: graph.centerId } : { view: "home" });
  };

  const pageRoute: Record<LibraryView, Route> = {
    library: { view: "list" },
    gaps: { view: "suggested" },
    map: { view: "map" },
    compare: { view: "compare" },
    updates: { view: "updates" },
  };

  const openPage = (next: LibraryView) => {
    setNavOpen(false);
    if (next === "library") setFolderFilter("");
    navigate(pageRoute[next]);
  };

  const openFolder = (folder: string) => {
    setNavOpen(false);
    setFolderFilter(folder);
    navigate({ view: "list" });
  };

  const closePreview = useCallback(() => {
    if (center) selectGraphPaper(center);
  }, [center, selectGraphPaper]);

  const signInButton = (compact: boolean) =>
    account ? null : (
      <GoogleSignInButton
        onSignIn={() => void handleSignIn()}
        busy={authBusy}
        ready={authReady}
        compact={compact}
      />
    );

  const search = (variant: "hero" | "bar") => (
    <SearchPanel
      variant={variant}
      query={query}
      searching={searching}
      results={results}
      matchedAuthor={matchedAuthor}
      searchError={searchError}
      compactPlaceholder={compactSearchPlaceholder}
      autoFocus={variant === "hero" && !compactLayout}
      onSearch={handleSearch}
      onQueryChange={setQuery}
      onDismissResults={dismissResults}
      onSelectPaper={follow}
    />
  );

  const toolProps = {
    collection,
    collectionFull,
    savingId: savingPaperId,
    onExplore: follow,
    onSave: (paper: Paper) => void handleSave(paper),
    onStartExploring: explore,
  };

  const onHome = route.view === "home";

  return (
    <div className={`app-shell${navOpen ? " nav-open" : ""}`}>
      <Sidebar
        view={view}
        activeFolder={folderFilter}
        collection={collection}
        updatesCount={updates.length}
        account={account}
        syncState={syncState}
        theme={theme}
        compact={compactLayout}
        open={navOpen}
        onHome={goHome}
        onExplore={explore}
        onOpen={openPage}
        onFolder={openFolder}
        onSignOut={() => void handleSignOut()}
        onToggleTheme={toggleTheme}
        onClose={() => setNavOpen(false)}
      />

      <main className="app-main" ref={mainRef}>
        <header className="mobile-bar">
          <button
            type="button"
            className="icon-button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={navOpen}
            aria-controls="app-sidebar"
          >
            <Menu size={18} strokeWidth={1.5} aria-hidden />
          </button>
          <button className="brand" type="button" onClick={goHome}>
            <Wordmark />
          </button>
          {signInButton(true) ?? (
            <button
              type="button"
              className={`mobile-saved${view === "library" ? " active" : ""}`}
              onClick={() => openPage("library")}
            >
              Reading list {collection.length}
            </button>
          )}
        </header>

        {onHome ? (
          <div className="scroll-area">
            <HomeView
              search={search("hero")}
              accessory={compactLayout ? null : signInButton(false)}
              lastPaper={explorationHistory[0] ?? null}
              onContinue={follow}
            />
          </div>
        ) : view === "explore" ? (
          <>
            <div className="topbar">
              {search("bar")}
              {compactLayout ? null : signInButton(false)}
            </div>
            <div className={`scroll-area${previewPaper ? " with-preview" : ""}`}>
              {graphState === "loading" ? (
                <div className="state" role="status">
                  <Loader className="state-icon spinning" size={22} strokeWidth={1.5} aria-hidden />
                  <h2>Loading citations</h2>
                  {selectedPaper ? <p>{selectedPaper.title}</p> : null}
                </div>
              ) : graphState === "error" ? (
                <div className="state error" role="alert">
                  <TriangleAlert className="state-icon" size={22} strokeWidth={1.5} aria-hidden />
                  <h2>Citations unavailable</h2>
                  <p>{graphError}</p>
                </div>
              ) : graph ? (
                <PaperView
                  key={graph.centerId}
                  graph={graph}
                  visibleNodes={visibleNodes}
                  selectedId={selectedPaper?.id ?? graph.centerId}
                  history={explorationHistory}
                  minYear={minYear}
                  openAccessOnly={openAccessOnly}
                  savedEntry={
                    collection.find((entry) => entry.paper.id === graph.centerId) ?? null
                  }
                  saving={savingPaperId === graph.centerId}
                  collectionFull={collectionFull}
                  onSelect={selectGraphPaper}
                  onFollow={follow}
                  onSave={(paper) => void handleSave(paper)}
                  onRemove={handleRemove}
                  onMinYearChange={setMinYear}
                  onOpenAccessChange={setOpenAccessOnly}
                />
              ) : null}
            </div>
            <PaperPreview
              paper={previewPaper}
              saved={collection.some((entry) => entry.paper.id === previewPaper?.id)}
              saving={savingPaperId === previewPaper?.id}
              collectionFull={collectionFull}
              onClose={closePreview}
              onFollow={follow}
              onSave={(paper) => void handleSave(paper)}
            />
          </>
        ) : (
          <div className="scroll-area">
            {view === "library" ? (
              <LibraryPage
                collection={collection}
                limit={collectionLimit}
                signInButton={signInButton(false)}
                mergeCandidate={mergeCandidate}
                folderFilter={folderFilter}
                onFolderFilterChange={setFolderFilter}
                onMerge={() => void handleMerge()}
                onDismissMerge={dismissMerge}
                onStartExploring={explore}
                onExplore={follow}
                onRemove={handleRemove}
                onStatusChange={handleStatusChange}
                onNoteChange={handleNoteChange}
                onFolderChange={handleFolderChange}
                onTagsChange={handleTagsChange}
              />
            ) : (
              <div className="page">
                <SyncPrompt signInButton={signInButton(false)} />
                {view === "gaps" ? (
                  <GapsPage {...toolProps} />
                ) : view === "map" ? (
                  <MapPage
                    collection={collection}
                    theme={theme}
                    onExplore={follow}
                    onStartExploring={explore}
                  />
                ) : view === "compare" ? (
                  <ComparePage {...toolProps} />
                ) : (
                  <UpdatesPage
                    {...toolProps}
                    updates={updates}
                    checking={checkingUpdates}
                    lastCheckedAt={settings.lastCheckedAt}
                    onCheck={() => void handleCheckUpdates()}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {notice ? (
        <div className="app-notice" role="status" aria-live="polite">
          {notice}
        </div>
      ) : null}
    </div>
  );
}

function stubPaper(id: string): Paper {
  return {
    id,
    title: "",
    authors: [],
    year: null,
    source: null,
    topics: [],
    citationCount: 0,
    abstract: null,
    isOpenAccess: false,
    openAccessStatus: null,
    doi: null,
    url: `https://openalex.org/${id}`,
    relation: "selected",
  };
}
