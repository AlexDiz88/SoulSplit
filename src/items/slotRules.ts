import type { AffixFamily } from "../stats/statIds";
import type { EquipSlotId } from "./slots";
import { isWeaponSlot } from "./slots";

/**
 * Допустимые семьи аффиксов по слоту.
 * offense: weaponAttackBonus, abilityDamage, crit*
 * defense: maxHp, physDr, magicResist, evasion, block, parry
 * resource: maxMana, manaRegen, manaCostReduction, hpRegen
 * tempo: attackSpeed, castSpeed, cooldownReduction
 * aspect: aspectDamage:* (только aspect-слоты)
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
  trinket: ["resource", "offense", "aspect", "tempo"],
  mainhand: ["offense", "tempo", "aspect"],
  offhand: ["offense", "tempo", "aspect", "defense"],
};

/** Запрещённые статы даже если семья разрешена (жёсткие исключения). */
export const SLOT_STAT_DENY: Partial<Record<EquipSlotId, ReadonlySet<string>>> = {
  head: new Set(["weaponAttackBonus", "abilityDamage", "attackSpeed"]),
  chest: new Set(["weaponAttackBonus", "abilityDamage", "attackSpeed", "critChance", "critDamage"]),
  shoulders: new Set(["weaponAttackBonus", "abilityDamage"]),
  waist: new Set(["weaponAttackBonus", "abilityDamage", "attackSpeed"]),
  legs: new Set(["weaponAttackBonus", "abilityDamage", "attackSpeed"]),
  mainhand: new Set(["evasion", "physDamageReduction", "maxHp"]),
  // attackSpeed разрешён (колчан / dual wield tempo).
  offhand: new Set(["evasion"]),
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
  if (statId.startsWith("aspectDamage:") && !isWeaponSlot(slot) && slot !== "trinket") return false;
  return true;
}
