import { Menu, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Paper } from "../../lib/research-types";
import { HomeView } from "../features/explore/HomeView";
import { SearchPanel } from "../features/explore/SearchPanel";
import { PathTrail } from "../features/workspace/PathTrail";
import { Workspace, type WorkspaceTab } from "../features/workspace/Workspace";
import { LibraryPage, SyncPrompt } from "../features/library/LibraryPage";
import {
  ComparePage,
  MapPage,
  UpdatesPage,
} from "../features/library/ToolPages";
import { SuggestedView } from "../features/workspace/SuggestedView";
import { suggestPapers } from "../../lib/suggestions";
import type { Route } from "../../lib/routes";
import type { LibraryView, View } from "./app-types";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useCitationExplorer } from "./hooks/useCitationExplorer";
import { useCollectionManager } from "./hooks/useCollectionManager";
import { useHashRoute } from "./hooks/useHashRoute";
import { useScreening } from "./hooks/useScreening";
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
    explorationHistory,
    selectPaper,
    selectGraphPaper,
    resetExplorer,
  } = useCitationExplorer();
  const { compactSearchPlaceholder, compactLayout, theme, chooseTheme } =
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
  const screening = useScreening();
  const savedIds = useMemo(
    () => new Set(collection.map((entry) => entry.paper.id)),
    [collection],
  );
  const suggestions = useMemo(
    () => suggestPapers(collection, screening.skipped),
    [collection, screening.skipped],
  );
  const workspaceSelected =
    graph && graphState === "ready" && selectedPaper && selectedPaper.id !== graph.centerId
      ? selectedPaper
      : null;
  const neighborhood = useMemo(
    () =>
      (graph?.nodes ?? [])
        .filter((paper) => paper.id !== graph?.centerId)
        .map((paper) => ({ paper, note: relationNote[paper.relation] })),
    [graph],
  );

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
    // Picking a paper again always loads it, so a failed load can be retried.
    requestedId.current = null;
    navigate({ view: "paper", id: paper.id });
  };

  const goHome = () => {
    setNavOpen(false);
    resetSearch();
    resetExplorer();
    requestedId.current = null;
    navigate({ view: "home" });
  };

  /** The sidebar's Find field: go where the search box is and focus it. */
  const find = () => {
    setNavOpen(false);
    if (route.view !== "home" && route.view !== "paper") {
      navigate(graph ? { view: "paper", id: graph.centerId } : { view: "home" });
    }
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>(".search-input")?.focus();
    }, 60);
  };

  /** Back to exploring: the open paper if there is one, otherwise home. */
  const explore = () => {
    setNavOpen(false);
    navigate(graph ? { view: "paper", id: graph.centerId } : { view: "home" });
  };

  const pageRoute: Record<LibraryView, Route> = {
    library: { view: "list" },
    suggested: { view: "suggested" },
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
        suggestedCount={suggestions.length}
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
        onChooseTheme={chooseTheme}
        onFind={find}
        signInButton={signInButton(false)}
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
              suggestedCount={suggestions.length}
              onSuggested={() => navigate({ view: "suggested" })}
              onContinue={follow}
            />
          </div>
        ) : view === "explore" ? (
          <>
            <div className="topbar">
              {search("bar")}
              {compactLayout ? null : signInButton(false)}
            </div>
            {graphState === "error" ? (
              <div className="scroll-area">
                <div className="state error" role="alert">
                  <TriangleAlert className="state-icon" size={22} strokeWidth={1.5} aria-hidden />
                  <h2>Paper unavailable</h2>
                  <p>{graphError}</p>
                  {route.view === "paper" ? (
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        const id = route.id;
                        requestedId.current = id;
                        void selectPaper(
                          pendingPaper.current?.id === id ? pendingPaper.current : stubPaper(id),
                        );
                      }}
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <Workspace
                key={graph?.centerId ?? "loading"}
                header={
                  <PathTrail
                    history={explorationHistory}
                    currentId={graph?.centerId ?? selectedPaper?.id ?? ""}
                    onOpen={(paper) =>
                      paper.id === graph?.centerId && center
                        ? selectGraphPaper(center)
                        : follow(paper)
                    }
                  />
                }
                items={neighborhood}
                tabs={relationTabs}
                settingsKey="pathway:list:paper"
                keysEnabled={!navOpen && !results}
                selected={workspaceSelected}
                fallback={center ?? selectedPaper}
                screen={screening.map}
                savedIds={savedIds}
                savingId={savingPaperId}
                collectionFull={collectionFull}
                loading={graphState === "loading"}
                empty="No papers listed here"
                onSelect={(paper) => {
                  if (paper) {
                    screening.seen(paper.id);
                    selectGraphPaper(paper);
                  } else if (center) {
                    selectGraphPaper(center);
                  }
                }}
                onSave={(paper) => void handleSave(paper)}
                onRemove={handleRemove}
                onSkip={screening.skip}
                onUnskip={screening.unskip}
                onFollow={follow}
              />
            )}
          </>
        ) : view === "suggested" ? (
          <SuggestedView
            suggestions={suggestions}
            savedCount={collection.length}
            screen={screening.map}
            savedIds={savedIds}
            savingId={savingPaperId}
            collectionFull={collectionFull}
            onSeen={screening.seen}
            onSave={(paper) => void handleSave(paper)}
            onRemove={handleRemove}
            onSkip={screening.skip}
            onUnskip={screening.unskip}
            onFollow={follow}
            onStartExploring={explore}
            keysEnabled={!navOpen}
          />
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
                {view === "map" ? (
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

const relationNote: Record<Paper["relation"], string> = {
  selected: "",
  reference: "Reference",
  citing: "Citing",
  both: "Both ways",
};

const relationTabs: WorkspaceTab[] = [
  { key: "all", label: "All", filter: () => true },
  {
    key: "references",
    label: "References",
    filter: (paper) => paper.relation === "reference" || paper.relation === "both",
  },
  {
    key: "citing",
    label: "Citing papers",
    filter: (paper) => paper.relation === "citing" || paper.relation === "both",
  },
];

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
