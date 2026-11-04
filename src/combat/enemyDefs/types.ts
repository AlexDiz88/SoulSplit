import type { AbilityId, Aspect, WeaponKind } from "../../types";

export type EnemyStatus = "черновик" | "одобрено" | "отказ" | "под вопросом";

/**
 * Единый источник правды по врагу: бой + бестиарий.
 * Файл: `src/combat/enemyDefs/{groupId}/{id}.ts`, id = snake_case.
 */
export interface EnemyDef {
  id: string;
  name: string;
  short: string;
  group: string;
  groupId: string;
  region: string;
  regionId: string;
  status: EnemyStatus;
  /** Файл в `assets/art/enemies/` (`skeleton_king.png`). */
  portrait: string;
  baseLevel: number;
  threat?: number;
  threatMult?: number;
  boss?: boolean;
  reach: number;
  spawnRows: number[];
  hp: number;
  atk: number;
  cd: number;
  aspect: Aspect;
  weapon: WeaponKind;
  /** Боевые id способностей (snake_case). Пусто = только автоатака. */
  abilities?: AbilityId[];
  description: string;
  /** Правило для игрока, если не влезло в description. */
  extra?: string;
  /** Крючок для INDEX (навигация). */
  hook: string;
}
