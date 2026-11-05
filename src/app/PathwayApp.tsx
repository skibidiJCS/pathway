import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import type { Paper } from "../../lib/research-types";
import { ExploreWorkspace } from "../features/explore/ExploreWorkspace";
import { SearchPanel } from "../features/explore/SearchPanel";
import { ReviewPage } from "../features/review/ReviewPage";
import type { ReviewFocus, ReviewSection, View } from "./app-types";
import { BrandMark } from "./BrandMark";
import { useCitationExplorer } from "./hooks/useCitationExplorer";
import { useCollectionManager } from "./hooks/useCollectionManager";
import { useInterfacePreferences } from "./hooks/useInterfacePreferences";
import { usePaperSearch } from "./hooks/usePaperSearch";
import { Sidebar } from "./Sidebar";

export function PathwayApp() {
  const [view, setView] = useState<View>("explore");
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ReviewSection | null>(
    null,
  );
  const [reviewFocus, setReviewFocus] = useState<ReviewFocus | null>(null);
  const [folderFilter, setFolderFilter] = useState("");
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
    detailsExpanded,
    minYear,
    openAccessOnly,
    explorationHistory,
    visibleNodes,
    setDetailsExpanded,
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
  const selectedSavedEntry =
    collection.find((entry) => entry.paper.id === selectedPaper?.id) ?? null;

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

  const selectSearchResult = (paper: Paper) => {
    setView("explore");
    setNavOpen(false);
    dismissResults();
    void selectPaper(paper);
  };

  const resetApp = () => {
    setView("explore");
    setNavOpen(false);
    resetSearch();
    resetExplorer();
  };

  const openSaved = () => {
    setView("review");
    setNavOpen(false);
    setActiveSection(null);
    setFolderFilter("");
    setReviewFocus((current) => ({
      section: "collection",
      request: (current?.request ?? 0) + 1,
    }));
  };

  const openSection = (section: ReviewSection) => {
    setView("review");
    setNavOpen(false);
    setActiveSection(section);
    setReviewFocus((current) => ({
      section,
      request: (current?.request ?? 0) + 1,
    }));
  };

  const openFolder = (folder: string) => {
    setView("review");
    setNavOpen(false);
    setActiveSection(null);
    setFolderFilter(folder);
    setReviewFocus((current) => ({
      section: "collection",
      request: (current?.request ?? 0) + 1,
    }));
  };

  const shellClasses = [
    "app-shell",
    navOpen ? "nav-open" : "",
    detailsExpanded && selectedPaper ? "mobile-details-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClasses}>
      <Sidebar
        view={view}
        activeSection={activeSection}
        activeFolder={folderFilter}
        collection={collection}
        collectionLimit={collectionLimit}
        updatesCount={updates.length}
        history={explorationHistory}
        currentPaperId={graph?.centerId ?? null}
        account={account}
        syncState={syncState}
        authBusy={authBusy}
        authReady={authReady}
        theme={theme}
        compact={compactLayout}
        open={navOpen}
        onHome={resetApp}
        onExplore={() => {
          setView("explore");
          setNavOpen(false);
        }}
        onSaved={openSaved}
        onSection={openSection}
        onFolder={openFolder}
        onTrailSelect={selectSearchResult}
        onSignIn={() => void handleSignIn()}
        onSignOut={() => void handleSignOut()}
        onToggleTheme={toggleTheme}
        onClose={() => setNavOpen(false)}
      />

      <main className="app-main">
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
          <button className="brand" type="button" onClick={resetApp}>
            <BrandMark />
            <span className="brand-name">Pathway Research</span>
          </button>
          <button
            type="button"
            className={`mobile-saved${view === "review" ? " active" : ""}`}
            onClick={view === "review" ? () => setView("explore") : openSaved}
          >
            {view === "review" ? (
              "Explore"
            ) : (
              <>
                Saved{" "}
                <span className="tabular">
                  {collection.length}/{collectionLimit}
                </span>
              </>
            )}
          </button>
        </header>

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
            focus={reviewFocus}
            folderFilter={folderFilter}
            onFolderFilterChange={setFolderFilter}
            onSignIn={() => void handleSignIn()}
            onMerge={() => void handleMerge()}
            onDismissMerge={dismissMerge}
            onExplore={(paper) => void selectSearchResult(paper)}
            onRemove={handleRemove}
            onStatusChange={handleStatusChange}
            onNoteChange={handleNoteChange}
            onFolderChange={handleFolderChange}
            onTagsChange={handleTagsChange}
            onCheckUpdates={() => void handleCheckUpdates()}
          />
        ) : (
          <div className="explore-view">
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
              onSearch={handleSearch}
              onQueryChange={setQuery}
              onDismissResults={dismissResults}
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
              onSelectPaper={selectGraphPaper}
              onToggleDetails={() => setDetailsExpanded((value) => !value)}
              onExplorePaper={selectSearchResult}
              onSave={(paper) => void handleSave(paper)}
              onRemove={handleRemove}
              onStatusChange={handleStatusChange}
              onNoteChange={handleNoteChange}
            />
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
