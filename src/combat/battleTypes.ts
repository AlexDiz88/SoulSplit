import type { EquipmentMap } from "../items/equipment";
import type { InventoryBag } from "../items/inventory";
import type { ZoneId } from "../meta/gameState";
import type { HeroProfile } from "../meta/heroProfile";
import type { ZoneDef } from "../meta/zones";
import type { SpawnedEnemy } from "./enemies";

export interface BattleKill {
  enemyId: string;
  kindId: string;
}

export interface BattleResult {
  outcome: "victory" | "defeat";
  zoneId: ZoneId;
  killed: BattleKill[];
  survivingEnemyCount: number;
  durationSec: number;
  equipment: EquipmentMap;
  inventory: InventoryBag;
}

export interface BattleConfig {
  hero: HeroProfile;
  zone: ZoneDef;
  encounter: SpawnedEnemy[];
  onComplete: (result: BattleResult) => void;
}
