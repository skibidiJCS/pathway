import { useRef, useState } from "react";
import {
  loadExplorationHistory,
  storeExplorationHistory,
  updateExplorationHistory,
} from "../../../lib/history";
import type {
  CitationGraphData,
  Paper,
} from "../../../lib/research-types";
import { loadCitationGraph } from "../../services/openalex-client";
import type { LoadState } from "../app-types";

function releaseMobileFocus(): void {
  if (!window.matchMedia("(max-width: 620px)").matches) return;
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();
}

export function useCitationExplorer() {
  const [graph, setGraph] = useState<CitationGraphData | null>(null);
  const [graphState, setGraphState] = useState<LoadState>("idle");
  const [graphError, setGraphError] = useState("");
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [explorationHistory, setExplorationHistory] = useState<Paper[]>(() =>
    loadExplorationHistory(),
  );
  const graphRequestId = useRef(0);

  const selectPaper = async (paper: Paper) => {
    releaseMobileFocus();
    const requestId = ++graphRequestId.current;
    setGraphState("loading");
    setGraphError("");
    setGraph(null);
    setSelectedPaper(paper);

    try {
      const nextGraph = await loadCitationGraph(paper.id);
      if (requestId !== graphRequestId.current) return;
      const center =
        nextGraph.nodes.find((node) => node.id === nextGraph.centerId) ?? paper;
      setGraph(nextGraph);
      setSelectedPaper(center);
      setExplorationHistory((current) => {
        const next = updateExplorationHistory(current, center);
        storeExplorationHistory(next);
        return next;
      });
      setGraphState("ready");
    } catch (error) {
      if (requestId !== graphRequestId.current) return;
      setGraphError(
        error instanceof Error
          ? error.message
          : "The citation graph could not be loaded.",
      );
      setGraphState("error");
    }
  };

  const selectGraphPaper = (paper: Paper) => {
    releaseMobileFocus();
    setSelectedPaper(paper);
  };

  const resetExplorer = () => {
    graphRequestId.current += 1;
    setGraph(null);
    setGraphState("idle");
    setGraphError("");
    setSelectedPaper(null);
  };

  return {
    graph,
    graphState,
    graphError,
    selectedPaper,
    explorationHistory,
    selectPaper,
    selectGraphPaper,
    resetExplorer,
  };
}
