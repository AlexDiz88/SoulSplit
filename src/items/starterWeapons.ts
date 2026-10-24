import type { WeaponKind } from "../types";
import type { ItemDef, WeaponImplicit } from "./types";
import type { EquipSlotId } from "./slots";

/** Стартовое оружие при создании персонажа (независимо от аспекта). */
export type StarterWeaponId =
  | "dagger"
  | "sword"
  | "mace"
  | "wand"
  | "bow"
  | "great_axe"
  | "staff";

export interface StarterWeaponDef {
  id: StarterWeaponId;
  name: string;
  kind: WeaponKind;
  damageMin: number;
  damageMax: number;
  baseCd: number;
  reach: number;
  range: "melee" | "ranged";
  twoHand?: boolean;
}

/**
 * DPS ≈ 16.7 у всех (как у старого тренировочного клинка 20-30 / 1.5 с).
 * Быстрые - ниже урон, медленные и двуручные - выше.
 */
export const STARTER_WEAPONS: readonly StarterWeaponDef[] = [
  {
    id: "dagger",
    name: "Кинжал",
    kind: "melee",
    damageMin: 14,
    damageMax: 19,
    baseCd: 1.0,
    reach: 1,
    range: "melee",
  },
  {
    id: "sword",
    name: "Меч",
    kind: "melee",
    damageMin: 20,
    damageMax: 30,
    baseCd: 1.5,
    reach: 1,
    range: "melee",
  },
  {
    id: "mace",
    name: "Булава",
    kind: "melee",
    damageMin: 25,
    damageMax: 35,
    baseCd: 1.8,
    reach: 1,
    range: "melee",
  },
  {
    id: "wand",
    name: "Жезл",
    kind: "staff",
    damageMin: 22,
    damageMax: 31,
    baseCd: 1.6,
    reach: 4,
    range: "ranged",
  },
  {
    id: "bow",
    name: "Лук",
    kind: "bow",
    damageMin: 22,
    damageMax: 31,
    baseCd: 1.6,
    reach: 3,
    range: "ranged",
  },
  {
    id: "great_axe",
    name: "Двуручный топор",
    kind: "melee",
    damageMin: 28,
    damageMax: 39,
    baseCd: 2.0,
    reach: 1,
    range: "melee",
    twoHand: true,
  },
  {
    id: "staff",
    name: "Посох (двуручный)",
    kind: "staff",
    damageMin: 25,
    damageMax: 35,
    baseCd: 1.8,
    reach: 4,
    range: "ranged",
    twoHand: true,
  },
];

export const DEFAULT_STARTER_WEAPON: StarterWeaponId = "sword";

export const STARTER_WEAPON_BY_ID: Record<StarterWeaponId, StarterWeaponDef> =
  Object.fromEntries(STARTER_WEAPONS.map((w) => [w.id, w])) as Record<
    StarterWeaponId,
    StarterWeaponDef
  >;

export function isStarterWeaponId(value: string): value is StarterWeaponId {
  return value in STARTER_WEAPON_BY_ID;
}

function toImplicit(def: StarterWeaponDef): WeaponImplicit {
  return {
    kind: def.kind,
    damageMin: def.damageMin,
    damageMax: def.damageMax,
    baseCd: def.baseCd,
    reach: def.reach,
    range: def.range,
    twoHand: def.twoHand,
  };
}

/** Стартовое оружие героя (без аффиксов), сразу под экип в mainhand. */
export function createStarterWeapon(
  id: StarterWeaponId = DEFAULT_STARTER_WEAPON,
  slot: EquipSlotId = "mainhand",
): ItemDef {
  const def = STARTER_WEAPON_BY_ID[id] ?? STARTER_WEAPON_BY_ID[DEFAULT_STARTER_WEAPON];
  return {
    id: `starter_${def.id}`,
    name: def.name,
    slot,
    rarity: "common",
    itemLevel: 1,
    affixes: [],
    weapon: toImplicit(def),
  };
}
