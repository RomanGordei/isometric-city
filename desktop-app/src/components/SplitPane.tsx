import { useState, useRef, useCallback, useEffect } from "react";
import { Home, FerrisWheel, SplitSquareHorizontal, SplitSquareVertical, X } from "lucide-react";
import { PaneNode, GAMES } from "../types";

interface SplitPaneProps {
  node: PaneNode;
  onSplit: (paneId: string, direction: "horizontal" | "vertical") => void;
  onClose: (paneId: string) => void;
  onResize: (splitId: string, sizes: number[]) => void;
  canClose: boolean;
}

export function SplitPane({ node, onSplit, onClose, onResize, canClose }: SplitPaneProps) {
  if (node.type === "pane") {
    return (
      <PaneView
        pane={node}
        onSplit={onSplit}
        onClose={onClose}
        canClose={canClose}
      />
    );
  }

  return (
    <SplitView
      node={node}
      onSplit={onSplit}
      onClose={onClose}
      onResize={onResize}
      canClose={canClose}
    />
  );
}

interface PaneViewProps {
  pane: Extract<PaneNode, { type: "pane" }>;
  onSplit: (paneId: string, direction: "horizontal" | "vertical") => void;
  onClose: (paneId: string) => void;
  canClose: boolean;
}

function PaneView({ pane, onSplit, onClose, canClose }: PaneViewProps) {
  const [loading, setLoading] = useState(true);
  const game = GAMES[pane.game];
  const Icon = pane.game === "iso-city" ? Home : FerrisWheel;

  return (
    <div className="pane">
      <div className="pane-header">
        <div className="pane-header-title">
          <Icon style={{ color: game.color }} />
          <span>{game.name}</span>
        </div>
        <div className="pane-actions">
          <button
            className="pane-action"
            onClick={() => onSplit(pane.id, "vertical")}
            title="Split Vertically"
          >
            <SplitSquareHorizontal />
          </button>
          <button
            className="pane-action"
            onClick={() => onSplit(pane.id, "horizontal")}
            title="Split Horizontally"
          >
            <SplitSquareVertical />
          </button>
          {canClose && (
            <button
              className="pane-action"
              onClick={() => onClose(pane.id)}
              title="Close Pane"
            >
              <X />
            </button>
          )}
        </div>
      </div>
      <div className="pane-content">
        {loading && (
          <div className="loading-overlay">
            Loading {game.name}...
          </div>
        )}
        <iframe
          src={game.url}
          onLoad={() => setLoading(false)}
          title={game.name}
          style={{ opacity: loading ? 0 : 1 }}
        />
      </div>
    </div>
  );
}

interface SplitViewProps {
  node: Extract<PaneNode, { type: "split" }>;
  onSplit: (paneId: string, direction: "horizontal" | "vertical") => void;
  onClose: (paneId: string) => void;
  onResize: (splitId: string, sizes: number[]) => void;
  canClose: boolean;
}

function SplitView({ node, onSplit, onClose, onResize, canClose }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState(node.sizes);
  const draggingRef = useRef<number | null>(null);

  // Update local sizes when node sizes change
  useEffect(() => {
    setSizes(node.sizes);
  }, [node.sizes]);

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = index;
    document.body.style.cursor = node.direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingRef.current === null || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const isHorizontal = node.direction === "horizontal";
      const containerSize = isHorizontal ? rect.width : rect.height;
      const position = isHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
      
      // Calculate the cumulative size up to this resizer
      const resizerIndex = draggingRef.current;
      let cumulativePercent = 0;
      for (let i = 0; i < resizerIndex; i++) {
        cumulativePercent += sizes[i];
      }

      // Calculate new percentage at this position
      const newPercent = Math.max(10, Math.min(90, (position / containerSize) * 100));
      const newFirstSize = newPercent - cumulativePercent;
      const newSecondSize = sizes[resizerIndex] + sizes[resizerIndex + 1] - newFirstSize;

      if (newFirstSize >= 10 && newSecondSize >= 10) {
        const newSizes = [...sizes];
        newSizes[resizerIndex] = newFirstSize;
        newSizes[resizerIndex + 1] = newSecondSize;
        setSizes(newSizes);
      }
    };

    const handleMouseUp = () => {
      if (draggingRef.current !== null) {
        onResize(node.id, sizes);
      }
      draggingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [node.id, node.direction, sizes, onResize]);

  const isHorizontal = node.direction === "horizontal";

  return (
    <div
      ref={containerRef}
      className={`pane-container ${isHorizontal ? "pane-horizontal" : "pane-vertical"}`}
      style={{
        flexDirection: isHorizontal ? "row" : "column",
      }}
    >
      {node.children.map((child, index) => (
        <div key={child.id} style={{ display: "contents" }}>
          <div
            style={{
              flex: `0 0 ${sizes[index]}%`,
              display: "flex",
              overflow: "hidden",
            }}
          >
            <SplitPane
              node={child}
              onSplit={onSplit}
              onClose={onClose}
              onResize={onResize}
              canClose={canClose}
            />
          </div>
          {index < node.children.length - 1 && (
            <div
              className={`resizer ${isHorizontal ? "resizer-horizontal" : "resizer-vertical"}`}
              onMouseDown={handleMouseDown(index)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
