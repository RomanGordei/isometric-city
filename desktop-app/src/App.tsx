import { useState, useCallback, useEffect } from "react";
import { PaneNode, GameType } from "./types";
import { SplitPane } from "./components/SplitPane";
import { Sidebar } from "./components/Sidebar";

// Generate unique IDs
let paneIdCounter = 0;
const generatePaneId = (): string => `pane-${++paneIdCounter}`;

function App() {
  const [selectedGame, setSelectedGame] = useState<GameType>("iso-city");
  const [rootPane, setRootPane] = useState<PaneNode>(() => ({
    id: generatePaneId(),
    type: "pane",
    game: "iso-city",
  }));

  // Handle game selection from sidebar
  const handleGameSelect = useCallback((game: GameType) => {
    setSelectedGame(game);
    // Create a new single pane with the selected game
    setRootPane({
      id: generatePaneId(),
      type: "pane",
      game,
    });
  }, []);

  // Split a pane
  const handleSplit = useCallback((paneId: string, direction: "horizontal" | "vertical") => {
    const splitPane = (node: PaneNode): PaneNode => {
      if (node.type === "pane" && node.id === paneId) {
        // Found the pane to split
        return {
          id: generatePaneId(),
          type: "split",
          direction,
          children: [
            node, // Keep the existing pane
            {
              id: generatePaneId(),
              type: "pane",
              game: node.game, // Same game type for the new pane
            },
          ],
          sizes: [50, 50],
        };
      }
      if (node.type === "split") {
        return {
          ...node,
          children: node.children.map(splitPane),
        };
      }
      return node;
    };
    setRootPane(splitPane);
  }, []);

  // Close a pane
  const handleClose = useCallback((paneId: string) => {
    const closePane = (node: PaneNode): PaneNode | null => {
      if (node.type === "pane") {
        return node.id === paneId ? null : node;
      }
      if (node.type === "split") {
        const newChildren = node.children
          .map(closePane)
          .filter((child): child is PaneNode => child !== null);
        
        if (newChildren.length === 0) {
          return null;
        }
        if (newChildren.length === 1) {
          return newChildren[0];
        }
        return {
          ...node,
          children: newChildren,
          sizes: newChildren.map(() => 100 / newChildren.length),
        };
      }
      return node;
    };

    const result = closePane(rootPane);
    if (result) {
      setRootPane(result);
    }
  }, [rootPane]);

  // Count panes to determine if close button should be shown
  const countPanes = (node: PaneNode): number => {
    if (node.type === "pane") return 1;
    return node.children.reduce((sum, child) => sum + countPanes(child), 0);
  };
  const totalPanes = countPanes(rootPane);

  // Handle resize
  const handleResize = useCallback((splitId: string, sizes: number[]) => {
    const updateSizes = (node: PaneNode): PaneNode => {
      if (node.type === "split") {
        if (node.id === splitId) {
          return { ...node, sizes };
        }
        return {
          ...node,
          children: node.children.map(updateSizes),
        };
      }
      return node;
    };
    setRootPane(updateSizes);
  }, []);

  // Save state to localStorage
  useEffect(() => {
    const state = JSON.stringify(rootPane);
    localStorage.setItem("iso-games-pane-state", state);
  }, [rootPane]);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("iso-games-pane-state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRootPane(parsed);
        // Update selected game based on first pane found
        const findFirstGame = (node: PaneNode): GameType | null => {
          if (node.type === "pane") return node.game;
          for (const child of node.children) {
            const game = findFirstGame(child);
            if (game) return game;
          }
          return null;
        };
        const firstGame = findFirstGame(parsed);
        if (firstGame) setSelectedGame(firstGame);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  return (
    <div className="app-container">
      <Sidebar
        selectedGame={selectedGame}
        onGameSelect={handleGameSelect}
      />
      <div className="main-content">
        <div className="pane-container">
          <SplitPane
            node={rootPane}
            onSplit={handleSplit}
            onClose={handleClose}
            onResize={handleResize}
            canClose={totalPanes > 1}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
