import { CardinalDirection } from '@/core/types';
import { CoasterParkState, CoasterTile, Finance, Guest, ParkStats, PathInfo, Research, WeatherState } from '@/games/coaster/types';
import { findPath } from '@/lib/coasterPathfinding';

export const DEFAULT_COASTER_GRID_SIZE = 50;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function createInitialGrid(size: number): CoasterTile[][] {
  const grid: CoasterTile[][] = [];
  for (let y = 0; y < size; y++) {
    const row: CoasterTile[] = [];
    for (let x = 0; x < size; x++) {
      row.push({
        x,
        y,
        terrain: 'grass',
        height: 0,
        path: null,
        building: null,
        rideId: null,
        track: null,
        scenery: null,
        zoneId: null,
      });
    }
    grid.push(row);
  }
  return grid;
}

const DIRECTION_VECTORS: Record<CardinalDirection, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
};

const OPPOSITE_DIRECTION: Record<CardinalDirection, CardinalDirection> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};

const GUEST_SPAWN_INTERVAL = 8;
const MAX_GUESTS = 120;

function createGuest(id: number, tileX: number, tileY: number): Guest {
  const colors = ['#60a5fa', '#f87171', '#facc15', '#34d399', '#a78bfa'];
  const pickColor = () => colors[Math.floor(Math.random() * colors.length)];
  return {
    id,
    name: `Guest ${id}`,
    tileX,
    tileY,
    direction: 'south',
    progress: 0,
    state: 'wandering',
    stateTimer: 0,
    needs: {
      hunger: 200,
      thirst: 200,
      bathroom: 200,
      happiness: 180,
      nausea: 0,
      energy: 220,
    },
    happiness: 180,
    energy: 220,
    money: 50 + Math.floor(Math.random() * 50),
    thoughts: [],
    currentRideId: null,
    targetRideId: null,
    path: [],
    pathIndex: 0,
    age: 0,
    maxAge: 600,
    colors: {
      skin: '#f3d9b1',
      shirt: pickColor(),
      pants: '#1f2937',
      hat: Math.random() > 0.6 ? pickColor() : undefined,
    },
    hasItem: null,
  };
}

function updateGuestMovement(guest: Guest, state: CoasterParkState): Guest {
  const grid = state.grid;
  const speed = 0.4;
  const nextAge = guest.age + 1;

  if (guest.state === 'on_ride') {
    const nextTimer = guest.stateTimer - 1;
    if (nextTimer <= 0) {
      const exitOptions = (Object.keys(DIRECTION_VECTORS) as CardinalDirection[])
        .map((direction) => {
          const delta = DIRECTION_VECTORS[direction];
          return { x: guest.tileX + delta.dx, y: guest.tileY + delta.dy };
        })
        .filter((pos) => grid[pos.y]?.[pos.x]?.path);
      const exitTile = exitOptions.length > 0 ? exitOptions[Math.floor(Math.random() * exitOptions.length)] : { x: guest.tileX, y: guest.tileY };
      return {
        ...guest,
        state: 'wandering',
        stateTimer: 0,
        targetRideId: null,
        path: [],
        pathIndex: 0,
        tileX: exitTile.x,
        tileY: exitTile.y,
        progress: 0,
        age: nextAge,
      };
    }
    return { ...guest, stateTimer: nextTimer, age: nextAge };
  }

  if (guest.path.length > 1 && guest.pathIndex < guest.path.length - 1) {
    const nextTarget = guest.path[guest.pathIndex + 1];
    const dx = nextTarget.x - guest.tileX;
    const dy = nextTarget.y - guest.tileY;
    const direction = dx > 0 ? 'east' : dx < 0 ? 'west' : dy > 0 ? 'south' : 'north';
    const nextProgress = guest.progress + speed;
    if (nextProgress < 1) {
      return { ...guest, progress: nextProgress, direction, age: nextAge };
    }
    const reachedEnd = guest.pathIndex + 1 >= guest.path.length - 1;
    const nextState = reachedEnd && guest.targetRideId ? 'on_ride' : guest.state;
    return {
      ...guest,
      tileX: nextTarget.x,
      tileY: nextTarget.y,
      direction,
      progress: 0,
      pathIndex: guest.pathIndex + 1,
      state: nextState,
      stateTimer: nextState === 'on_ride' ? 6 : guest.stateTimer,
      age: nextAge,
    };
  }

  const nextProgress = guest.progress + speed;
  if (nextProgress < 1) {
    return { ...guest, progress: nextProgress, age: nextAge };
  }

  const currentTile = grid[guest.tileY]?.[guest.tileX];
  if (!currentTile?.path) {
    return { ...guest, progress: 0, age: nextAge };
  }

  const edges = currentTile.path.edges;
  const options = (Object.keys(edges) as CardinalDirection[]).filter((direction) => edges[direction]);
  if (options.length === 0) {
    return { ...guest, progress: 0, age: nextAge };
  }

  const preferredOptions = options.filter((direction) => direction !== OPPOSITE_DIRECTION[guest.direction]);
  const choices = preferredOptions.length > 0 ? preferredOptions : options;
  const nextDirection = choices[Math.floor(Math.random() * choices.length)];
  const vector = DIRECTION_VECTORS[nextDirection];
  const nextX = guest.tileX + vector.dx;
  const nextY = guest.tileY + vector.dy;
  if (!grid[nextY]?.[nextX]?.path) {
    return { ...guest, progress: 0, age: nextAge };
  }

  return {
    ...guest,
    tileX: nextX,
    tileY: nextY,
    direction: nextDirection,
    progress: 0,
    age: nextAge,
  };
}

function updateGuests(state: CoasterParkState): CoasterParkState {
  let nextGuests = state.guests.map((guest) => updateGuestMovement(guest, state));
  nextGuests = nextGuests.filter((guest) => guest.age < guest.maxAge);
  let totalGuests = state.stats.totalGuests;

  const availableRides = state.rides.filter((ride) => ride.status === 'open');
  if (availableRides.length > 0) {
    nextGuests = nextGuests.map((guest) => {
      if (guest.state !== 'wandering' || guest.targetRideId) return guest;
      const ride = availableRides[Math.floor(Math.random() * availableRides.length)];
      const path = findPath({ x: guest.tileX, y: guest.tileY }, ride.entrance, state.grid);
      if (!path || path.length < 2) return guest;
      return {
        ...guest,
        state: 'heading_to_ride',
        targetRideId: ride.id,
        path,
        pathIndex: 0,
        progress: 0,
      };
    });
  }

  if (state.tick % GUEST_SPAWN_INTERVAL === 0 && nextGuests.length < MAX_GUESTS) {
    const entranceTile = state.grid[state.parkEntrance.y]?.[state.parkEntrance.x];
    if (entranceTile?.path) {
      const nextId = state.guests.length > 0 ? Math.max(...state.guests.map((g) => g.id)) + 1 : 1;
      nextGuests = [...nextGuests, createGuest(nextId, state.parkEntrance.x, state.parkEntrance.y)];
      totalGuests += 1;
    }
  }

  return {
    ...state,
    guests: nextGuests,
    stats: {
      ...state.stats,
      guestsInPark: nextGuests.length,
      totalGuests,
    },
  };
}

function createDefaultStats(): ParkStats {
  return {
    guestsInPark: 0,
    totalGuests: 0,
    rating: 550,
    cleanliness: 80,
    excitement: 40,
    nausea: 0,
  };
}

function createDefaultFinance(): Finance {
  return {
    cash: 12000,
    loan: 0,
    loanInterestRate: 0.04,
    entranceFee: 10,
    income: 0,
    expenses: 0,
    rideRevenue: 0,
    shopRevenue: 0,
    staffCost: 0,
    maintenanceCost: 0,
    researchCost: 0,
    transactions: [],
  };
}

function createDefaultResearch(): Research {
  return {
    activeResearchId: null,
    funding: 0.2,
    items: [],
  };
}

function createDefaultWeather(): WeatherState {
  return {
    type: 'sunny',
    temperature: 22,
    rainLevel: 0,
    windSpeed: 5,
  };
}

function createPathInfo(edges: PathInfo['edges']): PathInfo {
  return {
    style: 'concrete',
    isQueue: false,
    queueRideId: null,
    edges,
    slope: 'flat',
    railing: false,
    isBridge: false,
  };
}

export function createInitialCoasterState(
  size: number = DEFAULT_COASTER_GRID_SIZE,
  parkName: string = 'Coaster Park'
): CoasterParkState {
  const entranceX = Math.floor(size / 2);
  const entranceY = size - 2;

  const grid = createInitialGrid(size);
  if (grid[entranceY]?.[entranceX]) {
    const northTile = grid[entranceY - 1]?.[entranceX];
    grid[entranceY][entranceX] = {
      ...grid[entranceY][entranceX],
      path: createPathInfo({ north: Boolean(northTile), east: false, south: false, west: false }),
    };
    if (northTile) {
      grid[entranceY - 1][entranceX] = {
        ...northTile,
        path: createPathInfo({ north: false, east: false, south: true, west: false }),
      };
    }
  }

  return {
    id: generateUUID(),
    parkName,
    grid,
    gridSize: size,
    year: 1,
    month: 1,
    day: 1,
    hour: 9,
    tick: 0,
    speed: 1,
    selectedTool: 'select',
    stats: createDefaultStats(),
    finance: createDefaultFinance(),
    rides: [],
    guests: [],
    staff: [],
    research: createDefaultResearch(),
    weather: createDefaultWeather(),
    activePanel: 'none',
    parkEntrance: { x: entranceX, y: entranceY },
    parkExit: { x: entranceX, y: entranceY + 1 < size ? entranceY + 1 : entranceY },
    gameVersion: 0,
  };
}

export function simulateCoasterTick(state: CoasterParkState): CoasterParkState {
  const nextTick = state.tick + 1;
  let { hour, day, month, year } = state;

  if (nextTick % 60 === 0) {
    hour = (hour + 1) % 24;
    if (hour === 0) {
      day += 1;
      if (day > 30) {
        day = 1;
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
      }
    }
  }

  const nextState: CoasterParkState = {
    ...state,
    tick: nextTick,
    hour,
    day,
    month,
    year,
  };

  return updateGuests(nextState);
}
