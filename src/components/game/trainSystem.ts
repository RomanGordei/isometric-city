import React, { useCallback, useRef } from 'react';
import { Train, TrainType, CarDirection, WorldRenderState, TILE_WIDTH, TILE_HEIGHT } from './types';
import { DIRECTION_META } from './constants';
import { isRailTile, getRailDirectionOptions, pickNextRailDirection, findPathOnRails, getDirectionToTile, gridToScreen } from './utils';
import { findResidentialBuildings, findPedestrianDestinations } from './gridFinders';

export interface TrainSystemRefs {
  trainsRef: React.MutableRefObject<Train[]>;
  trainIdRef: React.MutableRefObject<number>;
  trainSpawnTimerRef: React.MutableRefObject<number>;
}

export interface TrainSystemState {
  worldStateRef: React.MutableRefObject<WorldRenderState>;
  gridVersionRef: React.MutableRefObject<number>;
  cachedRailTileCountRef: React.MutableRefObject<{ count: number; gridVersion: number }>;
  isMobile: boolean;
}

// Train colors
const PASSENGER_TRAIN_COLORS = ['#1e40af', '#dc2626', '#059669', '#7c3aed', '#ea580c'];
const FREIGHT_TRAIN_COLORS = ['#374151', '#1f2937', '#4b5563', '#6b7280'];

export function useTrainSystem(
  refs: TrainSystemRefs,
  systemState: TrainSystemState
) {
  const {
    trainsRef,
    trainIdRef,
    trainSpawnTimerRef,
  } = refs;

  const { worldStateRef, gridVersionRef, cachedRailTileCountRef, isMobile } = systemState;

  const findRailStations = useCallback((): { x: number; y: number }[] => {
    const { grid: currentGrid, gridSize: currentGridSize } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0) return [];
    
    const stations: { x: number; y: number }[] = [];
    for (let y = 0; y < currentGridSize; y++) {
      for (let x = 0; x < currentGridSize; x++) {
        if (currentGrid[y][x].building.type === 'rail_station') {
          stations.push({ x, y });
        }
      }
    }
    return stations;
  }, [worldStateRef]);

  const findIndustrialBuildings = useCallback((): { x: number; y: number }[] => {
    const { grid: currentGrid, gridSize: currentGridSize } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0) return [];
    
    const buildings: { x: number; y: number }[] = [];
    for (let y = 0; y < currentGridSize; y++) {
      for (let x = 0; x < currentGridSize; x++) {
        const buildingType = currentGrid[y][x].building.type;
        if (buildingType === 'factory_small' || buildingType === 'factory_medium' || 
            buildingType === 'factory_large' || buildingType === 'warehouse') {
          buildings.push({ x, y });
        }
      }
    }
    return buildings;
  }, [worldStateRef]);

  const spawnRandomTrain = useCallback(() => {
    const { grid: currentGrid, gridSize: currentGridSize } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0) return false;
    
    // Determine train type (70% passenger, 30% freight)
    const trainType: TrainType = Math.random() < 0.7 ? 'passenger' : 'freight';
    
    // Find appropriate spawn and destination
    let startTile: { x: number; y: number } | null = null;
    let destTile: { x: number; y: number } | null = null;
    
    if (trainType === 'passenger') {
      const stations = findRailStations();
      if (stations.length < 2) return false; // Need at least 2 stations
      
      const startIdx = Math.floor(Math.random() * stations.length);
      let destIdx = Math.floor(Math.random() * stations.length);
      while (destIdx === startIdx && stations.length > 1) {
        destIdx = Math.floor(Math.random() * stations.length);
      }
      
      startTile = stations[startIdx];
      destTile = stations[destIdx];
    } else {
      // Freight trains go from industrial buildings to rail stations or other industrial buildings
      const industrial = findIndustrialBuildings();
      const stations = findRailStations();
      
      if (industrial.length === 0 || stations.length === 0) return false;
      
      // 60% chance: industrial -> station, 40% chance: station -> industrial
      if (Math.random() < 0.6) {
        startTile = industrial[Math.floor(Math.random() * industrial.length)];
        destTile = stations[Math.floor(Math.random() * stations.length)];
      } else {
        startTile = stations[Math.floor(Math.random() * stations.length)];
        destTile = industrial[Math.floor(Math.random() * industrial.length)];
      }
    }
    
    if (!startTile || !destTile) return false;
    
    // Find path on rails
    const path = findPathOnRails(currentGrid, currentGridSize, startTile.x, startTile.y, destTile.x, destTile.y);
    if (!path || path.length === 0) return false;
    
    const startPathTile = path[0];
    const options = getRailDirectionOptions(currentGrid, currentGridSize, startPathTile.x, startPathTile.y);
    if (options.length === 0) return false;
    
    let direction: CarDirection = options[0];
    if (path.length > 1) {
      const nextTile = path[1];
      const dir = getDirectionToTile(startPathTile.x, startPathTile.y, nextTile.x, nextTile.y);
      if (dir) direction = dir;
    }
    
    // Create train with multiple carriages
    const numCars = trainType === 'passenger' 
      ? 3 + Math.floor(Math.random() * 3)  // 3-5 passenger cars
      : 4 + Math.floor(Math.random() * 4); // 4-7 freight cars
    
    const cars = [];
    for (let i = 0; i < numCars; i++) {
      cars.push({
        id: trainIdRef.current * 1000 + i,
        type: trainType,
        offset: -(i + 1) * 0.15, // Cars trail behind locomotive
      });
    }
    
    const trainColors = trainType === 'passenger' ? PASSENGER_TRAIN_COLORS : FREIGHT_TRAIN_COLORS;
    const trainMaxAge = isMobile 
      ? 20 + Math.random() * 10   // 20-30 seconds on mobile
      : 30 + Math.random() * 20; // 30-50 seconds on desktop
    
    trainsRef.current.push({
      id: trainIdRef.current++,
      type: trainType,
      tileX: startPathTile.x,
      tileY: startPathTile.y,
      direction,
      progress: Math.random() * 0.8,
      speed: trainType === 'passenger' ? 0.25 + Math.random() * 0.15 : 0.2 + Math.random() * 0.1, // Passenger trains faster
      age: 0,
      maxAge: trainMaxAge,
      cars,
      color: trainColors[Math.floor(Math.random() * trainColors.length)],
    });
    
    return true;
  }, [worldStateRef, trainsRef, trainIdRef, findRailStations, findIndustrialBuildings, isMobile]);

  const updateTrains = useCallback((delta: number) => {
    const { grid: currentGrid, gridSize: currentGridSize, speed: currentSpeed } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0) {
      return;
    }
    
    const speedMultiplier = currentSpeed === 0 ? 0 : currentSpeed === 1 ? 1 : currentSpeed === 2 ? 2.5 : 4;
    
    // Count rail tiles for spawn rate
    const currentGridVersion = gridVersionRef.current;
    let railTileCount: number;
    if (cachedRailTileCountRef.current.gridVersion === currentGridVersion) {
      railTileCount = cachedRailTileCountRef.current.count;
    } else {
      railTileCount = 0;
      for (let y = 0; y < currentGridSize; y++) {
        for (let x = 0; x < currentGridSize; x++) {
          if (currentGrid[y][x].building.type === 'rail') {
            railTileCount++;
          }
        }
      }
      cachedRailTileCountRef.current = { count: railTileCount, gridVersion: currentGridVersion };
    }
    
    const baseMaxTrains = Math.min(30, Math.max(5, Math.floor(railTileCount / 15)));
    const maxTrains = baseMaxTrains;
    
    trainSpawnTimerRef.current -= delta;
    if (trainsRef.current.length < maxTrains && trainSpawnTimerRef.current <= 0) {
      const trainsToSpawn = Math.min(1, maxTrains - trainsRef.current.length);
      let spawnedCount = 0;
      for (let i = 0; i < trainsToSpawn; i++) {
        if (spawnRandomTrain()) {
          spawnedCount++;
        }
      }
      trainSpawnTimerRef.current = spawnedCount > 0 ? 2.0 + Math.random() * 3.0 : 0.5;
    }
    
    // Build spatial index of trains by tile for collision detection
    const trainsByTile = new Map<string, Train[]>();
    for (const train of trainsRef.current) {
      const key = `${train.tileX},${train.tileY}`;
      if (!trainsByTile.has(key)) trainsByTile.set(key, []);
      trainsByTile.get(key)!.push(train);
    }
    
    const updatedTrains: Train[] = [];
    for (const train of [...trainsRef.current]) {
      // Update train age and remove if too old
      train.age += delta * speedMultiplier;
      if (train.age > train.maxAge) {
        continue;
      }
      
      // Skip update if train is somehow off the rail
      const onRail = isRailTile(currentGrid, currentGridSize, train.tileX, train.tileY);
      if (!onRail) {
        // Try to find nearby rail
        let relocated = false;
        for (let r = 1; r <= 5 && !relocated; r++) {
          for (let dy = -r; dy <= r && !relocated; dy++) {
            for (let dx = -r; dx <= r && !relocated; dx++) {
              if (Math.abs(dx) === r || Math.abs(dy) === r) {
                const nx = train.tileX + dx;
                const ny = train.tileY + dy;
                if (isRailTile(currentGrid, currentGridSize, nx, ny)) {
                  train.tileX = nx;
                  train.tileY = ny;
                  train.progress = 0.5;
                  const opts = getRailDirectionOptions(currentGrid, currentGridSize, nx, ny);
                  if (opts.length > 0) {
                    train.direction = opts[Math.floor(Math.random() * opts.length)];
                  }
                  relocated = true;
                }
              }
            }
          }
        }
        if (!relocated) continue;
      }
      
      // Check for train ahead (collision avoidance)
      let shouldStop = false;
      const meta = DIRECTION_META[train.direction];
      const nextX = train.tileX + meta.step.x;
      const nextY = train.tileY + meta.step.y;
      
      // Check same tile for train ahead
      const sameTileTrains = trainsByTile.get(`${train.tileX},${train.tileY}`) || [];
      for (const other of sameTileTrains) {
        if (other.id === train.id) continue;
        if (other.direction === train.direction && other.progress > train.progress) {
          const gap = other.progress - train.progress;
          if (gap < 0.3) { // Trains need more space than cars
            shouldStop = true;
            break;
          }
        }
      }
      
      // Check next tile
      if (!shouldStop && train.progress > 0.7) {
        const nextTileTrains = trainsByTile.get(`${nextX},${nextY}`) || [];
        for (const other of nextTileTrains) {
          if (other.direction === train.direction && other.progress < 0.3) {
            shouldStop = true;
            break;
          }
        }
      }
      
      if (!shouldStop) {
        train.progress += train.speed * delta * speedMultiplier;
      }
      
      let guard = 0;
      while (train.progress >= 1 && guard < 4) {
        guard++;
        const meta = DIRECTION_META[train.direction];
        const newTileX = train.tileX + meta.step.x;
        const newTileY = train.tileY + meta.step.y;
        
        // Check if next tile is valid rail
        if (!isRailTile(currentGrid, currentGridSize, newTileX, newTileY)) {
          const options = getRailDirectionOptions(currentGrid, currentGridSize, train.tileX, train.tileY);
          if (options.length > 0) {
            const otherOptions = options.filter(d => d !== train.direction);
            const newDir = otherOptions.length > 0 
              ? otherOptions[Math.floor(Math.random() * otherOptions.length)]
              : options[Math.floor(Math.random() * options.length)];
            train.direction = newDir;
            train.progress = 0.1;
          } else {
            train.progress = 0.5;
          }
          break;
        }
        
        // Move to new tile
        train.tileX = newTileX;
        train.tileY = newTileY;
        train.progress -= 1;
        
        // Pick next direction
        const nextDirection = pickNextRailDirection(train.direction, currentGrid, currentGridSize, train.tileX, train.tileY);
        if (nextDirection) {
          train.direction = nextDirection;
        } else {
          const options = getRailDirectionOptions(currentGrid, currentGridSize, train.tileX, train.tileY);
          if (options.length > 0) {
            train.direction = options[Math.floor(Math.random() * options.length)];
          }
        }
      }
      
      updatedTrains.push(train);
    }
    
    trainsRef.current = updatedTrains;
  }, [worldStateRef, trainsRef, trainSpawnTimerRef, spawnRandomTrain, gridVersionRef, cachedRailTileCountRef]);

  const drawTrains = useCallback((ctx: CanvasRenderingContext2D) => {
    const { offset: currentOffset, zoom: currentZoom, grid: currentGrid, gridSize: currentGridSize } = worldStateRef.current;
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!currentGrid || currentGridSize <= 0 || trainsRef.current.length === 0) {
      return;
    }
    
    ctx.save();
    ctx.scale(dpr * currentZoom, dpr * currentZoom);
    ctx.translate(currentOffset.x / currentZoom, currentOffset.y / currentZoom);
    
    trainsRef.current.forEach(train => {
      const { screenX, screenY } = gridToScreen(train.tileX, train.tileY, 0, 0);
      const centerX = screenX + TILE_WIDTH / 2;
      const centerY = screenY + TILE_HEIGHT / 2;
      const meta = DIRECTION_META[train.direction];
      
      // Draw locomotive
      const locoX = centerX + meta.vec.dx * train.progress;
      const locoY = centerY + meta.vec.dy * train.progress;
      
      ctx.save();
      ctx.translate(locoX, locoY);
      ctx.rotate(meta.angle);
      
      const scale = train.type === 'passenger' ? 0.7 : 0.8;
      const length = train.type === 'passenger' ? 16 : 18;
      const height = train.type === 'passenger' ? 6 : 7;
      
      // Locomotive body
      ctx.fillStyle = train.color;
      ctx.beginPath();
      ctx.moveTo(-length * scale, -height * scale);
      ctx.lineTo(length * scale, -height * scale);
      ctx.lineTo((length + 2) * scale, 0);
      ctx.lineTo(length * scale, height * scale);
      ctx.lineTo(-length * scale, height * scale);
      ctx.closePath();
      ctx.fill();
      
      // Windows/details
      if (train.type === 'passenger') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(-8 * scale, -3 * scale, 6 * scale, 6 * scale);
        ctx.fillRect(2 * scale, -3 * scale, 6 * scale, 6 * scale);
      } else {
        // Freight locomotive details
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-length * scale, -4 * scale, 4 * scale, 8 * scale);
      }
      
      ctx.restore();
      
      // Draw carriages
      train.cars.forEach((car, index) => {
        const carProgress = train.progress + car.offset;
        let carTileX = train.tileX;
        let carTileY = train.tileY;
        let carProgressLocal = carProgress;
        
        // Handle carriages that span multiple tiles
        while (carProgressLocal < 0 && carTileX >= 0 && carTileY >= 0) {
          const meta = DIRECTION_META[train.direction];
          const oppositeMeta = DIRECTION_META[meta.step.x === -1 ? 'south' : meta.step.x === 1 ? 'north' : meta.step.y === -1 ? 'west' : 'east'];
          carTileX += oppositeMeta.step.x;
          carTileY += oppositeMeta.step.y;
          carProgressLocal += 1;
        }
        
        while (carProgressLocal >= 1 && carTileX < currentGridSize && carTileY < currentGridSize) {
          const meta = DIRECTION_META[train.direction];
          carTileX += meta.step.x;
          carTileY += meta.step.y;
          carProgressLocal -= 1;
        }
        
        if (carTileX < 0 || carTileY < 0 || carTileX >= currentGridSize || carTileY >= currentGridSize) {
          return; // Carriage is off-grid
        }
        
        const { screenX: carScreenX, screenY: carScreenY } = gridToScreen(carTileX, carTileY, 0, 0);
        const carCenterX = carScreenX + TILE_WIDTH / 2;
        const carCenterY = carScreenY + TILE_HEIGHT / 2;
        const carX = carCenterX + meta.vec.dx * carProgressLocal;
        const carY = carCenterY + meta.vec.dy * carProgressLocal;
        
        ctx.save();
        ctx.translate(carX, carY);
        ctx.rotate(meta.angle);
        
        const carScale = train.type === 'passenger' ? 0.6 : 0.65;
        const carLength = train.type === 'passenger' ? 14 : 16;
        const carHeight = train.type === 'passenger' ? 5 : 6;
        
        // Carriage body
        ctx.fillStyle = train.type === 'passenger' ? train.color : '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(-carLength * carScale, -carHeight * carScale);
        ctx.lineTo(carLength * carScale, -carHeight * carScale);
        ctx.lineTo((carLength + 1) * carScale, 0);
        ctx.lineTo(carLength * carScale, carHeight * carScale);
        ctx.lineTo(-carLength * carScale, carHeight * carScale);
        ctx.closePath();
        ctx.fill();
        
        // Carriage details
        if (train.type === 'passenger') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillRect(-6 * carScale, -2.5 * carScale, 4 * carScale, 5 * carScale);
          ctx.fillRect(2 * carScale, -2.5 * carScale, 4 * carScale, 5 * carScale);
        } else {
          // Freight car details
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(-carLength * carScale, -3 * carScale, carLength * 2 * carScale, 6 * carScale);
        }
        
        ctx.restore();
      });
    });
    
    ctx.restore();
  }, [worldStateRef, trainsRef]);

  return {
    spawnRandomTrain,
    updateTrains,
    drawTrains,
  };
}
