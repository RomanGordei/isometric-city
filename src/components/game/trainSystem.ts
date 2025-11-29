import React, { useCallback } from 'react';
import { Train, CarDirection, WorldRenderState, TILE_WIDTH, TILE_HEIGHT } from './types';
import { TRAIN_COLORS, TRAIN_MIN_ZOOM, DIRECTION_META } from './constants';
import { findRailStations } from './gridFinders';
import { isRailTile, getRailDirectionOptions, findPathOnRails, getDirectionToTile, gridToScreen } from './utils';

export interface TrainSystemRefs {
  trainsRef: React.MutableRefObject<Train[]>;
  trainIdRef: React.MutableRefObject<number>;
  trainSpawnTimerRef: React.MutableRefObject<number>;
}

export interface TrainSystemState {
  worldStateRef: React.MutableRefObject<WorldRenderState>;
  isMobile: boolean;
}

function getSpeedMultiplier(speed: WorldRenderState['speed']): number {
  if (speed === 0) return 0;
  if (speed === 1) return 1;
  if (speed === 2) return 2.2;
  return 3.4;
}

export function useTrainSystem(refs: TrainSystemRefs, state: TrainSystemState) {
  const { trainsRef, trainIdRef, trainSpawnTimerRef } = refs;
  const { worldStateRef } = state;

  const spawnTrain = useCallback((): boolean => {
    const { grid: currentGrid, gridSize: currentGridSize } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0) return false;

    const stations = findRailStations(currentGrid, currentGridSize);
    if (stations.length < 2) return false;

    for (let attempt = 0; attempt < 20; attempt++) {
      const start = stations[Math.floor(Math.random() * stations.length)];
      let dest = stations[Math.floor(Math.random() * stations.length)];
      if (dest.x === start.x && dest.y === start.y) continue;

      const path = findPathOnRails(currentGrid, currentGridSize, start.x, start.y, dest.x, dest.y);
      if (!path || path.length < 2) continue;

      const firstStep = path[1];
      const direction = getDirectionToTile(start.x, start.y, firstStep.x, firstStep.y) ?? 'south';
      const color = TRAIN_COLORS[trainIdRef.current % TRAIN_COLORS.length];
      trainsRef.current.push({
        id: trainIdRef.current++,
        tileX: start.x,
        tileY: start.y,
        direction,
        progress: 0,
        speed: 0.45 + Math.random() * 0.2,
        path,
        pathIndex: 0,
        state: 'outbound',
        originX: start.x,
        originY: start.y,
        destX: dest.x,
        destY: dest.y,
        color,
        length: Math.max(38, TILE_WIDTH * 0.6),
      });
      return true;
    }

    return false;
  }, [trainIdRef, trainsRef, worldStateRef]);

  const updateTrains = useCallback((delta: number) => {
    const { grid: currentGrid, gridSize: currentGridSize, speed: currentSpeed } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0) {
      trainsRef.current = [];
      return;
    }

    const speedMultiplier = getSpeedMultiplier(currentSpeed);
    trainSpawnTimerRef.current -= delta * (speedMultiplier || 1);
    if (speedMultiplier > 0 && trainSpawnTimerRef.current <= 0) {
      if (spawnTrain()) {
        trainSpawnTimerRef.current = 6 + Math.random() * 5;
      } else {
        trainSpawnTimerRef.current = 4;
      }
    }

    const updated: Train[] = [];

    trainsRef.current.forEach(train => {
      if (!isRailTile(currentGrid, currentGridSize, train.tileX, train.tileY)) {
        return;
      }

      train.progress += train.speed * delta * speedMultiplier;

      while (train.progress >= 1 && train.pathIndex < train.path.length - 1) {
        train.pathIndex += 1;
        train.progress -= 1;
        const node = train.path[train.pathIndex];
        train.tileX = node.x;
        train.tileY = node.y;

        if (!isRailTile(currentGrid, currentGridSize, node.x, node.y)) {
          return;
        }

        if (train.pathIndex < train.path.length - 1) {
          const nextTile = train.path[train.pathIndex + 1];
          const dir = getDirectionToTile(node.x, node.y, nextTile.x, nextTile.y);
          if (dir) {
            train.direction = dir;
          }
        }
      }

      if (train.pathIndex >= train.path.length - 1 && train.progress >= 0.999) {
        // Arrived at destination
        train.tileX = train.destX;
        train.tileY = train.destY;

        if (train.state === 'outbound') {
          const returnPath = findPathOnRails(currentGrid, currentGridSize, train.destX, train.destY, train.originX, train.originY);
          if (!returnPath || returnPath.length < 2) {
            return;
          }
          train.path = returnPath;
          train.pathIndex = 0;
          train.progress = 0;
          const firstStep = returnPath[1];
          train.direction = getDirectionToTile(train.destX, train.destY, firstStep.x, firstStep.y) ?? train.direction;
          train.state = 'returning';
          // swap origin/dest for next cycle
          const newOriginX = train.destX;
          const newOriginY = train.destY;
          train.destX = train.originX;
          train.destY = train.originY;
          train.originX = newOriginX;
          train.originY = newOriginY;
        } else {
          // Completed round trip; attempt a new destination
          const stations = findRailStations(currentGrid, currentGridSize).filter(st => st.x !== train.originX || st.y !== train.originY);
          if (stations.length === 0) {
            return;
          }
          const nextDest = stations[Math.floor(Math.random() * stations.length)];
          const newPath = findPathOnRails(currentGrid, currentGridSize, train.originX, train.originY, nextDest.x, nextDest.y);
          if (!newPath || newPath.length < 2) {
            return;
          }
          train.path = newPath;
          train.pathIndex = 0;
          train.progress = 0;
          const firstStep = newPath[1];
          train.direction = getDirectionToTile(train.originX, train.originY, firstStep.x, firstStep.y) ?? train.direction;
          train.destX = nextDest.x;
          train.destY = nextDest.y;
          train.state = 'outbound';
        }
      }

      train.speed = Math.min(0.55, train.speed * (train.state === 'outbound' ? 1.0 : 0.95 + Math.random() * 0.1));
      updated.push(train);
    });

    trainsRef.current = updated;
  }, [spawnTrain, trainSpawnTimerRef, trainsRef, worldStateRef]);

  const drawTrains = useCallback((ctx: CanvasRenderingContext2D) => {
    const { offset: currentOffset, zoom: currentZoom, grid: currentGrid, gridSize: currentGridSize } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0 || trainsRef.current.length === 0) {
      return;
    }

    if (currentZoom < TRAIN_MIN_ZOOM) {
      return;
    }

    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.scale(dpr * currentZoom, dpr * currentZoom);
    ctx.translate(currentOffset.x / currentZoom, currentOffset.y / currentZoom);

    trainsRef.current.forEach(train => {
      const { screenX, screenY } = gridToScreen(train.tileX, train.tileY, 0, 0);
      const centerX = screenX + TILE_WIDTH / 2;
      const centerY = screenY + TILE_HEIGHT / 2;
      const meta = DIRECTION_META[train.direction];
      const railOffsetX = meta.vec.dx * train.progress;
      const railOffsetY = meta.vec.dy * train.progress;

      ctx.save();
      ctx.translate(centerX + railOffsetX, centerY + railOffsetY);
      ctx.rotate(meta.angle);

      ctx.fillStyle = train.color;
      const bodyWidth = 12;
      const bodyLength = train.length;
      ctx.beginPath();
      ctx.moveTo(-bodyLength / 2, -bodyWidth / 2);
      ctx.lineTo(bodyLength / 2, -bodyWidth / 2);
      ctx.lineTo(bodyLength / 2 + 6, 0);
      ctx.lineTo(bodyLength / 2, bodyWidth / 2);
      ctx.lineTo(-bodyLength / 2, bodyWidth / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(-bodyLength / 4, -bodyWidth / 3, bodyLength / 2, bodyWidth * 2 / 3);

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(-bodyLength / 2, -bodyWidth / 2, 4, bodyWidth);
      ctx.fillRect(bodyLength / 2 - 4, -bodyWidth / 2, 4, bodyWidth);

      ctx.restore();
    });

    ctx.restore();
  }, [trainsRef, worldStateRef]);

  return {
    updateTrains,
    drawTrains,
  };
}
