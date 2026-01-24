import { Home, FerrisWheel } from "lucide-react";
import { GameType } from "../types";

interface SidebarProps {
  selectedGame: GameType;
  onGameSelect: (game: GameType) => void;
}

export function Sidebar({ selectedGame, onGameSelect }: SidebarProps) {
  return (
    <div className="sidebar">
      <button
        className={`sidebar-icon ${selectedGame === "iso-city" ? "active" : ""}`}
        onClick={() => onGameSelect("iso-city")}
        title="ISO City"
      >
        <Home />
      </button>
      <button
        className={`sidebar-icon ${selectedGame === "iso-coaster" ? "active" : ""}`}
        onClick={() => onGameSelect("iso-coaster")}
        title="ISO Coaster"
      >
        <FerrisWheel />
      </button>
      <div className="sidebar-divider" />
    </div>
  );
}
