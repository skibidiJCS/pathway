import type {
  CitationGraphData,
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";
import type { LoadState } from "../../app/app-types";
import { Loader, TriangleAlert } from "lucide-react";
import { BrandMark } from "../../app/BrandMark";
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
            <div className="idle-schematic" aria-hidden="true">
              <div className="schematic-side">
                <span className="schematic-label">References</span>
                <span className="schematic-line" />
                <span className="schematic-line short" />
                <span className="schematic-line" />
              </div>
              <div className="schematic-center">
                <BrandMark size={16} />
                <span>Your paper</span>
              </div>
              <div className="schematic-side">
                <span className="schematic-label">Cited by</span>
                <span className="schematic-line short" />
                <span className="schematic-line" />
                <span className="schematic-line short" />
              </div>
            </div>
            <h1>Start with a paper</h1>
            <p>
              Search by title, DOI, keyword or author, then open a result to
              see what it cites and what cites it. Open any of those papers to
              keep following the path.
            </p>
          </div>
        ) : null}

        {graphState === "loading" ? (
          <div className="graph-state" role="status">
            <Loader className="state-icon spinning" size={20} strokeWidth={1.5} aria-hidden />
            <h2>Loading the citation neighborhood</h2>
            <p>Fetching the paper, its references and the papers that cite it</p>
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
