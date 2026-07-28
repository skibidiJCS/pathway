import { useMemo, useRef, useState } from "react";
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
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [minYear, setMinYear] = useState("");
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [explorationHistory, setExplorationHistory] = useState<Paper[]>(() =>
    loadExplorationHistory(),
  );
  const graphRequestId = useRef(0);

  const visibleNodes = useMemo(() => {
    if (!graph) return [];
    const year = Number(minYear);
    return graph.nodes.filter((paper) => {
      if (paper.id === graph.centerId) return true;
      if (minYear && (paper.year === null || paper.year < year)) return false;
      if (openAccessOnly && !paper.isOpenAccess) return false;
      return true;
    });
  }, [graph, minYear, openAccessOnly]);

  const selectPaper = async (paper: Paper) => {
    releaseMobileFocus();
    const requestId = ++graphRequestId.current;
    setGraphState("loading");
    setGraphError("");
    setGraph(null);
    setSelectedPaper(paper);
    setDetailsExpanded(false);
    setMinYear("");
    setOpenAccessOnly(false);

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
    setDetailsExpanded(false);
    setMinYear("");
    setOpenAccessOnly(false);
  };

  return {
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
  };
}
