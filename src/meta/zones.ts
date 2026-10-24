import type { ZoneId } from "./gameState";

/** Точка внутри зоны: свой уровень и пул врагов. */
export interface ZonePointDef {
  id: string;
  name: string;
  /** Диапазон уровней врагов для UI. */
  enemyLevels: [number, number];
  enemyCount: [number, number];
  enemyPool: string[];
  /** Уровень предмета и скейл врагов. */
  itemLevel: number;
  /** Шанс элитного модификатора на каждого врага (0 = нет). */
  eliteChance?: number;
}

export interface ZoneDef {
  id: ZoneId;
  name: string;
  description: string;
  /** Рекомендуемый уровень героя для открытия зоны. */
  minLevel: number;
  /** Названия квестов зоны (пока заглушки / будущий квестлог). */
  quests: string[];
  /** Stem арта превью в `assets/art/regions` (обычно = ZoneId). */
  previewStem: string;
  xpBase: number;
  xpPerKill: number;
  /** Точки внутри зоны. У разных зон разное число. */
  points: ZonePointDef[];
}

export const ZONES: Record<ZoneId, ZoneDef> = {
  north_road: {
    id: "north_road",
    name: "Северная дорога",
    description: "Тракт от северных ворот. Редкие патрули и путники у стены.",
    minLevel: 1,
    quests: [],
    previewStem: "north_road",
    xpBase: 140,
    xpPerKill: 40,
    points: [
      {
        id: "wall",
        name: "У стены",
        enemyLevels: [1, 2],
        /** C2: [3, 6] - на ур.1 пачка 7+ слишком жирная. */
        enemyCount: [3, 6],
        enemyPool: ["goblin_spear", "skeleton_guard", "huntress", "skeleton_mage"],
        itemLevel: 1,
      },
      {
        id: "crossroads",
        name: "Перекрёсток",
        enemyLevels: [2, 3],
        enemyCount: [4, 7],
        enemyPool: ["goblin_spear", "huntress", "skeleton_mage"],
        itemLevel: 2,
      },
      {
        id: "thicket",
        name: "Перелесок",
        enemyLevels: [2, 3],
        enemyCount: [3, 6],
        enemyPool: ["goblin_spear", "skeleton_guard", "huntress"],
        itemLevel: 2,
      },
    ],
  },
  ruins: {
    id: "ruins",
    name: "Руины",
    description: "Старые катакомбы. Враги крепче, лут заметно лучше.",
    minLevel: 1,
    quests: [],
    previewStem: "ruins",
    xpBase: 220,
    xpPerKill: 55,
    points: [
      {
        id: "courtyard",
        name: "Двор",
        enemyLevels: [3, 4],
        enemyCount: [5, 9],
        enemyPool: ["goblin_spear", "skeleton_guard", "huntress", "skeleton_mage"],
        itemLevel: 3,
        eliteChance: 0.05,
      },
      {
        id: "catacombs",
        name: "Катакомбы",
        enemyLevels: [4, 5],
        enemyCount: [6, 11],
        enemyPool: ["skeleton_guard", "skeleton_mage", "huntress"],
        itemLevel: 4,
        eliteChance: 0.08,
      },
    ],
  },
};

export function getZone(id: ZoneId): ZoneDef {
  return ZONES[id];
}

export function getZonePoint(zone: ZoneDef, pointId?: string | null): ZonePointDef {
  if (pointId) {
    const found = zone.points.find((p) => p.id === pointId);
    if (found) return found;
  }
  return zone.points[0]!;
}

export function isZoneUnlocked(id: ZoneId, heroLevel: number, unlocked: ZoneId[]): boolean {
  if (!unlocked.includes(id)) return false;
  return heroLevel >= getZone(id).minLevel;
}

export function syncUnlockedZones(_heroLevel: number, unlocked: ZoneId[]): ZoneId[] {
  const next = new Set<ZoneId>(unlocked);
  next.add("north_road");
  next.add("ruins");
  return [...next];
}
