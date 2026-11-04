import type { EquipmentMap } from "../items/equipment";
import type { InventoryBag } from "../items/inventory";
import type { RegionId } from "../meta/gameState";
import type { HeroProfile } from "../meta/heroProfile";
import type { RegionDef } from "../meta/regions";
import type { BattleStats } from "./battleStats";
import type { SpawnedEnemy } from "./enemies";

export type { BattleStats, AbilityBattleStats, AutoAttackBattleStats, EnemyKillStat } from "./battleStats";

export interface BattleKill {
  enemyId: string;
  kindId: string;
  level: number;
  elite: boolean;
}

export interface BattleResult {
  outcome: "victory" | "defeat" | "flee";
  regionId: RegionId;
  locationId: string;
  killed: BattleKill[];
  survivingEnemyCount: number;
  durationSec: number;
  /** Текущее HP героя на момент исхода. */
  heroHp: number;
  /** Текущая мана героя на момент исхода. */
  heroMana: number;
  equipment: EquipmentMap;
  inventory: InventoryBag;
  beltHpPotions: number;
  beltManaPotions: number;
  stats: BattleStats;
}

export interface BattleConfig {
  hero: HeroProfile;
  region: RegionDef;
  locationId: string;
  encounter: SpawnedEnemy[];
  onComplete: (result: BattleResult) => void;
  /** Сразу при смерти врага (для квест-прогресса). */
  onEnemyKilled?: (kindId: string) => void;
}
