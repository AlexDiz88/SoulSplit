import { GRID_SIZE } from "../abilities/shapes";
import { PORTRAIT_URLS } from "../art/portraits";
import type { AbilityId, Aspect, WeaponKind } from "../types";

export const ENEMY_LEVEL_MIN = 1;
export const ENEMY_LEVEL_MAX = 20;
/** Оффсет уровня при спавне относительно baseLevel. */
export const ENEMY_LEVEL_OFFSET_MIN = -2;
export const ENEMY_LEVEL_OFFSET_MAX = 2;
/** Доля HP за каждый уровень относительно baseLevel. */
export const ENEMY_HP_PER_LEVEL = 0.12;
/** Доля атаки за каждый уровень относительно baseLevel. */
export const ENEMY_ATK_PER_LEVEL = 0.1;

export interface EnemyKind {
  id: string;
  name: string;
  short: string;
  role: string;
  aspect: Aspect;
  weapon: WeaponKind;
  /** Базовый уровень в бестиарии. В бою может сдвинуться на -2…+2. */
  baseLevel: number;
  /** Дистанция в рядах: 1 - ближний ряд у героя. */
  reach: number;
  /** Ряды, где этот враг может появиться. 1 - ближний. */
  spawnRows: number[];
  /** Статы на baseLevel. */
  hp: number;
  atk: number;
  cd: number;
  portraitUrl: string;
  /** Способности монстра в бою. */
  abilities?: AbilityId[];
}

export const ENEMY_KINDS: EnemyKind[] = [
  {
    id: "goblin_spear",
    name: "Гоблин-копейщик",
    short: "ГБЛ",
    role: "Копьё",
    aspect: "might",
    weapon: "spear",
    baseLevel: 1,
    reach: 2,
    spawnRows: [1, 2],
    hp: 68,
    atk: 7,
    cd: 1.7,
    portraitUrl: PORTRAIT_URLS.goblin_spear,
  },
  {
    id: "skeleton_guard",
    name: "Скелет-защитник",
    short: "СКЗ",
    role: "Защитник",
    aspect: "might",
    weapon: "melee",
    baseLevel: 2,
    reach: 1,
    spawnRows: [1],
    /** C2: 170 слишком танково против клинка 20-30 на ур.1. */
    hp: 140,
    atk: 12,
    cd: 2.3,
    portraitUrl: PORTRAIT_URLS.skeleton_guard,
  },
  {
    id: "huntress",
    name: "Охотница",
    short: "ОХТ",
    role: "Лук",
    aspect: "stealth",
    weapon: "bow",
    baseLevel: 2,
    reach: 3,
    spawnRows: [2, 3],
    hp: 54,
    atk: 10,
    cd: 2.8,
    portraitUrl: PORTRAIT_URLS.huntress,
  },
  {
    id: "skeleton_mage",
    name: "Скелет-маг",
    short: "СКМ",
    role: "Жезл",
    aspect: "stealth",
    weapon: "staff",
    baseLevel: 3,
    reach: 4,
    spawnRows: [3, 4],
    hp: 62,
    atk: 13,
    cd: 2.0,
    portraitUrl: PORTRAIT_URLS.skeleton_mage,
    abilities: ["dark_arrow"],
  },
];

export function getEnemyKind(id: string): EnemyKind | undefined {
  return ENEMY_KINDS.find((k) => k.id === id);
}

export function rowsLabel(rows: number[]): string {
  const sorted = [...rows].sort((a, b) => a - b);
  if (sorted.length === 1) return `ряд ${sorted[0]}`;
  const consecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1]! + 1);
  if (consecutive) return `ряды ${sorted[0]}-${sorted[sorted.length - 1]}`;
  return `ряды ${sorted.join(", ")}`;
}

export interface SpawnedEnemy {
  kind: EnemyKind;
  col: number;
  row: number;
  /** Итоговый уровень после оффсета (1-20). */
  level: number;
  /** Уже смасштабированные статы под level. */
  hp: number;
  atk: number;
  elite?: boolean;
}

export interface RollEncounterOptions {
  pool?: string[];
  countMin?: number;
  countMax?: number;
  /** Шанс элиты на каждого врага. */
  eliteChance?: number;
  rng?: () => number;
}

/** Элитный модификатор v1: x1.6 hp, x1.25 atk. */
export const ELITE_HP_MULT = 1.6;
export const ELITE_ATK_MULT = 1.25;

export function clampEnemyLevel(level: number): number {
  return Math.max(ENEMY_LEVEL_MIN, Math.min(ENEMY_LEVEL_MAX, Math.round(level)));
}

/** Случайный уровень: baseLevel + [-2…+2], кап 1-20. */
export function rollEnemyLevel(baseLevel: number, rng: () => number = Math.random): number {
  const span = ENEMY_LEVEL_OFFSET_MAX - ENEMY_LEVEL_OFFSET_MIN + 1;
  const offset = ENEMY_LEVEL_OFFSET_MIN + Math.floor(rng() * span);
  return clampEnemyLevel(baseLevel + offset);
}

/** Статы каталога на baseLevel; при оффсете уровня растут/падают. */
export function scaleEnemyStats(
  kind: EnemyKind,
  level: number,
  elite = false,
): { hp: number; atk: number } {
  const lvl = clampEnemyLevel(level);
  const delta = lvl - kind.baseLevel;
  let hp = Math.max(1, Math.round(kind.hp * (1 + ENEMY_HP_PER_LEVEL * delta)));
  let atk = Math.max(1, Math.round(kind.atk * (1 + ENEMY_ATK_PER_LEVEL * delta)));
  if (elite) {
    hp = Math.round(hp * ELITE_HP_MULT);
    atk = Math.round(atk * ELITE_ATK_MULT);
  }
  return { hp, atk };
}

function kindsFromPool(pool: string[] | undefined): EnemyKind[] {
  if (!pool?.length) return ENEMY_KINDS;
  const set = new Set(pool);
  const filtered = ENEMY_KINDS.filter((k) => set.has(k.id));
  return filtered.length ? filtered : ENEMY_KINDS;
}

/** Случайная пачка; клетка только из рядов вида; уровень = base ±2. */
export function rollEncounter(opts: RollEncounterOptions = {}): SpawnedEnemy[] {
  const rng = opts.rng ?? Math.random;
  const pool = kindsFromPool(opts.pool);
  const countMin = opts.countMin ?? 3;
  const countMax = Math.max(countMin, opts.countMax ?? 12);
  const count = countMin + Math.floor(rng() * (countMax - countMin + 1));
  const eliteChance = Math.max(0, opts.eliteChance ?? 0);
  const taken = new Set<string>();
  const out: SpawnedEnemy[] = [];
  let guard = 0;
  while (out.length < count && guard < 500) {
    guard++;
    const kind = pool[Math.floor(rng() * pool.length)]!;
    const open: { col: number; row: number }[] = [];
    for (const dist of kind.spawnRows) {
      const row = GRID_SIZE - dist;
      for (let col = 0; col < GRID_SIZE; col++) {
        const key = `${col}:${row}`;
        if (!taken.has(key)) open.push({ col, row });
      }
    }
    if (!open.length) continue;
    const cell = open[Math.floor(rng() * open.length)]!;
    taken.add(`${cell.col}:${cell.row}`);
    const elite = eliteChance > 0 && rng() < eliteChance;
    const level = rollEnemyLevel(kind.baseLevel, rng);
    const scaled = scaleEnemyStats(kind, level, elite);
    out.push({
      kind,
      col: cell.col,
      row: cell.row,
      level,
      hp: scaled.hp,
      atk: scaled.atk,
      elite,
    });
  }
  return out;
}
