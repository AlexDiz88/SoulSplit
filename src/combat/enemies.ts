import { GRID_SIZE } from "../abilities/shapes";
import { PORTRAIT_URLS } from "../art/portraits";
import type { AbilityId, Aspect, WeaponKind } from "../types";

export interface EnemyKind {
  id: string;
  name: string;
  short: string;
  role: string;
  aspect: Aspect;
  weapon: WeaponKind;
  /** Дистанция в рядах: 1 — ближний ряд у героя. */
  reach: number;
  /** Ряды, где этот враг может появиться. 1 — ближний. */
  spawnRows: number[];
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
    aspect: "iron",
    weapon: "spear",
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
    aspect: "iron",
    weapon: "melee",
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
    reach: 4,
    spawnRows: [3, 4],
    hp: 62,
    atk: 13,
    cd: 2.0,
    portraitUrl: PORTRAIT_URLS.skeleton_mage,
    abilities: ["dark_arrow"],
  },
];

export function rowsLabel(rows: number[]): string {
  const sorted = [...rows].sort((a, b) => a - b);
  if (sorted.length === 1) return `ряд ${sorted[0]}`;
  const consecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1]! + 1);
  if (consecutive) return `ряды ${sorted[0]}–${sorted[sorted.length - 1]}`;
  return `ряды ${sorted.join(", ")}`;
}

export interface SpawnedEnemy {
  kind: EnemyKind;
  col: number;
  row: number;
  /** Уже смасштабированные статы для зоны. */
  hp: number;
  atk: number;
  elite?: boolean;
}

export interface RollEncounterOptions {
  pool?: string[];
  countMin?: number;
  countMax?: number;
  itemLevel?: number;
  /** Шанс элиты на каждого врага. */
  eliteChance?: number;
  rng?: () => number;
}

/** Элитный модификатор v1: x1.6 hp, x1.25 atk. */
export const ELITE_HP_MULT = 1.6;
export const ELITE_ATK_MULT = 1.25;

export function scaleEnemyStats(
  kind: EnemyKind,
  itemLevel: number,
  elite = false,
): { hp: number; atk: number } {
  const ilvl = Math.max(1, itemLevel);
  let hp = Math.round(kind.hp * (0.85 + 0.15 * ilvl));
  let atk = Math.round(kind.atk * (0.9 + 0.12 * ilvl));
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

/** Случайная пачка; клетка только из рядов вида. */
export function rollEncounter(opts: RollEncounterOptions = {}): SpawnedEnemy[] {
  const rng = opts.rng ?? Math.random;
  const pool = kindsFromPool(opts.pool);
  const countMin = opts.countMin ?? 3;
  const countMax = Math.max(countMin, opts.countMax ?? 12);
  const count = countMin + Math.floor(rng() * (countMax - countMin + 1));
  const itemLevel = opts.itemLevel ?? 1;
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
    const scaled = scaleEnemyStats(kind, itemLevel, elite);
    out.push({ kind, col: cell.col, row: cell.row, hp: scaled.hp, atk: scaled.atk, elite });
  }
  return out;
}
