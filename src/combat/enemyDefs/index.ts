import type { AbilityId } from "../../types";
import { resolveEnemyPortraitUrl } from "../../art/enemyPortraits";
import type { EnemyDef } from "./types";

export type { EnemyDef, EnemyStatus } from "./types";

const modules = import.meta.glob<{ default: EnemyDef }>("./*/*.ts", {
  eager: true,
});

export const ALL_ENEMY_DEFS: EnemyDef[] = Object.values(modules)
  .map((mod) => mod.default)
  .filter((def): def is EnemyDef => !!def?.id)
  .sort((a, b) => {
    if (a.baseLevel !== b.baseLevel) return a.baseLevel - b.baseLevel;
    return a.name.localeCompare(b.name, "ru");
  });

export function getEnemyDef(id: string): EnemyDef | undefined {
  const combatId = id.replace(/-/g, "_");
  return ALL_ENEMY_DEFS.find((def) => def.id === combatId || def.id === id);
}

export function abilityIdsToBestiaryLabel(ids: AbilityId[] | undefined): string {
  if (!ids?.length) return "нет";
  return ids.map((id) => id.replace(/_/g, "-")).join(", ");
}

/** Боевой вид из дефа (только для status === "одобрено"). */
export function enemyDefToKind(def: EnemyDef): {
  id: string;
  name: string;
  short: string;
  aspect: EnemyDef["aspect"];
  weapon: EnemyDef["weapon"];
  baseLevel: number;
  threat?: number;
  threatMult?: number;
  boss?: boolean;
  reach: number;
  spawnRows: number[];
  hp: number;
  atk: number;
  cd: number;
  portraitUrl: string;
  abilities?: AbilityId[];
} {
  return {
    id: def.id,
    name: def.name,
    short: def.short,
    aspect: def.aspect,
    weapon: def.weapon,
    baseLevel: def.baseLevel,
    ...(def.threat !== undefined ? { threat: def.threat } : {}),
    ...(def.threatMult !== undefined ? { threatMult: def.threatMult } : {}),
    ...(def.boss ? { boss: true } : {}),
    reach: def.reach,
    spawnRows: def.spawnRows,
    hp: def.hp,
    atk: def.atk,
    cd: def.cd,
    portraitUrl: resolveEnemyPortraitUrl(def.portrait),
    ...(def.abilities?.length ? { abilities: def.abilities } : {}),
  };
}
