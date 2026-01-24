export type GameType = "iso-city" | "iso-coaster";

export interface GameConfig {
  id: GameType;
  name: string;
  url: string;
  icon: "home" | "ferriswheel";
  color: string;
}

export const GAMES: Record<GameType, GameConfig> = {
  "iso-city": {
    id: "iso-city",
    name: "ISO City",
    url: "https://iso-city.com",
    icon: "home",
    color: "#4ade80",
  },
  "iso-coaster": {
    id: "iso-coaster",
    name: "ISO Coaster",
    url: "https://iso-coaster.com",
    icon: "ferriswheel",
    color: "#f472b6",
  },
};

export interface Pane {
  id: string;
  type: "pane";
  game: GameType;
}

export interface SplitNode {
  id: string;
  type: "split";
  direction: "horizontal" | "vertical";
  children: PaneNode[];
  sizes: number[];
}

export type PaneNode = Pane | SplitNode;
