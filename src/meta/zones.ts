import type { ZoneId } from "./gameState";

export interface ZoneDef {
  id: ZoneId;
  name: string;
  description: string;
  /** Рекомендуемый уровень героя. */
  minLevel: number;
  /** Уровень предмета и скейл врагов. */
  itemLevel: number;
  enemyCount: [number, number];
  enemyPool: string[];
  xpBase: number;
  xpPerKill: number;
  /** Шанс элитного модификатора на каждого врага (0 = нет). */
  eliteChance?: number;
}

export const ZONES: Record<ZoneId, ZoneDef> = {
  outskirts: {
    id: "outskirts",
    name: "Окраина",
    description: "Редкие патрули у стены. Подходит для первого оружия и брони.",
    minLevel: 1,
    itemLevel: 1,
    /** C2: [3, 6] - на ур.1 пачка 7+ слишком жирная. */
    enemyCount: [3, 6],
    enemyPool: ["goblin_spear", "skeleton_guard", "huntress", "skeleton_mage"],
    xpBase: 140,
    xpPerKill: 40,
  },
  ruins: {
    id: "ruins",
    name: "Руины",
    description: "Старые катакомбы. Враги крепче, лут заметно лучше.",
    minLevel: 3,
    itemLevel: 4,
    enemyCount: [6, 11],
    enemyPool: ["goblin_spear", "skeleton_guard", "huntress", "skeleton_mage"],
    xpBase: 220,
    xpPerKill: 55,
    /** Шанс элиты на каждого заспавненного врага. */
    eliteChance: 0.08,
  },
};

export function getZone(id: ZoneId): ZoneDef {
  return ZONES[id];
}

/** Ruins открываются с 3 уровня. */
export function isZoneUnlocked(id: ZoneId, heroLevel: number, unlocked: ZoneId[]): boolean {
  if (!unlocked.includes(id)) return false;
  if (id === "ruins") return heroLevel >= 3;
  return true;
}

export function syncUnlockedZones(heroLevel: number, unlocked: ZoneId[]): ZoneId[] {
  const next = new Set<ZoneId>(unlocked);
  next.add("outskirts");
  if (heroLevel >= 3) next.add("ruins");
  return [...next];
}
