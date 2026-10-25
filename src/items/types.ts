import type { Aspect, WeaponKind } from "../types";
import type { AffixFamily, StatId } from "../stats/statIds";
import type { ItemGrip } from "./grip";
import type { OffhandTypeId } from "./offhandTypes";
import type { EquipSlotId } from "./slots";
import type { WeaponTypeId } from "./weaponTypes";

export type ItemRarity = "common" | "uncommon" | "magic" | "rare" | "epic";

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
  /** Предметный тип (кинжал/булава/посох...) - имя и арт. Старые сейвы могут не иметь. */
  typeId?: WeaponTypeId;
  damageMin: number;
  damageMax: number;
  baseCd: number;
  reach: number;
  range: "melee" | "ranged";
  /** Куда можно надеть. Старые сейвы могут не иметь - см. resolveWeaponGrip. */
  grip?: ItemGrip;
  /**
   * @deprecated Используй grip === "twoHand". Читается при миграции сейвов.
   */
  twoHand?: boolean;
}

/** Implicit свойства оффхенда (щит / том / сфера / реликвия / колчан). */
export interface OffhandImplicit {
  typeId: OffhandTypeId;
}

export interface ItemDef {
  id: string;
  name: string;
  slot: EquipSlotId;
  rarity: ItemRarity;
  itemLevel: number;
  affixes: RolledAffix[];
  /** URL иконки из assets/art/items (префиксы slot_rarity_n). */
  icon?: string;
  /** Оружие / оффхенд / аксессуар. */
  aspectTag?: Aspect;
  weapon?: WeaponImplicit;
  /** Взаимоисключает weapon: предмет левой руки без автоатаки. */
  offhand?: OffhandImplicit;
}

export interface GenerateItemOptions {
  slot: EquipSlotId;
  rarity: ItemRarity;
  itemLevel: number;
  /** Изученные аспекты героя - повышают вес aspectTag на оружии. */
  learnedAspects?: Aspect[];
  /** Принудительный аспект (тесты / крафт). */
  forceAspect?: Aspect;
  /** Принудительный вид оружия (генератор / крафт). Только для mainhand. */
  forceWeaponType?: WeaponTypeId;
  rng?: () => number;
  name?: string;
}

export const RARITY_LABEL: Record<ItemRarity, string> = {
  common: "Обычный",
  uncommon: "Необычный",
  magic: "Магический",
  rare: "Редкий",
  epic: "Эпический",
};

export const RARITY_AFFIX_COUNT: Record<ItemRarity, [number, number]> = {
  common: [0, 0],
  uncommon: [1, 1],
  magic: [2, 2],
  rare: [3, 4],
  epic: [4, 5],
};
