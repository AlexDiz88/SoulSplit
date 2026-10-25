import type { ZoneId } from "./gameState";

/** Обязательный слот пачки (всегда в бою, тратит бюджет угрозы). */
export interface EncounterGuarantee {
  id: string;
  count: number;
}

/** Правила генерации пачки локации. */
export interface EncounterDef {
  /** Диапазон бюджета угрозы; на вход роллится одно значение. */
  threatBudget: [number, number];
  /** Пул для добора остатка бюджета. */
  pool: string[];
  /** Гарантированный минимум состава. */
  guarantee?: EncounterGuarantee[];
}

/** Точка внутри зоны: свой бюджет и пул врагов. */
export interface ZonePointDef {
  id: string;
  name: string;
  encounter: EncounterDef;
  /** Уровень предмета и скейл лута. */
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

const NORTH_BANDITS_CORE = [
  "bandit_vagabond",
  "bandit_slinger",
  "bandit_magpie",
  "bandit_brigadier",
] as const;

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
        encounter: {
          threatBudget: [3, 6],
          pool: ["bandit_vagabond", "bandit_slinger", "bandit_magpie"],
          guarantee: [
            { id: "bandit_vagabond", count: 1 },
            { id: "bandit_slinger", count: 1 },
          ],
        },
        itemLevel: 1,
      },
      {
        id: "crossroads",
        name: "Перекрёсток",
        encounter: {
          threatBudget: [8, 12],
          pool: [...NORTH_BANDITS_CORE],
        },
        itemLevel: 2,
      },
      {
        id: "thicket",
        name: "Перелесок",
        encounter: {
          threatBudget: [10, 14],
          pool: [
            "bandit_vagabond",
            "bandit_slinger",
            "bandit_magpie",
            "bandit_brigadier",
            "bandit_ravager",
          ],
          guarantee: [
            { id: "bandit_brigadier", count: 1 },
            { id: "bandit_ravager", count: 1 },
          ],
        },
        itemLevel: 2,
      },
      {
        id: "bandit_camp",
        name: "Лагерь бандитов",
        encounter: {
          threatBudget: [15, 20],
          pool: ["bandit_vagabond", "bandit_slinger", "bandit_magpie", "bandit_brigadier", "bandit_ravager"],
          guarantee: [
            { id: "bandit_ravager", count: 1 },
            { id: "bandit_brigadier", count: 1 },
            { id: "bandit_magpie", count: 2 },
            { id: "bandit_leader", count: 1 },
          ],
        },
        itemLevel: 3,
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
        encounter: {
          threatBudget: [10, 18],
          pool: ["goblin_spear", "skeleton_guard", "huntress", "skeleton_mage"],
        },
        itemLevel: 3,
        eliteChance: 0.05,
      },
      {
        id: "catacombs",
        name: "Катакомбы",
        encounter: {
          threatBudget: [14, 24],
          pool: ["skeleton_guard", "skeleton_mage", "huntress"],
        },
        itemLevel: 4,
        eliteChance: 0.08,
      },
    ],
  },
};

/** Id врагов локации: пул ∪ guarantee (для UI). */
export function encounterEnemyIds(point: ZonePointDef): string[] {
  const ids = new Set(point.encounter.pool);
  for (const g of point.encounter.guarantee ?? []) ids.add(g.id);
  return [...ids];
}

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
