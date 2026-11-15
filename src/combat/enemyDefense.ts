import { addToSheet, applyStatCaps, emptySheet, type HeroStatSheet } from "../stats/sheet";
import type { WeaponKind } from "../types";
import type { EnemyDefense } from "./enemyDefs/types";

/** Лист защиты врага для общего applyDamage / avoidance. */
export function buildEnemyDefenseSheet(defense?: EnemyDefense | null): HeroStatSheet {
  const sheet = emptySheet();
  if (!defense) return applyStatCaps(sheet);
  addToSheet(sheet, {
    evasion: defense.evasion ?? 0,
    blockChance: defense.blockChance ?? 0,
    parryChance: defense.parryChance ?? 0,
    physDamageReduction: defense.physDamageReduction ?? 0,
    magicResist: defense.magicResist ?? 0,
  });
  return applyStatCaps(sheet);
}

/** Гейты блока / парирования врага. */
export function enemyDefenseGates(
  weapon: WeaponKind,
  defense?: EnemyDefense | null,
): { blockActive: boolean; parryActive: boolean } {
  return {
    blockActive: defense?.hasShield === true,
    parryActive: weapon === "melee",
  };
}
