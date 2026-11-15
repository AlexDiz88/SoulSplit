import type { AffixFamily } from "../stats/statIds";
import type { OffhandTypeId } from "./offhandTypes";
import type { EquipSlotId } from "./slots";
import { isWeaponSlot } from "./slots";
import { isParryWeaponTypeId, type WeaponTypeId } from "./weaponTypes";

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

export interface StatSlotContext {
  weaponTypeId?: WeaponTypeId | null;
  offhandTypeId?: OffhandTypeId | null;
}

const BLOCK_ARMOR_SLOTS: ReadonlySet<EquipSlotId> = new Set([
  "head",
  "chest",
  "shoulders",
  "legs",
]);

const PARRY_GEAR_SLOTS: ReadonlySet<EquipSlotId> = new Set(["hands", "waist", "trinket"]);

export function familiesForSlot(slot: EquipSlotId): AffixFamily[] {
  return SLOT_FAMILIES[slot];
}

export function deniedStatsForSlot(slot: EquipSlotId): string[] {
  return [...(SLOT_STAT_DENY[slot] ?? [])];
}

/**
 * Разрешён ли стат на слоте.
 * blockChance / parryChance - жёсткий allowlist (не через широкую defense-семью).
 */
export function isStatAllowedOnSlot(
  slot: EquipSlotId,
  statId: string,
  ctx?: StatSlotContext,
): boolean {
  const deny = SLOT_STAT_DENY[slot];
  if (deny?.has(statId)) return false;

  if (statId === "blockChance") {
    if (slot === "offhand") return ctx?.offhandTypeId === "shield";
    return BLOCK_ARMOR_SLOTS.has(slot);
  }

  if (statId === "parryChance") {
    if (slot === "mainhand") return isParryWeaponTypeId(ctx?.weaponTypeId ?? undefined);
    if (slot === "offhand") return false;
    return PARRY_GEAR_SLOTS.has(slot);
  }

  if (statId.startsWith("aspectDamage:") && !isWeaponSlot(slot) && slot !== "trinket") {
    return false;
  }
  return true;
}

/** Какой affix id парирования пускать в пул слота. */
export function parryAffixIdForSlot(slot: EquipSlotId): "parry" | "parry_trinket" | null {
  if (slot === "trinket") return "parry_trinket";
  if (slot === "hands" || slot === "waist" || slot === "mainhand") return "parry";
  return null;
}
