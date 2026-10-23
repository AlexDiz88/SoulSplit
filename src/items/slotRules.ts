import type { AffixFamily } from "../stats/statIds";
import type { EquipSlotId } from "./slots";
import { isWeaponSlot } from "./slots";

/**
 * Допустимые семьи аффиксов по слоту.
 * offense: weaponAttackBonus, abilityDamage, crit*
 * defense: maxHp, physDr, magicResist, evasion, block, parry
 * resource: maxMana, manaRegen, manaCostReduction, hpRegen
 * tempo: attackSpeed, castSpeed, cooldownReduction
 * school: schoolDamage:* (только school-слоты)
 */
export const SLOT_FAMILIES: Record<EquipSlotId, AffixFamily[]> = {
  head: ["defense", "resource"],
  chest: ["defense", "resource"],
  shoulders: ["defense", "resource"],
  hands: ["tempo", "defense", "resource"],
  waist: ["defense", "resource"],
  legs: ["defense", "resource"],
  feet: ["tempo", "defense", "resource"],
  neck: ["resource", "defense"],
  ring1: ["offense", "resource", "tempo"],
  ring2: ["offense", "resource", "tempo"],
  trinket: ["resource", "offense", "school", "tempo"],
  mainhand: ["offense", "tempo", "school"],
  offhand: ["offense", "tempo", "school", "defense"],
};

/** Запрещённые статы даже если семья разрешена (жёсткие исключения). */
export const SLOT_STAT_DENY: Partial<Record<EquipSlotId, ReadonlySet<string>>> = {
  head: new Set(["weaponAttackBonus", "abilityDamage", "attackSpeed"]),
  chest: new Set(["weaponAttackBonus", "abilityDamage", "attackSpeed", "critChance", "critDamage"]),
  shoulders: new Set(["weaponAttackBonus", "abilityDamage"]),
  waist: new Set(["weaponAttackBonus", "abilityDamage", "attackSpeed"]),
  legs: new Set(["weaponAttackBonus", "abilityDamage", "attackSpeed"]),
  mainhand: new Set(["evasion", "physDamageReduction", "maxHp"]),
  offhand: new Set(["attackSpeed"]),
};

export function familiesForSlot(slot: EquipSlotId): AffixFamily[] {
  return SLOT_FAMILIES[slot];
}

export function deniedStatsForSlot(slot: EquipSlotId): string[] {
  return [...(SLOT_STAT_DENY[slot] ?? [])];
}

export function isStatAllowedOnSlot(slot: EquipSlotId, statId: string): boolean {
  const deny = SLOT_STAT_DENY[slot];
  if (deny?.has(statId)) return false;
  if (statId.startsWith("schoolDamage:") && !isWeaponSlot(slot) && slot !== "trinket") return false;
  return true;
}
