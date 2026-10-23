import type { Aspect, WeaponKind } from "../types";
import type { AffixFamily, StatId } from "../stats/statIds";
import type { EquipSlotId } from "./slots";

export type ItemRarity = "common" | "uncommon" | "rare" | "yellow" | "epic";

/** Position of a rolled mod on the item. v1: any affix may be either. */
export type AffixSlot = "prefix" | "suffix";

export interface AffixTierRange {
  /** Inclusive itemLevel lower bound. */
  minIlvl: number;
  min: number;
  max: number;
}

export interface AffixDef {
  id: string;
  statId: StatId;
  family: AffixFamily;
  label: string;
  /** v1: both. Later can restrict. */
  allowedAffixSlots: AffixSlot[];
  tiers: AffixTierRange[];
  weight?: number;
}

export interface RolledAffix {
  affixId: string;
  statId: StatId;
  value: number;
  affixSlot: AffixSlot;
  label: string;
}

/** Implicit свойства оружия (не аффиксы листа). */
export interface WeaponImplicit {
  kind: WeaponKind;
  damageMin: number;
  damageMax: number;
  baseCd: number;
  reach: number;
  range: "melee" | "ranged";
}

export interface ItemDef {
  id: string;
  name: string;
  slot: EquipSlotId;
  rarity: ItemRarity;
  itemLevel: number;
  affixes: RolledAffix[];
  /** Только оружие / аксессуар. */
  aspectTag?: Aspect;
  weapon?: WeaponImplicit;
}

export interface GenerateItemOptions {
  slot: EquipSlotId;
  rarity: ItemRarity;
  itemLevel: number;
  /** Изученные аспекты героя - повышают вес aspectTag на оружии. */
  learnedAspects?: Aspect[];
  /** Принудительный аспект (тесты / крафт). */
  forceAspect?: Aspect;
  rng?: () => number;
  name?: string;
}

export const RARITY_LABEL: Record<ItemRarity, string> = {
  common: "Обычный",
  uncommon: "Необычный",
  rare: "Магический",
  yellow: "Редкий",
  epic: "Эпический",
};

export const RARITY_AFFIX_COUNT: Record<ItemRarity, [number, number]> = {
  common: [0, 0],
  uncommon: [1, 1],
  rare: [2, 2],
  yellow: [3, 4],
  epic: [4, 5],
};
