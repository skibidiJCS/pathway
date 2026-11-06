import type {
  CitationGraphData,
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";
import type { LoadState } from "../../app/app-types";
import { Loader, TriangleAlert } from "lucide-react";
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
  onSelectPaper: (paper: Paper) => void;
  onToggleDetails: () => void;
  onExplorePaper: (paper: Paper) => void;
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
  onSelectPaper,
  onToggleDetails,
  onExplorePaper,
  onSave,
  onRemove,
  onStatusChange,
  onNoteChange,
}: ExploreWorkspaceProps) {
  return (
    <section
      className={`workspace${detailsExpanded ? " details-expanded" : ""}${
        selectedPaper ? " has-selection" : ""
      }`}
    >
      <div className="graph-stage">
        {graphState === "idle" ? (
          <div className="graph-state idle">
            <h1>Start with a paper</h1>
            <p>
              Search for a paper to see what it cites and what cites it, then
              keep following the citations
            </p>
          </div>
        ) : null}

        {graphState === "loading" ? (
          <div className="graph-state" role="status">
            <Loader className="state-icon spinning" size={20} strokeWidth={1.5} aria-hidden />
            <h2>Loading citations</h2>
            
          </div>
        ) : null}

        {graphState === "error" ? (
          <div className="graph-state error" role="alert">
            <TriangleAlert className="state-icon" size={20} strokeWidth={1.5} aria-hidden />
            <h2>Citations unavailable</h2>
            <p>{graphError}</p>
          </div>
        ) : null}

        {graph && graphState === "ready" ? (
          <CitationGraph
            graph={graph}
            visibleNodes={visibleNodes}
            onSelect={onSelectPaper}
            selectedId={selectedPaper?.id ?? graph.centerId}
          />
        ) : null}
      </div>

      <PaperDetails
        paper={selectedPaper}
        expanded={detailsExpanded}
        savedEntry={selectedSavedEntry}
        isCenter={!graph || selectedPaper?.id === graph.centerId}
        collectionFull={collectionFull}
        saving={saving}
        onToggle={onToggleDetails}
        onExplore={onExplorePaper}
        onSave={onSave}
        onRemove={onRemove}
        onStatusChange={onStatusChange}
        onNoteChange={onNoteChange}
      />
    </section>
  );
}
