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
  aspect: Aspect;
  weapon: WeaponKind;
  /** Базовый уровень в бестиарии. В бою может сдвинуться на -2…+2. */
  baseLevel: number;
  /** Дистанция в рядах: 1 - ближний ряд у героя. */
  reach: number;
  /**
   * Желаемые ряды формации (1 - ближний). Не жёсткий запрет:
   * при нехватке мест юнит может встать в ближайший свободный ряд.
   */
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

const GRID_CELLS = GRID_SIZE * GRID_SIZE;

/** Дистанция ряда (1 у героя) → индекс row на сетке. */
export function distToGridRow(dist: number): number {
  return GRID_SIZE - dist;
}

/** Насколько ряд далёк от желаемых: 0 = желаемый. */
function distFromPreferred(dist: number, preferred: number[]): number {
  if (!preferred.length) return Math.abs(dist - 1);
  if (preferred.includes(dist)) return 0;
  return Math.min(...preferred.map((p) => Math.abs(dist - p)));
}

/**
 * Порядок рядов для постановки: сначала желаемые (ближе к герою),
 * затем ближайшие к ним (для [1]: 1→2→3→4; для [1,2]: 1→2→3→4; для [3,4]: 3→4→2→1).
 */
export function orderedSpawnDists(spawnRows: number[]): number[] {
  const preferred = spawnRows.length ? spawnRows : [1];
  const dists: number[] = [];
  for (let d = 1; d <= GRID_SIZE; d++) dists.push(d);
  dists.sort((a, b) => {
    const da = distFromPreferred(a, preferred);
    const db = distFromPreferred(b, preferred);
    if (da !== db) return da - db;
    return a - b;
  });
  return dists;
}

/**
 * Приоритет формации: ниже reach важнее фронт; при равном reach
 * уже spawnRows важнее (бригадир [1] бьёт гоблина [1,2]).
 */
export function compareFormationPriority(a: EnemyKind, b: EnemyKind): number {
  if (a.reach !== b.reach) return a.reach - b.reach;
  if (a.spawnRows.length !== b.spawnRows.length) {
    return a.spawnRows.length - b.spawnRows.length;
  }
  return 0;
}

function cellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

/** Свободные клетки ряда-дистанции; колонка случайная. */
function pickOpenCellInDist(
  dist: number,
  taken: Set<string>,
  rng: () => number,
): { col: number; row: number } | null {
  const row = distToGridRow(dist);
  const open: { col: number; row: number }[] = [];
  for (let col = 0; col < GRID_SIZE; col++) {
    if (!taken.has(cellKey(col, row))) open.push({ col, row });
  }
  if (!open.length) return null;
  return open[Math.floor(rng() * open.length)]!;
}

/**
 * Лучшая свободная клетка: желаемые ряды, иначе ближайшие к ним.
 * Эквивалент вытеснения: юниты с высшим приоритетом ставятся первыми.
 */
function pickFormationCell(
  kind: EnemyKind,
  taken: Set<string>,
  rng: () => number,
): { col: number; row: number } | null {
  for (const dist of orderedSpawnDists(kind.spawnRows)) {
    const cell = pickOpenCellInDist(dist, taken, rng);
    if (cell) return cell;
  }
  return null;
}

/** Случайная пачка; формация по reach / желаемым рядам; уровень = base ±2. */
export function rollEncounter(opts: RollEncounterOptions = {}): SpawnedEnemy[] {
  const rng = opts.rng ?? Math.random;
  const pool = kindsFromPool(opts.pool);
  const countMin = opts.countMin ?? 3;
  const countMax = Math.max(countMin, opts.countMax ?? 12);
  const wanted = countMin + Math.floor(rng() * (countMax - countMin + 1));
  const count = Math.min(wanted, GRID_CELLS);
  const eliteChance = Math.max(0, opts.eliteChance ?? 0);

  type Draft = {
    kind: EnemyKind;
    level: number;
    hp: number;
    atk: number;
    elite: boolean;
    tie: number;
  };
  const drafts: Draft[] = [];
  for (let i = 0; i < count; i++) {
    const kind = pool[Math.floor(rng() * pool.length)]!;
    const elite = eliteChance > 0 && rng() < eliteChance;
    const level = rollEnemyLevel(kind.baseLevel, rng);
    const scaled = scaleEnemyStats(kind, level, elite);
    drafts.push({
      kind,
      level,
      hp: scaled.hp,
      atk: scaled.atk,
      elite,
      tie: rng(),
    });
  }

  drafts.sort((a, b) => {
    const byPri = compareFormationPriority(a.kind, b.kind);
    if (byPri !== 0) return byPri;
    return a.tie - b.tie;
  });

  const taken = new Set<string>();
  const out: SpawnedEnemy[] = [];
  for (const draft of drafts) {
    const cell = pickFormationCell(draft.kind, taken, rng);
    if (!cell) break;
    taken.add(cellKey(cell.col, cell.row));
    out.push({
      kind: draft.kind,
      col: cell.col,
      row: cell.row,
      level: draft.level,
      hp: draft.hp,
      atk: draft.atk,
      elite: draft.elite,
    });
  }
  return out;
}
