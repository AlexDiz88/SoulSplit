import type { WeaponKind } from "../types";
import type { ItemGrip } from "./grip";
import {
  rollTierIndex,
  sampleAffixQuality,
  TIER_COUNT,
  TIER_IDS,
  type AffixTierId,
} from "./tiers";

/**
 * Визуальный / предметный тип оружия (имя + арт + баланс).
 * Reach задаётся на типе (лук 3, арбалет/посох 4), не только через WeaponKind.
 *
 * Арт: `assets/art/items/{art}_{rarity}_{n}.png`
 * Двуручные мечи/булавы/топоры: префикс `2H_*`.
 * Лук и арбалет без `2H` (grip mainhand под колчан). Посох без `2H` (grip twoHand).
 */
export type WeaponTypeId =
  | "dagger"
  | "sword"
  | "mace"
  | "axe"
  | "wand"
  | "bow"
  | "crossbow"
  | "2H_sword"
  | "2H_mace"
  | "2H_axe"
  | "staff"
  | "spear";

export interface WeaponTypeDef {
  id: WeaponTypeId;
  name: string;
  /** Prefixe файла арта в lowercase (`2h_axe`, `wand`). */
  art: string;
  kind: WeaponKind;
  range: "melee" | "ranged";
  grip: ItemGrip;
  /** Дистанция атаки (ряды). */
  reach: number;
  /** Базовый КД на ilvl 1. */
  baseCd: number;
  /** Базовый урон на ilvl 1. */
  damageMin: number;
  damageMax: number;
}

/**
 * База ilvl 1 / common.
 * DPS падает с reach: 1H ~16.5, 2H ~18.5, spear(2) ~14.5, bow(3) ~12.5, reach 4 ~11-11.5.
 * Разброс min-max: малый (кинжал/меч/жезл), средний (топор/булава/копье/лук/посох),
 * большой (2H меч/топор/булава, арбалет).
 */
export const WEAPON_TYPES: readonly WeaponTypeDef[] = [
  {
    id: "dagger",
    name: "Кинжал",
    art: "dagger",
    kind: "melee",
    range: "melee",
    grip: "either",
    reach: 1,
    baseCd: 1.2,
    damageMin: 17,
    damageMax: 22,
  },
  {
    id: "sword",
    name: "Меч",
    art: "sword",
    kind: "melee",
    range: "melee",
    grip: "either",
    reach: 1,
    baseCd: 1.6,
    damageMin: 23,
    damageMax: 30,
  },
  {
    id: "mace",
    name: "Булава",
    art: "mace",
    kind: "melee",
    range: "melee",
    grip: "either",
    reach: 1,
    baseCd: 1.8,
    damageMin: 22,
    damageMax: 37,
  },
  {
    id: "axe",
    name: "Топор",
    art: "axe",
    kind: "melee",
    range: "melee",
    grip: "either",
    reach: 1,
    baseCd: 1.7,
    damageMin: 21,
    damageMax: 35,
  },
  {
    id: "wand",
    name: "Жезл",
    art: "wand",
    kind: "staff",
    range: "ranged",
    grip: "either",
    reach: 4,
    baseCd: 1.5,
    damageMin: 14,
    damageMax: 19,
  },
  {
    id: "bow",
    name: "Лук",
    art: "bow",
    kind: "bow",
    range: "ranged",
    grip: "mainhand",
    reach: 3,
    baseCd: 2.5,
    damageMin: 24,
    damageMax: 38,
  },
  {
    id: "crossbow",
    name: "Арбалет",
    art: "crossbow",
    kind: "bow",
    range: "ranged",
    grip: "mainhand",
    reach: 4,
    baseCd: 2.8,
    damageMin: 20,
    damageMax: 42,
  },
  {
    id: "2H_sword",
    name: "Двуручный меч",
    art: "2h_sword",
    kind: "melee",
    range: "melee",
    grip: "twoHand",
    reach: 1,
    baseCd: 2.1,
    damageMin: 26,
    damageMax: 52,
  },
  {
    id: "2H_mace",
    name: "Двуручная булава",
    art: "2h_mace",
    kind: "melee",
    range: "melee",
    grip: "twoHand",
    reach: 1,
    baseCd: 2.3,
    damageMin: 28,
    damageMax: 57,
  },
  {
    id: "2H_axe",
    name: "Двуручный топор",
    art: "2h_axe",
    kind: "melee",
    range: "melee",
    grip: "twoHand",
    reach: 1,
    baseCd: 2.2,
    damageMin: 26,
    damageMax: 54,
  },
  {
    id: "staff",
    name: "Посох",
    art: "staff",
    kind: "staff",
    range: "ranged",
    grip: "twoHand",
    reach: 4,
    baseCd: 2.0,
    damageMin: 17,
    damageMax: 29,
  },
  {
    id: "spear",
    name: "Копьё",
    art: "spear",
    kind: "spear",
    range: "melee",
    grip: "twoHand",
    reach: 2,
    baseCd: 1.9,
    damageMin: 21,
    damageMax: 34,
  },
];

export const WEAPON_TYPE_BY_ID: Record<WeaponTypeId, WeaponTypeDef> = Object.fromEntries(
  WEAPON_TYPES.map((t) => [t.id, t]),
) as Record<WeaponTypeId, WeaponTypeDef>;

export function isWeaponTypeId(value: string): value is WeaponTypeId {
  return value in WEAPON_TYPE_BY_ID;
}

/** Одноручное оружие, которое можно надеть в указанный слот. */
export function weaponTypesForSlot(slot: "mainhand" | "offhand"): readonly WeaponTypeDef[] {
  if (slot === "offhand") {
    return WEAPON_TYPES.filter((t) => t.grip === "either");
  }
  return WEAPON_TYPES.filter((t) => t.grip === "mainhand" || t.grip === "either" || t.grip === "twoHand");
}

/** Старая линейная шкала - репрезентативный mid полосы тира (ilvl 1,3,…,19). */
function legacyScaleAtTier(tierIndex: number): number {
  const ilvl = 2 * Math.max(0, Math.min(TIER_COUNT - 1, tierIndex)) + 1;
  return 1 + (ilvl - 1) * 0.12;
}

export interface WeaponDamageTierRange {
  id: AffixTierId;
  /** Окно для damageMin. */
  minLo: number;
  minHi: number;
  /** Окно для damageMax. */
  maxLo: number;
  maxHi: number;
  /** КД: пока плоский (= baseCd типа). */
  cdLo: number;
  cdHi: number;
}

/** 10 тиров урона/КД из текущих чисел типа + старой формулы роста. */
export function weaponDamageTiers(def: WeaponTypeDef): WeaponDamageTierRange[] {
  const tiers: WeaponDamageTierRange[] = [];
  for (let i = 0; i < TIER_COUNT; i++) {
    const scale = legacyScaleAtTier(i);
    const nextScale = legacyScaleAtTier(Math.min(TIER_COUNT - 1, i + 1));
    const centerMin = Math.max(1, Math.round(def.damageMin * scale));
    const centerMax = Math.max(centerMin, Math.round(def.damageMax * scale));
    const stepMin = Math.max(1, Math.round(Math.abs(def.damageMin * nextScale - def.damageMin * scale) / 2));
    const stepMax = Math.max(1, Math.round(Math.abs(def.damageMax * nextScale - def.damageMax * scale) / 2));
    const minLo = Math.max(1, centerMin - stepMin);
    const minHi = Math.max(minLo, centerMin + stepMin);
    const maxLo = Math.max(minLo, centerMax - stepMax);
    const maxHi = Math.max(maxLo, centerMax + stepMax);
    tiers.push({
      id: TIER_IDS[i]!,
      minLo,
      minHi,
      maxLo,
      maxHi,
      cdLo: def.baseCd,
      cdHi: def.baseCd,
    });
  }
  return tiers;
}

/**
 * Детерминированный mid-roll без rng (стартеры / превью).
 * Тир = baseTierIndex(ilvl), quality = 0.5.
 */
export function scaleWeaponStats(
  def: WeaponTypeDef,
  itemLevel: number,
): { damageMin: number; damageMax: number; baseCd: number; reach: number; tierId: AffixTierId } {
  const tiers = weaponDamageTiers(def);
  const idx = Math.min(TIER_COUNT - 1, Math.max(0, Math.ceil(Math.max(1, itemLevel) / 2) - 1));
  const t = tiers[idx]!;
  const q = 0.5;
  const damageMin = Math.max(1, Math.round(t.minLo + q * (t.minHi - t.minLo)));
  const damageMax = Math.max(damageMin, Math.round(t.maxLo + q * (t.maxHi - t.maxLo)));
  return {
    damageMin,
    damageMax,
    baseCd: def.baseCd,
    reach: def.reach,
    tierId: t.id,
  };
}

/** Ролл урона/КД по схеме тиров F…A5 (как аффиксы). */
export function rollWeaponStats(
  def: WeaponTypeDef,
  itemLevel: number,
  rng: () => number,
): { damageMin: number; damageMax: number; baseCd: number; reach: number; tierId: AffixTierId } {
  const tiers = weaponDamageTiers(def);
  const tierIndex = rollTierIndex(itemLevel, rng);
  const t = tiers[tierIndex]!;
  const q = sampleAffixQuality(rng);
  const damageMin = Math.max(1, Math.round(t.minLo + q * (t.minHi - t.minLo)));
  const damageMax = Math.max(damageMin, Math.round(t.maxLo + q * (t.maxHi - t.maxLo)));
  const baseCd =
    t.cdHi <= t.cdLo ? t.cdLo : Number((t.cdLo + q * (t.cdHi - t.cdLo)).toFixed(2));
  return {
    damageMin,
    damageMax,
    baseCd,
    reach: def.reach,
    tierId: t.id,
  };
}
