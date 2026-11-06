import { Compass } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Paper } from "../../../lib/research-types";
import type { ScreenMap } from "../../../lib/screening";
import type { Suggestion } from "../../../lib/suggestions";
import { loadCitationGraph } from "../../services/openalex-client";
import { EmptyState, PageHeader } from "../library/PageHeader";
import { Workspace } from "./Workspace";

/** Papers your saved list keeps pointing to, screened like any other list. */
export function SuggestedView({
  suggestions,
  savedCount,
  screen,
  savedIds,
  savingId,
  collectionFull,
  onSeen,
  onSave,
  onRemove,
  onSkip,
  onUnskip,
  onFollow,
  onStartExploring,
  keysEnabled,
}: {
  suggestions: Suggestion[];
  savedCount: number;
  screen: ScreenMap;
  savedIds: Set<string>;
  savingId: string | null;
  collectionFull: boolean;
  onSeen: (paperId: string) => void;
  onSave: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onSkip: (paperId: string) => void;
  onUnskip: (paperId: string) => void;
  onFollow: (paper: Paper) => void;
  onStartExploring: () => void;
  keysEnabled: boolean;
}) {
  const [selected, setSelected] = useState<Paper | null>(null);
  // Saved lists store citations without abstracts, so fetch the full record
  // of a suggestion when it is opened, once.
  const [details, setDetails] = useState<Record<string, Paper>>({});
  const selectedId = selected?.id ?? null;
  const needsDetails = Boolean(selected && !selected.abstract && !details[selected.id]);

  useEffect(() => {
    if (!selectedId || !needsDetails) return undefined;
    let cancelled = false;
    loadCitationGraph(selectedId)
      .then((graph) => {
        const full = graph.nodes.find((paper) => paper.id === graph.centerId);
        if (!cancelled && full) {
          setDetails((current) => ({ ...current, [selectedId]: full }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [needsDetails, selectedId]);
  const items = useMemo(
    () =>
      suggestions.map(({ paper, links }) => ({
        paper,
        note: `Linked to ${links} of yours`,
      })),
    [suggestions],
  );

  // Start on the top suggestion, and move on when the selected one leaves the
  // list (skipped or saved), so the pane never shows a paper that is gone.
  useEffect(() => {
    if (selected && items.some(({ paper }) => paper.id === selected.id)) return;
    const next = items[0]?.paper ?? null;
    setSelected(next);
    if (next) onSeen(next.id);
  }, [items, onSeen, selected]);

  if (savedCount < 2) {
    return (
      <div className="scroll-area">
        <div className="page-body">
          <PageHeader title="Suggested" description="Papers your reading list keeps pointing to" />
          <EmptyState
            title={`Save ${savedCount === 1 ? "one more paper" : "two papers"} to get suggestions`}
            action={
              <button type="button" className="button primary" onClick={onStartExploring}>
                <Compass size={16} strokeWidth={1.75} aria-hidden />
                Explore papers
              </button>
            }
          >
            Suggestions are papers linked to two or more of your saved papers
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <Workspace
      header={<h1 className="workspace-title">Suggested</h1>}
      items={items}
      givenOrderLabel="Most linked"
      settingsKey="pathway:list:suggested"
      keysEnabled={keysEnabled}
      selected={selected ? (details[selected.id] ?? selected) : null}
      fallback={null}
      screen={screen}
      savedIds={savedIds}
      savingId={savingId}
      collectionFull={collectionFull}
      loading={false}
      empty="No suggestions yet. Save more papers from the same field"
      onSelect={(paper) => {
        setSelected(paper);
        if (paper) onSeen(paper.id);
      }}
      onSave={onSave}
      onRemove={onRemove}
      onSkip={onSkip}
      onUnskip={onUnskip}
      onFollow={onFollow}
    />
  );
}
