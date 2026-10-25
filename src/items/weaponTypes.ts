import type { WeaponKind } from "../types";
import { WEAPON_REACH } from "../combat/weapons";

/**
 * Визуальный / предметный тип оружия (имя + арт + баланс).
 * Боевой reach берётся из `kind` (WeaponKind).
 *
 * Арт: `assets/art/items/{art}_{rarity}_{n}.png`
 * Двуручные мечи/булавы/топоры: префикс `2H_*`. Лук и посох без `2H`.
 */
export type WeaponTypeId =
  | "dagger"
  | "sword"
  | "mace"
  | "wand"
  | "bow"
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
  twoHand?: boolean;
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
    baseCd: 1.8,
    damageMin: 23,
    damageMax: 37,
  },
  {
    id: "wand",
    name: "Жезл",
    art: "wand",
    kind: "staff",
    range: "ranged",
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
    twoHand: true,
    baseCd: 2.5,
    damageMin: 26,
    damageMax: 38,
  },
  {
    id: "2H_axe",
    name: "Большой топор",
    art: "2h_axe",
    kind: "melee",
    range: "melee",
    twoHand: true,
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
    twoHand: true,
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

/** Типы для слота: двуручные не кладём в offhand. */
export function weaponTypesForSlot(slot: "mainhand" | "offhand"): readonly WeaponTypeDef[] {
  if (slot === "offhand") return WEAPON_TYPES.filter((t) => !t.twoHand);
  return WEAPON_TYPES;
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
