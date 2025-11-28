import { useRef, useCallback } from 'react';
import { EmergencyVehicle, EmergencyVehicleType, CarDirection, WorldRenderState } from '../types';
import { findStations, findFires } from '../gridFinders';
import { isRoadTile, findPathOnRoads, getDirectionToTile } from '../utils';

export function useEmergencyVehicles(
  worldStateRef: React.MutableRefObject<WorldRenderState>,
  activeFiresRef: React.MutableRefObject<Set<string>>,
  activeCrimesRef: React.MutableRefObject<Set<string>>,
  activeCrimeIncidentsRef: React.MutableRefObject<Map<string, { x: number; y: number; type: 'robbery' | 'burglary' | 'disturbance' | 'traffic'; timeRemaining: number }>>,
  findCrimeIncidents: () => { x: number; y: number }[]
) {
  const emergencyVehiclesRef = useRef<EmergencyVehicle[]>([]);
  const emergencyVehicleIdRef = useRef(0);
  const emergencyDispatchTimerRef = useRef(0);

  const dispatchEmergencyVehicle = useCallback((
    type: EmergencyVehicleType,
    stationX: number,
    stationY: number,
    targetX: number,
    targetY: number
  ): boolean => {
    const { grid: currentGrid, gridSize: currentGridSize } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0) return false;

    const path = findPathOnRoads(currentGrid, currentGridSize, stationX, stationY, targetX, targetY);
    if (!path || path.length === 0) return false;

    const startTile = path[0];
    let direction: CarDirection = 'south'; // Default direction
    
    // If path has at least 2 tiles, get direction from first to second
    if (path.length >= 2) {
      const nextTile = path[1];
      const dir = getDirectionToTile(startTile.x, startTile.y, nextTile.x, nextTile.y);
      if (dir) direction = dir;
    }

    emergencyVehiclesRef.current.push({
      id: emergencyVehicleIdRef.current++,
      type,
      tileX: startTile.x,
      tileY: startTile.y,
      direction,
      progress: 0,
      speed: type === 'fire_truck' ? 0.8 : 0.9, // Emergency vehicles are faster
      state: 'dispatching',
      stationX,
      stationY,
      targetX,
      targetY,
      path,
      pathIndex: 0,
      respondTime: 0,
      laneOffset: 0, // Emergency vehicles drive in the center
      flashTimer: 0,
    });

    return true;
  }, [worldStateRef]);

  const updateEmergencyDispatch = useCallback(() => {
    const { grid: currentGrid, gridSize: currentGridSize, speed: currentSpeed } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0 || currentSpeed === 0) return;
    
    const fires = findFires(currentGrid, currentGridSize);
    const fireStations = findStations(currentGrid, currentGridSize, 'fire_station');
    
    for (const fire of fires) {
      const fireKey = `${fire.x},${fire.y}`;
      if (activeFiresRef.current.has(fireKey)) continue;
      
      // Find nearest fire station
      let nearestStation: { x: number; y: number } | null = null;
      let nearestDist = Infinity;
      
      for (const station of fireStations) {
        const dist = Math.abs(station.x - fire.x) + Math.abs(station.y - fire.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestStation = station;
        }
      }
      
      if (nearestStation) {
        if (dispatchEmergencyVehicle('fire_truck', nearestStation.x, nearestStation.y, fire.x, fire.y)) {
          activeFiresRef.current.add(fireKey);
        }
      }
    }

    // Find crimes that need police dispatched
    const crimes = findCrimeIncidents();
    const policeStations = findStations(currentGrid, currentGridSize, 'police_station');
    
    // Limit police dispatches per update (increased for more action)
    let dispatched = 0;
    const maxDispatchPerCheck = Math.max(3, Math.min(6, policeStations.length * 2)); // Scale with stations
    for (const crime of crimes) {
      if (dispatched >= maxDispatchPerCheck) break;
      
      const crimeKey = `${crime.x},${crime.y}`;
      if (activeCrimesRef.current.has(crimeKey)) continue;
      
      // Find nearest police station
      let nearestStation: { x: number; y: number } | null = null;
      let nearestDist = Infinity;
      
      for (const station of policeStations) {
        const dist = Math.abs(station.x - crime.x) + Math.abs(station.y - crime.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestStation = station;
        }
      }
      
      if (nearestStation) {
        if (dispatchEmergencyVehicle('police_car', nearestStation.x, nearestStation.y, crime.x, crime.y)) {
          activeCrimesRef.current.add(crimeKey);
          dispatched++;
        }
      }
    }
  }, [worldStateRef, activeFiresRef, activeCrimesRef, findCrimeIncidents, dispatchEmergencyVehicle]);

  const updateEmergencyVehicles = useCallback((delta: number) => {
    const { grid: currentGrid, gridSize: currentGridSize, speed: currentSpeed } = worldStateRef.current;
    if (!currentGrid || currentGridSize <= 0) {
      emergencyVehiclesRef.current = [];
      return;
    }

    const speedMultiplier = currentSpeed === 0 ? 0 : currentSpeed === 1 ? 1 : currentSpeed === 2 ? 2.5 : 4;
    
    // Dispatch check every second or so
    emergencyDispatchTimerRef.current -= delta;
    if (emergencyDispatchTimerRef.current <= 0) {
      updateEmergencyDispatch();
      emergencyDispatchTimerRef.current = 1.5;
    }

    const updatedVehicles: EmergencyVehicle[] = [];
    
    for (const vehicle of [...emergencyVehiclesRef.current]) {
      // Update flash timer for lights
      vehicle.flashTimer += delta * 8;
      
      if (vehicle.state === 'responding') {
        // Check if vehicle is still on a valid road (road might have been bulldozed)
        if (!isRoadTile(currentGrid, currentGridSize, vehicle.tileX, vehicle.tileY)) {
          const targetKey = `${vehicle.targetX},${vehicle.targetY}`;
          if (vehicle.type === 'fire_truck') {
            activeFiresRef.current.delete(targetKey);
          } else {
            activeCrimesRef.current.delete(targetKey);
            activeCrimeIncidentsRef.current.delete(targetKey); // Also clear the crime incident
          }
          continue; // Remove vehicle
        }
        
        // At the scene - spend some time responding
        vehicle.respondTime += delta * speedMultiplier;
        const respondDuration = vehicle.type === 'fire_truck' ? 8 : 5; // Fire trucks stay longer
        
        if (vehicle.respondTime >= respondDuration) {
          // Done responding - crime is resolved, calculate return path
          const targetKey = `${vehicle.targetX},${vehicle.targetY}`;
          
          // Clear the crime incident when police finish responding
          if (vehicle.type === 'police_car') {
            activeCrimeIncidentsRef.current.delete(targetKey);
          }
          
          const returnPath = findPathOnRoads(
            currentGrid, currentGridSize,
            vehicle.tileX, vehicle.tileY,
            vehicle.stationX, vehicle.stationY
          );
          
          if (returnPath && returnPath.length >= 2) {
            vehicle.path = returnPath;
            vehicle.pathIndex = 0;
            vehicle.state = 'returning';
            vehicle.progress = 0;
            
            const nextTile = returnPath[1];
            const dir = getDirectionToTile(vehicle.tileX, vehicle.tileY, nextTile.x, nextTile.y);
            if (dir) vehicle.direction = dir;
          } else if (returnPath && returnPath.length === 1) {
            // Already at station's road - remove vehicle
            if (vehicle.type === 'fire_truck') {
              activeFiresRef.current.delete(targetKey);
            } else {
              activeCrimesRef.current.delete(targetKey);
            }
            continue;
          } else {
            // Can't find return path - remove vehicle and clear tracking
            if (vehicle.type === 'fire_truck') {
              activeFiresRef.current.delete(targetKey);
            } else {
              activeCrimesRef.current.delete(targetKey);
            }
            continue;
          }
        }
        
        updatedVehicles.push(vehicle);
        continue;
      }
      
      // Check if vehicle is still on a valid road
      if (!isRoadTile(currentGrid, currentGridSize, vehicle.tileX, vehicle.tileY)) {
        const targetKey = `${vehicle.targetX},${vehicle.targetY}`;
        if (vehicle.type === 'fire_truck') {
          activeFiresRef.current.delete(targetKey);
        } else {
          activeCrimesRef.current.delete(targetKey);
          activeCrimeIncidentsRef.current.delete(targetKey); // Also clear the crime incident
        }
        continue;
      }
      
      // Bounds check - remove vehicle if out of bounds
      if (vehicle.tileX < 0 || vehicle.tileX >= currentGridSize || 
          vehicle.tileY < 0 || vehicle.tileY >= currentGridSize) {
        const targetKey = `${vehicle.targetX},${vehicle.targetY}`;
        if (vehicle.type === 'fire_truck') {
          activeFiresRef.current.delete(targetKey);
        } else {
          activeCrimesRef.current.delete(targetKey);
          activeCrimeIncidentsRef.current.delete(targetKey); // Also clear the crime incident
        }
        continue; // Remove vehicle
      }
      
      // Move vehicle along path
      vehicle.progress += vehicle.speed * delta * speedMultiplier;
      
      let shouldRemove = false;
      
      // Handle edge case: path has only 1 tile (already at destination)
      if (vehicle.path.length === 1 && vehicle.state === 'dispatching') {
        vehicle.state = 'responding';
        vehicle.respondTime = 0;
        vehicle.progress = 0;
        updatedVehicles.push(vehicle);
        continue;
      }
      
      while (vehicle.progress >= 1 && vehicle.pathIndex < vehicle.path.length - 1) {
        vehicle.pathIndex++;
        vehicle.progress -= 1;
        
        const currentTile = vehicle.path[vehicle.pathIndex];
        
        // Validate the next tile is in bounds
        if (currentTile.x < 0 || currentTile.x >= currentGridSize || 
            currentTile.y < 0 || currentTile.y >= currentGridSize) {
          shouldRemove = true;
          break;
        }
        
        vehicle.tileX = currentTile.x;
        vehicle.tileY = currentTile.y;
        
        // Check if reached destination
        if (vehicle.pathIndex >= vehicle.path.length - 1) {
          if (vehicle.state === 'dispatching') {
            // Arrived at emergency scene
            vehicle.state = 'responding';
            vehicle.respondTime = 0;
            vehicle.progress = 0; // Reset progress to keep vehicle centered on road tile
          } else if (vehicle.state === 'returning') {
            // Arrived back at station - remove vehicle
            shouldRemove = true;
          }
          break;
        }
        
        // Update direction for next segment
        if (vehicle.pathIndex + 1 < vehicle.path.length) {
          const nextTile = vehicle.path[vehicle.pathIndex + 1];
          const dir = getDirectionToTile(vehicle.tileX, vehicle.tileY, nextTile.x, nextTile.y);
          if (dir) vehicle.direction = dir;
        }
      }
      
      if (shouldRemove) {
        const targetKey = `${vehicle.targetX},${vehicle.targetY}`;
        if (vehicle.type === 'fire_truck') {
          activeFiresRef.current.delete(targetKey);
        } else {
          activeCrimesRef.current.delete(targetKey);
          activeCrimeIncidentsRef.current.delete(targetKey); // Also clear the crime incident
        }
        continue; // Don't add to updated list
      }
      
      updatedVehicles.push(vehicle);
    }
    
    emergencyVehiclesRef.current = updatedVehicles;
  }, [updateEmergencyDispatch, worldStateRef, activeFiresRef, activeCrimesRef, activeCrimeIncidentsRef]);

  return {
    emergencyVehiclesRef,
    updateEmergencyVehicles,
  };
}
