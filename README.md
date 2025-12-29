# IsoCity

Try for free at [iso-city.com](https://iso-city.com)!

IsoCity is a open-source isometric city-building simulation game built with **Next.js**, **TypeScript**, and **Tailwind CSS**. It leverages the HTML5 Canvas API for high-performance rendering of isometric graphics, featuring complex systems for economic simulation, trains, planes, seaplanes, helicopters, cars, pedestrians, and more.

![IsoCity Banner](public/readme-image.png)

Made with [Cursor](https://cursor.com)

## Features

-   **Isometric Rendering Engine**: Custom-built rendering system using HTML5 Canvas (`CanvasIsometricGrid`) capable of handling complex depth sorting and layer management.
-   **Dynamic Simulation**:
    -   **Traffic System**: Autonomous vehicles including cars, trains, and aircraft (planes/seaplanes).
    -   **Pedestrian System**: Pathfinding and crowd simulation for city inhabitants.
    -   **Economy & Resources**: Resource management, zoning (Residential, Commercial, Industrial), and city growth logic.
-   **Interactive Grid**: Tile-based placement system for buildings, roads, parks, and utilities.
-   **State Management**: Save/Load functionality for multiple cities.
-   **Responsive Design**: Mobile-friendly interface with specialized touch controls and toolbars.

## Tech Stack

-   **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/) components.
-   **Graphics**: HTML5 Canvas API (No external game engine libraries; pure native implementation).
-   **Icons**: Lucide React.

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/amilich/isometric-city.git
    cd isometric-city
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the game:**
    Visit [http://localhost:3000](http://localhost:3000) in your browser.
    - Rise prototype: [http://localhost:3000/rise](http://localhost:3000/rise)

### Production build

`npm run build` is configured to set `TURBOPACK=0` to avoid upstream font resolution issues in turbopack. If you run `next build` directly, set `TURBOPACK=0` in your environment for the same behavior.

## Rise mode controls (prototype)

- Speed: `1/2/3`, Pause: `0` or `Space`
- Spawn citizen: `C`; Age up: `A`
- Build: Barracks `B`, Farm `F`
- Selection helpers: Idle worker `I`, Army group cycle `M`
- Camera: Pan `WASD` / Arrows; Center on city `H`, enemy `E`
- Alerts: Jump to last alert `J`; Toggle alerts `L`; Clear selection/build `Esc`
- Mouse: Drag to select; Right-click to move/gather/attack; Shift+Right-click = attack-move

## Contributing

Contributions are welcome! Whether it's reporting a bug, proposing a new feature, or submitting a pull request, your input is valued.

Please ensure your code follows the existing style and conventions.

## License

Distributed under the MIT License. See `LICENSE` for more information.
