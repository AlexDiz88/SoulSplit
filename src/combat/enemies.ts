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
    hp: 170,
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
}

/** 3–12 врагов, клетка выбирается только из рядов этого вида. */
export function rollEncounter(): SpawnedEnemy[] {
  const count = 3 + Math.floor(Math.random() * 10);
  const taken = new Set<string>();
  const out: SpawnedEnemy[] = [];
  let guard = 0;
  while (out.length < count && guard < 500) {
    guard++;
    const kind = ENEMY_KINDS[Math.floor(Math.random() * ENEMY_KINDS.length)]!;
    const open: { col: number; row: number }[] = [];
    for (const dist of kind.spawnRows) {
      const row = GRID_SIZE - dist;
      for (let col = 0; col < GRID_SIZE; col++) {
        const key = `${col}:${row}`;
        if (!taken.has(key)) open.push({ col, row });
      }
    }
    if (!open.length) continue;
    const cell = open[Math.floor(Math.random() * open.length)]!;
    taken.add(`${cell.col}:${cell.row}`);
    out.push({ kind, col: cell.col, row: cell.row });
  }
  return out;
}
