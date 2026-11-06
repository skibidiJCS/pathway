import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Paper } from "../../../lib/research-types";
import { nextUnscreened, type ScreenMap } from "../../../lib/screening";
import { ReadingPane } from "./ReadingPane";
import { ScreeningList, type ListRow } from "./ScreeningList";
import { useScreeningKeys } from "./useScreeningKeys";

export interface WorkspaceItem {
  paper: Paper;
  note: string;
}

export interface WorkspaceTab {
  key: string;
  label: string;
  filter: (paper: Paper) => boolean;
}

type Sort = "given" | "most-cited" | "newest" | "oldest";

function sortRows(items: WorkspaceItem[], sort: Sort): WorkspaceItem[] {
  if (sort === "given") return items;
  return [...items].sort((a, b) => {
    if (sort === "most-cited") return b.paper.citationCount - a.paper.citationCount;
    const ay = a.paper.year ?? (sort === "newest" ? -Infinity : Infinity);
    const by = b.paper.year ?? (sort === "newest" ? -Infinity : Infinity);
    return sort === "newest" ? by - ay : ay - by;
  });
}

/**
 * The screening loop: one list, one paper. Save or Skip moves on to the
 * next paper you have not looked at.
 */
export function Workspace({
  header,
  items,
  tabs,
  givenOrderLabel,
  selected,
  fallback,
  screen,
  savedIds,
  savingId,
  collectionFull,
  loading,
  empty,
  onSelect,
  onSave,
  onRemove,
  onSkip,
  onUnskip,
  onFollow,
}: {
  header?: ReactNode;
  items: WorkspaceItem[];
  tabs?: WorkspaceTab[];
  /** When set, the list's own order is a sort option with this label. */
  givenOrderLabel?: string;
  selected: Paper | null;
  /** Shown in the reading pane when nothing in the list is selected. */
  fallback: Paper | null;
  screen: ScreenMap;
  savedIds: Set<string>;
  savingId: string | null;
  collectionFull: boolean;
  loading: boolean;
  empty: string;
  onSelect: (paper: Paper | null) => void;
  onSave: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onSkip: (paperId: string) => void;
  onUnskip: (paperId: string) => void;
  onFollow: (paper: Paper) => void;
}) {
  const [tab, setTab] = useState(tabs?.[0]?.key ?? "");
  const [sort, setSort] = useState<Sort>(givenOrderLabel ? "given" : "most-cited");
  const [hideSkipped, setHideSkipped] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [paneOpen, setPaneOpen] = useState(false);

  const activeTab = tabs?.find((entry) => entry.key === tab) ?? tabs?.[0];
  const visible = useMemo(
    () =>
      sortRows(
        items.filter(
          ({ paper }) =>
            (!activeTab || activeTab.filter(paper)) &&
            (!hideSkipped || screen[paper.id] !== "skipped" || paper.id === selected?.id) &&
            (!openOnly || paper.isOpenAccess),
        ),
        sort,
      ),
    [activeTab, hideSkipped, items, openOnly, screen, selected?.id, sort],
  );
  const rows: ListRow[] = visible.map(({ paper, note }) => ({
    paper,
    note,
    state: screen[paper.id],
    saved: savedIds.has(paper.id),
  }));
  const order = visible.map(({ paper }) => paper.id);
  const shown = selected ?? fallback;
  const shownNote = items.find(({ paper }) => paper.id === shown?.id)?.note ?? "";
  const isListPaper = Boolean(selected && order.includes(selected.id));

  // On phones the reading pane covers the list. Opening it adds a history
  // step, so the system Back gesture closes the paper instead of leaving it.
  const openPane = () => {
    if (paneOpen) return;
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.history.pushState({ pathwayPane: true }, "");
    }
    setPaneOpen(true);
  };

  const closePane = () => {
    if (window.history.state?.pathwayPane) window.history.back();
    else setPaneOpen(false);
  };

  useEffect(() => {
    const onPop = () => setPaneOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const select = (paper: Paper | null) => {
    onSelect(paper);
    if (paper) openPane();
  };

  const advanceFrom = (paperId: string) => {
    const next = nextUnscreened(order, paperId, screen, savedIds);
    if (next) select(items.find(({ paper }) => paper.id === next)?.paper ?? null);
  };

  const move = (step: 1 | -1) => {
    if (order.length === 0) return;
    const index = selected ? order.indexOf(selected.id) : -1;
    const target = Math.min(Math.max(index + step, 0), order.length - 1);
    select(items.find(({ paper }) => paper.id === order[target])?.paper ?? null);
  };

  const save = () => {
    if (!shown || savedIds.has(shown.id) || savingId === shown.id || collectionFull) return;
    onSave(shown);
    if (isListPaper) advanceFrom(shown.id);
  };

  const skip = () => {
    if (!selected || !isListPaper) return;
    onSkip(selected.id);
    advanceFrom(selected.id);
  };

  const follow = () => {
    if (selected && isListPaper) onFollow(selected);
  };

  useScreeningKeys({
    onUp: () => move(-1),
    onDown: () => move(1),
    onSave: save,
    onSkip: skip,
    onFollow: follow,
  });

  const count = (filter?: (paper: Paper) => boolean) =>
    filter ? items.filter(({ paper }) => filter(paper)).length : items.length;

  return (
    <div className={`workspace-shell${paneOpen ? " pane-open" : ""}`}>
      {header ? <div className="workspace-header">{header}</div> : null}
      <div className="workspace-panes">
        <section className="list-pane" aria-label="Papers">
          <div className="list-controls">
            {tabs ? (
              <div className="text-tabs" role="tablist" aria-label="Show">
                {tabs.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab?.key === entry.key}
                    onClick={() => setTab(entry.key)}
                  >
                    {entry.label}
                    <span className="tabular">{count(entry.filter)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="list-options">
              <select
                className="bare-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                aria-label="Sort"
              >
                {givenOrderLabel ? <option value="given">{givenOrderLabel}</option> : null}
                <option value="most-cited">Most cited</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={hideSkipped}
                  onChange={(event) => setHideSkipped(event.target.checked)}
                />
                Hide skipped
              </label>
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(event) => setOpenOnly(event.target.checked)}
                />
                Open access
              </label>
            </div>
          </div>
          {fallback && !loading ? (
            <button
              type="button"
              className="center-row"
              onClick={() => {
                onSelect(null);
                openPane();
              }}
            >
              <span className="center-row-title">{fallback.title}</span>
              <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
          <ScreeningList
            rows={rows}
            selectedId={selected?.id ?? null}
            loading={loading}
            empty={empty}
            onSelect={select}
          />
        </section>

        <ReadingPane
          paper={loading ? fallback : shown}
          note={shownNote}
          saved={Boolean(shown && savedIds.has(shown.id))}
          skipped={Boolean(shown && screen[shown.id] === "skipped")}
          saving={Boolean(shown && savingId === shown.id)}
          collectionFull={collectionFull}
          canFollow={isListPaper}
          onSave={save}
          onRemove={() => shown && onRemove(shown.id)}
          onSkip={skip}
          onUnskip={() => selected && onUnskip(selected.id)}
          onFollow={follow}
          onBack={closePane}
        />
      </div>
    </div>
  );
}
