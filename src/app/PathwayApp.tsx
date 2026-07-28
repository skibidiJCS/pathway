import { useState } from "react";
import type { Paper } from "../../lib/research-types";
import { ExploreWorkspace } from "../features/explore/ExploreWorkspace";
import { SearchPanel } from "../features/explore/SearchPanel";
import { ReviewPage } from "../features/review/ReviewPage";
import { AppHeader } from "./AppHeader";
import type { View } from "./app-types";
import { useCitationExplorer } from "./hooks/useCitationExplorer";
import { useCollectionManager } from "./hooks/useCollectionManager";
import { useInterfacePreferences } from "./hooks/useInterfacePreferences";
import { usePaperSearch } from "./hooks/usePaperSearch";

export function PathwayApp() {
  const [view, setView] = useState<View>("explore");
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
  const { compactSearchPlaceholder, theme, toggleTheme } =
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

  const selectSearchResult = (paper: Paper) => {
    setView("explore");
    dismissResults();
    void selectPaper(paper);
  };

  const resetApp = () => {
    setView("explore");
    resetSearch();
    resetExplorer();
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
