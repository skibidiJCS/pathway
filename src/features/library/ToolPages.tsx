import { Compass, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { compareSavedPapers } from "../../../lib/collection";
import type { Paper, SavedPaper } from "../../../lib/research-types";
import type { Theme } from "../../app/app-types";
import { EmptyState, PageHeader } from "./PageHeader";
import { PaperLinkList } from "./PaperLinkList";
import { compactTitle } from "./review-utils";
import { SavedGraph } from "./SavedGraph";

interface ToolProps {
  collection: SavedPaper[];
  collectionFull: boolean;
  savingId: string | null;
  onExplore: (paper: Paper) => void;
  onSave: (paper: Paper) => void;
  onStartExploring: () => void;
}

function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? word : pluralWord}`;
}

function useSavedIds(collection: SavedPaper[]) {
  return useMemo(
    () => new Set(collection.map((entry) => entry.paper.id)),
    [collection],
  );
}

function NeedsPapers({
  count,
  needed,
  what,
  onStartExploring,
}: {
  count: number;
  needed: number;
  what: string;
  onStartExploring: () => void;
}) {
  const missing = needed - count;
  return (
    <EmptyState
      title={`Save ${missing === needed ? needed : `${missing} more`} paper${missing === 1 ? "" : "s"} to ${what}`}
      action={
        <button type="button" className="button primary" onClick={onStartExploring}>
          <Compass size={16} strokeWidth={1.5} aria-hidden />
          Explore papers
        </button>
      }
    >
      You have saved {plural(count, "paper")} so far. Open a paper while
      exploring and press Save
    </EmptyState>
  );
}

/* ---------- Map ---------- */

export function MapPage({
  collection,
  theme,
  onExplore,
  onStartExploring,
}: Pick<ToolProps, "collection" | "onExplore" | "onStartExploring"> & {
  theme: Theme;
}) {
  const [mappedIds, setMappedIds] = useState<string[]>(() =>
    collection.slice(0, 25).map((entry) => entry.paper.id),
  );

  useEffect(() => {
    setMappedIds((current) => {
      const available = new Set(collection.map((entry) => entry.paper.id));
      const valid = current.filter((id) => available.has(id)).slice(0, 25);
      return valid.length > 0
        ? valid
        : collection.slice(0, 25).map((entry) => entry.paper.id);
    });
  }, [collection]);

  return (
    <div className="page-body wide">
      <PageHeader
        title="Map"
        description="How your saved papers connect. Arrows are direct citations, dashed lines shared citations, dotted lines shared topics. Click a paper or a line to see why"
      />
      {collection.length < 2 ? (
        <NeedsPapers
          count={collection.length}
          needed={2}
          what="map how they connect"
          onStartExploring={onStartExploring}
        />
      ) : (
        <>
          <SavedGraph
            collection={collection}
            selectedIds={mappedIds}
            theme={theme}
            onExplore={onExplore}
          />
          {collection.length > 2 ? (
            <fieldset className="map-selector">
              <legend>Show on the map</legend>
              {collection.map((entry) => {
                const checked = mappedIds.includes(entry.paper.id);
                return (
                  <label key={entry.paper.id} title={entry.paper.title}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && mappedIds.length >= 25}
                      onChange={(event) =>
                        setMappedIds((current) =>
                          event.target.checked
                            ? [...current, entry.paper.id].slice(0, 25)
                            : current.filter((id) => id !== entry.paper.id),
                        )
                      }
                    />
                    <span>{entry.paper.title}</span>
                  </label>
                );
              })}
            </fieldset>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ---------- Compare ---------- */

export function ComparePage({
  collection,
  collectionFull,
  savingId,
  onExplore,
  onSave,
  onStartExploring,
}: ToolProps) {
  const [firstId, setFirstId] = useState(collection[0]?.paper.id ?? "");
  const [secondId, setSecondId] = useState(collection[1]?.paper.id ?? "");
  const savedIds = useSavedIds(collection);

  useEffect(() => {
    if (!collection.some((entry) => entry.paper.id === firstId)) {
      setFirstId(collection[0]?.paper.id ?? "");
    }
    if (
      !collection.some((entry) => entry.paper.id === secondId) ||
      firstId === secondId
    ) {
      setSecondId(
        collection.find((entry) => entry.paper.id !== firstId)?.paper.id ?? "",
      );
    }
  }, [collection, firstId, secondId]);

  const first = collection.find((entry) => entry.paper.id === firstId);
  const second = collection.find((entry) => entry.paper.id === secondId);
  const comparison = useMemo(
    () =>
      first && second && first.paper.id !== second.paper.id
        ? compareSavedPapers(first, second)
        : null,
    [first, second],
  );

  const listProps = {
    savedIds,
    savingId,
    canSave: !collectionFull,
    onExplore,
    onSave,
  };

  return (
    <div className="page-body">
      <PageHeader
        title="Compare two"
        description="Pick two saved papers to see the references they share and where they part ways"
      />
      {collection.length < 2 || !comparison || !first || !second ? (
        <NeedsPapers
          count={collection.length}
          needed={2}
          what="compare them"
          onStartExploring={onStartExploring}
        />
      ) : (
        <>
          <div className="compare-pickers">
            <label>
              <span>First paper</span>
              <select value={firstId} onChange={(event) => setFirstId(event.target.value)}>
                {collection.map((entry) => (
                  <option
                    key={entry.paper.id}
                    value={entry.paper.id}
                    disabled={entry.paper.id === secondId}
                  >
                    {compactTitle(entry.paper.title, 80)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Second paper</span>
              <select value={secondId} onChange={(event) => setSecondId(event.target.value)}>
                {collection
                  .filter((entry) => entry.paper.id !== firstId)
                  .map((entry) => (
                    <option key={entry.paper.id} value={entry.paper.id}>
                      {compactTitle(entry.paper.title, 80)}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <p className="compare-summary tabular">
            {comparison.directRelationships.length
              ? `${comparison.directRelationships.join(". ")}. `
              : "Neither paper cites the other. "}
            They share {plural(comparison.sharedReferences.length, "reference")}
            {comparison.commonCitingPapers.length
              ? `, and ${plural(comparison.commonCitingPapers.length, "later paper")} ${
                  comparison.commonCitingPapers.length === 1 ? "cites" : "cite"
                } both.`
              : "."}
          </p>

          <div className="tool-sections">
            <section className="tool-section lead">
              <h2>
                Both cite <span className="tabular">{comparison.sharedReferences.length}</span>
              </h2>
              <PaperLinkList
                items={comparison.sharedReferences.map((paper) => ({ paper }))}
                empty="They share no references"
                {...listProps}
              />
            </section>
            <section className="tool-section">
              <h2>
                Cited by both <span className="tabular">{comparison.commonCitingPapers.length}</span>
              </h2>
              <PaperLinkList
                items={comparison.commonCitingPapers.map((paper) => ({ paper }))}
                empty="No later paper cites both yet"
                {...listProps}
              />
            </section>
            <div className="compare-columns">
              <section className="tool-section">
                <h2>
                  Only the first cites{" "}
                  <span className="tabular">{comparison.firstOnlyReferences.length}</span>
                </h2>
                <PaperLinkList
                  items={comparison.firstOnlyReferences.map((paper) => ({ paper }))}
                  empty="None"
                  {...listProps}
                />
              </section>
              <section className="tool-section">
                <h2>
                  Only the second cites{" "}
                  <span className="tabular">{comparison.secondOnlyReferences.length}</span>
                </h2>
                <PaperLinkList
                  items={comparison.secondOnlyReferences.map((paper) => ({ paper }))}
                  empty="None"
                  {...listProps}
                />
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- New citing papers ---------- */

export function UpdatesPage({
  collection,
  collectionFull,
  savingId,
  updates,
  checking,
  lastCheckedAt,
  onCheck,
  onExplore,
  onSave,
  onStartExploring,
}: ToolProps & {
  updates: Paper[];
  checking: boolean;
  lastCheckedAt: string | null;
  onCheck: () => void;
}) {
  const savedIds = useSavedIds(collection);
  const checkedText = lastCheckedAt
    ? `Last checked ${new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
      }).format(new Date(lastCheckedAt))}`
    : "Not checked yet";

  return (
    <div className="page-body">
      <PageHeader
        title="New citing papers"
        description="Recent papers that cite something on your reading list"
        actions={
          collection.length > 0 ? (
            <button
              type="button"
              className="button primary"
              onClick={onCheck}
              disabled={checking}
            >
              <RefreshCw size={16} strokeWidth={1.5} aria-hidden />
              {checking ? "Checking…" : "Check now"}
            </button>
          ) : null
        }
      />
      {collection.length === 0 ? (
        <NeedsPapers
          count={0}
          needed={1}
          what="follow new citations"
          onStartExploring={onStartExploring}
        />
      ) : (
        <section className="tool-section lead">
          <p className="section-intro">{checkedText}</p>
          <PaperLinkList
            items={updates.map((paper) => ({ paper }))}
            empty={
              lastCheckedAt
                ? "Nothing new since the last check"
                : "Press Check now to look for papers that cite your list"
            }
            savedIds={savedIds}
            savingId={savingId}
            canSave={!collectionFull}
            onExplore={onExplore}
            onSave={onSave}
          />
        </section>
      )}
    </div>
  );
}
