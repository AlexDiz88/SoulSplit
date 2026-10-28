import type { Aspect, WeaponKind } from "../types";
import type { AffixFamily, StatId } from "../stats/statIds";
import type { ItemGrip } from "./grip";
import type { OffhandTypeId } from "./offhandTypes";
import type { EquipSlotId } from "./slots";
import type { AffixTierId } from "./tiers";
import type { WeaponTypeId } from "./weaponTypes";

export type ItemRarity = "common" | "uncommon" | "magic" | "rare" | "epic";

/** Position of a rolled mod on the item. v1: any affix may be either. */
export type AffixSlot = "prefix" | "suffix";

/** Одна ступень тира (F…A5). Порядок в AffixDef.tiers = TIER_IDS. */
export interface AffixTierRange {
  id: AffixTierId;
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
  /** Ровно 10 записей: F…A5. */
  tiers: AffixTierRange[];
  weight?: number;
}

export interface RolledAffix {
  affixId: string;
  statId: StatId;
  value: number;
  affixSlot: AffixSlot;
  label: string;
  /** Тир ролла; старые сейвы могут не иметь. */
  tierId?: AffixTierId;
  /** Диапазон тира на момент ролла (для тултипа [min-max]). */
  tierMin?: number;
  tierMax?: number;
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
  /** Тир ролла базы урона (F…A5). Старые сейвы могут не иметь. */
  tierId?: AffixTierId;
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

/**
 * Зароллированная база предмета (не оружие).
 * Оружие хранит базу в `weapon` (урон + baseCd).
 * `potionCount` - бонус ячеек зелий пояса (к базовой 1), в sheet не суммируется.
 */
export type ItemBaseStatKey = StatId | "potionCount";

/** Расходник пояса (здоровье / мана). */
export type PotionId = "healing_potion" | "mana_potion";

export interface RolledItemBase {
  baseId: string;
  /** Реальный стат или stub пояса. */
  statId: ItemBaseStatKey;
  value: number;
  label: string;
  tierId?: AffixTierId;
  tierMin?: number;
  tierMax?: number;
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
  /** База брони / аксессуара / оффхенда (не для оружия). */
  base?: RolledItemBase;
  weapon?: WeaponImplicit;
  /** Взаимоисключает weapon: предмет левой руки без автоатаки. */
  offhand?: OffhandImplicit;
  /** Зелье: не экип, стакается в инвентаре, заряжается в пояс. */
  potionId?: PotionId;
  /** Размер стака (только для зелий). */
  stackCount?: number;
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
