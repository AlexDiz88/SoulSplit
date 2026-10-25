import type { WeaponKind } from "../types";
import { WEAPON_REACH } from "../combat/weapons";
import type { ItemGrip } from "./grip";

/**
 * Визуальный / предметный тип оружия (имя + арт + баланс).
 * Боевой reach берётся из `kind` (WeaponKind).
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
  /** Базовый КД на ilvl 1. */
  baseCd: number;
  /** Базовый урон на ilvl 1. */
  damageMin: number;
  damageMax: number;
}

export const WEAPON_TYPES: readonly WeaponTypeDef[] = [
  {
    id: "dagger",
    name: "Кинжал",
    art: "dagger",
    kind: "melee",
    range: "melee",
    grip: "either",
    baseCd: 1.2,
    damageMin: 17,
    damageMax: 21,
  },
  {
    id: "sword",
    name: "Меч",
    art: "sword",
    kind: "melee",
    range: "melee",
    grip: "either",
    baseCd: 1.6,
    damageMin: 20,
    damageMax: 32,
  },
  {
    id: "mace",
    name: "Булава",
    art: "mace",
    kind: "melee",
    range: "melee",
    grip: "either",
    baseCd: 1.8,
    damageMin: 23,
    damageMax: 37,
  },
  {
    id: "axe",
    name: "Топор",
    art: "axe",
    kind: "melee",
    range: "melee",
    grip: "either",
    baseCd: 1.7,
    damageMin: 21,
    damageMax: 34,
  },
  {
    id: "wand",
    name: "Жезл",
    art: "wand",
    kind: "staff",
    range: "ranged",
    grip: "either",
    baseCd: 1.6,
    damageMin: 16,
    damageMax: 22,
  },
  {
    id: "bow",
    name: "Лук",
    art: "bow",
    kind: "bow",
    range: "ranged",
    grip: "mainhand",
    baseCd: 2.5,
    damageMin: 26,
    damageMax: 38,
  },
  {
    id: "crossbow",
    name: "Арбалет",
    art: "crossbow",
    kind: "bow",
    range: "ranged",
    grip: "mainhand",
    baseCd: 2.8,
    damageMin: 30,
    damageMax: 44,
  },
  {
    id: "2H_sword",
    name: "Двуручный меч",
    art: "2h_sword",
    kind: "melee",
    range: "melee",
    grip: "twoHand",
    baseCd: 2.1,
    damageMin: 30,
    damageMax: 46,
  },
  {
    id: "2H_mace",
    name: "Двуручная булава",
    art: "2h_mace",
    kind: "melee",
    range: "melee",
    grip: "twoHand",
    baseCd: 2.3,
    damageMin: 32,
    damageMax: 50,
  },
  {
    id: "2H_axe",
    name: "Двуручный топор",
    art: "2h_axe",
    kind: "melee",
    range: "melee",
    grip: "twoHand",
    baseCd: 2.2,
    damageMin: 28,
    damageMax: 48,
  },
  {
    id: "staff",
    name: "Посох",
    art: "staff",
    kind: "staff",
    range: "ranged",
    grip: "twoHand",
    baseCd: 2.0,
    damageMin: 20,
    damageMax: 36,
  },
  {
    id: "spear",
    name: "Копьё",
    art: "spear",
    kind: "spear",
    range: "melee",
    grip: "twoHand",
    baseCd: 1.4,
    damageMin: 22,
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

/** Урон/КД от базы типа с ростом от itemLevel. */
export function scaleWeaponStats(
  def: WeaponTypeDef,
  itemLevel: number,
): { damageMin: number; damageMax: number; baseCd: number; reach: number } {
  const lvl = Math.max(1, itemLevel);
  const scale = 1 + (lvl - 1) * 0.12;
  const damageMin = Math.max(1, Math.round(def.damageMin * scale));
  const damageMax = Math.max(damageMin, Math.round(def.damageMax * scale));
  return {
    damageMin,
    damageMax,
    baseCd: def.baseCd,
    reach: WEAPON_REACH[def.kind],
  };
}
