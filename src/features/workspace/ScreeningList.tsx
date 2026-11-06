import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Paper } from "../../../lib/research-types";
import type { ScreenState } from "../../../lib/screening";

export interface ListRow {
  paper: Paper;
  note: string;
  state: ScreenState | undefined;
  saved: boolean;
}

const statusLabel: Record<string, string> = {
  unseen: "Unread",
  seen: "Seen",
  skipped: "Skipped",
  saved: "Saved",
};

export function ScreeningList({
  rows,
  selectedId,
  loading,
  empty,
  onSelect,
}: {
  rows: ListRow[];
  selectedId: string | null;
  loading: boolean;
  empty: string;
  onSelect: (paper: Paper) => void;
}) {
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector(`[data-id="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  if (loading) {
    return (
      <ol className="screen-list" aria-busy="true" aria-label="Loading papers">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="screen-row placeholder" aria-hidden="true">
            <span className="placeholder-line wide" />
            <span className="placeholder-line" />
          </li>
        ))}
      </ol>
    );
  }

  if (rows.length === 0) return <p className="screen-empty">{empty}</p>;

  return (
    <ol className="screen-list" ref={listRef}>
      {rows.map((row, index) => {
        const selected = row.paper.id === selectedId;
        const status = row.saved ? "saved" : (row.state ?? "unseen");
        return (
          <li key={row.paper.id} style={{ ["--i" as string]: Math.min(index, 9) }}>
            <button
              type="button"
              data-id={row.paper.id}
              className={`screen-row ${status}${selected ? " selected" : ""}`}
              onClick={() => onSelect(row.paper)}
              aria-current={selected ? "true" : undefined}
            >
              <span className="screen-row-title">{row.paper.title}</span>
              <span className="visually-hidden">{statusLabel[status]}</span>
              <span className="meta-row tabular">
                <span>{row.paper.year ?? "Year unknown"}</span>
                <span>{row.paper.citationCount.toLocaleString()} citations</span>
                {row.note ? <span>{row.note}</span> : null}
              </span>
              {row.saved ? (
                <Check className="screen-row-check" size={16} strokeWidth={2} aria-hidden />
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
