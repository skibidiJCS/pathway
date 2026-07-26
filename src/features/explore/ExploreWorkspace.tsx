import type {
  CitationGraphData,
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";
import type { LoadState, Theme } from "../../app/app-types";
import { CitationGraph } from "./CitationGraph";
import { PaperDetails } from "./PaperDetails";

interface ExploreWorkspaceProps {
  graph: CitationGraphData | null;
  graphState: LoadState;
  graphError: string;
  visibleNodes: Paper[];
  selectedPaper: Paper | null;
  selectedSavedEntry: SavedPaper | null;
  detailsExpanded: boolean;
  collectionFull: boolean;
  saving: boolean;
  theme: Theme;
  onSelectPaper: (paper: Paper) => void;
  onToggleDetails: () => void;
  onSave: (paper: Paper) => void;
  onRemove: (paperId: string) => void;
  onStatusChange: (paperId: string, status: ReviewStatus) => void;
  onNoteChange: (paperId: string, note: string) => void;
}

export function ExploreWorkspace({
  graph,
  graphState,
  graphError,
  visibleNodes,
  selectedPaper,
  selectedSavedEntry,
  detailsExpanded,
  collectionFull,
  saving,
  theme,
  onSelectPaper,
  onToggleDetails,
  onSave,
  onRemove,
  onStatusChange,
  onNoteChange,
}: ExploreWorkspaceProps) {
  return (
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
            <p>Loading the selected paper, references, and citing papers.</p>
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
              onSelect={onSelectPaper}
              selectedId={selectedPaper?.id ?? graph.centerId}
              theme={theme}
            />
            <div className="graph-footer">
              Showing {visibleNodes.length} of {graph.nodes.length} papers ·
              click a paper for details
            </div>
          </>
        ) : null}
      </div>

      <PaperDetails
        paper={selectedPaper}
        expanded={detailsExpanded}
        savedEntry={selectedSavedEntry}
        collectionFull={collectionFull}
        saving={saving}
        onToggle={onToggleDetails}
        onSave={onSave}
        onRemove={onRemove}
        onStatusChange={onStatusChange}
        onNoteChange={onNoteChange}
      />
    </section>
  );
}
