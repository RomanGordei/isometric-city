# Rise of Nations Sprite Audit Report

Generated: December 2024

## Executive Summary

**Critical Finding**: Many RoN building sprites are completely incorrect. The age-specific sprite sheets (classical, medieval, enlightenment, industrial, modern) contain era-appropriate buildings like temples, coliseums, factories, and modern buildings - but NOT farms, mines (in some ages), or other resource buildings.

The IsoCity base game has dedicated sprite sheets for:
- Farms (`sprites_red_water_new_farm.png`) - crops, barns, silos, tractors
- Industrial buildings (`sprites_red_water_new.png`, `industrial.png`)
- Various other specialized buildings

## Recommended Solution

1. **Use IsoCity farm sprites for ALL ages** - The farm sheet has era-appropriate farm variations
2. **Create a hybrid sprite system** - Age sheets for government/military buildings, IsoCity sheets for economic buildings
3. **Fix incorrect mappings** in the current age sheets

---

## Classical Age Sprite Sheet Analysis

**Source**: `public/assets/ages/classics.png` (5×6 grid, 2048×2048px)

### Grid Layout (row, col):

| Row | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 |
|-----|-------|-------|-------|-------|-------|
| 0 | Palace | Temple | Aqueduct | Columns | Bath/Pool |
| 1 | Fountain Park | Pool Garden | Stadium | Temple | Temple |
| 2 | Colosseum | Water Tower | Fire Temple | Colosseum | Lighthouse |
| 3 | Dome | Villa | Market Stalls | Market | Villa+Cart |
| 4 | Warehouse | Industrial | Quarry | Kilns | Dock+Cranes |
| 5 | Trading Post | Arch | Large Temple | Small Temple | Amphitheater |

### Current Mappings vs Reality:

| Building | Current (row,col) | Actual Sprite | Status |
|----------|-------------------|---------------|--------|
| city_center | (5,2) | Large Temple | ✅ OK |
| farm | (5,0) | Trading Post | ❌ WRONG - Not a farm! |
| market | (1,3) | Temple | ❌ WRONG - Should be (3,2) or (3,3) |
| library | (0,1) | Temple with columns | ✅ OK |
| barracks | (2,0) | Colosseum | ⚠️ Debatable |
| dock | (4,4) | Dock with cranes | ✅ OK |
| mine | (4,2) | Quarry | ✅ OK |
| smelter | (4,3) | Kilns/Furnaces | ✅ OK |

---

## Industrial Age Sprite Sheet Analysis

**Source**: `public/assets/ages/industrial.png` (5×6 grid)

### Grid Layout (row, col):

| Row | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 |
|-----|-------|-------|-------|-------|-------|
| 0 | Factory | Factory+Smokestacks | Brick Factory | Brick Building | Solar Roof |
| 1 | Park | Gazebo Park | Stadium | Victorian | Church |
| 2 | Government | Water Tower | Factory Complex | Sports Field | Oil Derrick |
| 3 | Tree | Victorian | Gothic | Cottage | Shop |
| 4 | Building | Factory | Factory | Steel Mill | Refinery |
| 5 | Train Station | Factories | Clock Tower | Temple | Ferris Wheel |

### Current Issues:

| Building | Current (row,col) | Actual Sprite | Status |
|----------|-------------------|---------------|--------|
| farm | (5,0) | Train Station | ❌ CRITICAL - Completely wrong! |
| airbase | (3,3) | Cottage | ❌ CRITICAL - Should be airport! |
| factory | (4,3) | Steel Mill | ✅ OK |
| oil_well | (4,3) | Steel Mill | ⚠️ Should be (2,4) - Oil Derrick |

---

## Modern Age Sprite Sheet Analysis

**Source**: `public/assets/ages/modern.png` (5×6 grid)

### Critical Issues:

| Building | Current (row,col) | Actual Sprite | Status |
|----------|-------------------|---------------|--------|
| farm | (5,0) | Airport Tower | ❌ CRITICAL |
| airbase | (3,3) | Small House | ❌ CRITICAL |

---

## IsoCity Farm Sprite Sheet

**Source**: `public/assets/sprites_red_water_new_farm.png` (5×6 grid)

This sheet has proper farm assets that should be used:

| Row | Contents |
|-----|----------|
| 0 | Crops: Corn, Wheat, Sunflowers, Pumpkins, Apple Trees |
| 1 | Farm buildings: Dairy barn, Chicken coop, Sheep, Pigs, Horses |
| 2 | Farm structures: Farmhouse, Silo, Barn, Tractor shed, Windmill |
| 3 | Orchards: Fruit trees, Vineyard, Hay bales, Pond, Greenhouse |
| 4 | Industrial: Dairy factory, Watermill, Grain storage, Barn, Market |
| 5 | Vehicles: Tractor, Combine, Truck, Water tower, Tool shed |

**Recommendation**: Use this sheet for farms in ALL ages, selecting appropriate sprites:
- Classical: Row 0 (basic crops) or Row 1 col 0 (simple farm)
- Medieval: Row 2 col 4 (windmill) or Row 1 (animal farms)
- Industrial+: Row 5 (tractors, machinery)

---

## Action Items

### Critical Fixes Needed:

1. **Farm sprites**: Use IsoCity farm sheet instead of age sheets
2. **Market (Classical)**: Change from (1,3) to (3,2) - actual market stalls
3. **Airbase (Modern/Industrial)**: Need to find/create proper airport sprite
4. **Oil Well (Industrial)**: Change from (4,3) to (2,4) - oil derrick

### Recommended Sprite Mapping Updates:

```typescript
// PROPOSED FIXES for renderConfig.ts

// Use IsoCity farm sheet for farms (all ages)
farm: { useIsoCityFarm: true, row: 0, col: 0 }, // Crops

// Fix market to use actual market sprite
market: { row: 3, col: 2 }, // Market stalls, not temple

// Fix oil_well to use oil derrick
oil_well: { row: 2, col: 4 }, // Oil derrick in industrial

// airbase needs special handling - use IsoCity airport or custom
airbase: { useIsoCity: true, sheet: 'buildings/airport' },
```

---

## Full Building Audit

### Buildings with CORRECT sprites:
- ✅ city_center - Temple works as government center
- ✅ library - Temple with columns (classical learning)
- ✅ dock - Dock with cranes
- ✅ mine - Quarry
- ✅ smelter - Kilns/furnaces
- ✅ factory (industrial) - Steel mill

### Buildings with WRONG sprites:
- ❌ farm (all ages) - Using random buildings, not farms
- ❌ market (classical) - Using temple instead of market stalls
- ❌ airbase (modern) - Using cottage instead of airport
- ❌ oil_well - Using steel mill instead of oil derrick
- ❌ barracks - Colosseum is debatable for training

### Buildings needing review:
- ⚠️ university - Colosseum may not be ideal
- ⚠️ stable - Cart building is marginal
- ⚠️ granary - Warehouse is acceptable

---

## Next Steps

1. Create hybrid rendering system that can pull from multiple sprite sheets
2. Map farms to IsoCity farm sprite sheet
3. Fix individual building mappings as noted above
4. Consider age-specific variants where available
