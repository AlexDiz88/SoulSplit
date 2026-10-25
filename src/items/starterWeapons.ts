import { getStarterItemIconUrl } from "../art/itemIcons";
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
  /** Stem файла: `assets/art/items/{iconId}.png` (вне пула генерации). */
  iconId: `starter_${StarterWeaponId}`;
  kind: WeaponKind;
  damageMin: number;
  damageMax: number;
  baseCd: number;
  reach: number;
  range: "melee" | "ranged";
  twoHand?: boolean;
}

/**
 * Баланс: ближний бой сильнее по DPS; лук (reach 3) и жезл/посох (reach 4)
 * слабее за счёт дальности. Разброс min-max разный по типам.
 */
export const STARTER_WEAPONS: readonly StarterWeaponDef[] = [
  {
    id: "dagger",
    name: "Кинжал",
    iconId: "starter_dagger",
    kind: "melee",
    damageMin: 17,
    damageMax: 21,
    baseCd: 1.2,
    reach: 1,
    range: "melee",
  },
  {
    id: "sword",
    name: "Меч",
    iconId: "starter_sword",
    kind: "melee",
    damageMin: 20,
    damageMax: 32,
    baseCd: 1.6,
    reach: 1,
    range: "melee",
  },
  {
    id: "mace",
    name: "Булава",
    iconId: "starter_mace",
    kind: "melee",
    damageMin: 23,
    damageMax: 37,
    baseCd: 1.8,
    reach: 1,
    range: "melee",
  },
  {
    id: "wand",
    name: "Жезл",
    iconId: "starter_wand",
    kind: "staff",
    damageMin: 16,
    damageMax: 22,
    baseCd: 1.6,
    reach: 4,
    range: "ranged",
  },
  {
    id: "bow",
    name: "Лук",
    iconId: "starter_bow",
    kind: "bow",
    damageMin: 26,
    damageMax: 38,
    baseCd: 2.5,
    reach: 3,
    range: "ranged",
    twoHand: true,
  },
  {
    id: "great_axe",
    name: "Большой топор",
    iconId: "starter_great_axe",
    kind: "melee",
    damageMin: 28,
    damageMax: 48,
    baseCd: 2.2,
    reach: 1,
    range: "melee",
    twoHand: true,
  },
  {
    id: "staff",
    name: "Посох",
    iconId: "starter_staff",
    kind: "staff",
    damageMin: 20,
    damageMax: 36,
    baseCd: 2.0,
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
    id: def.iconId,
    name: def.name,
    slot,
    rarity: "common",
    itemLevel: 1,
    affixes: [],
    icon: getStarterItemIconUrl(def.iconId),
    weapon: toImplicit(def),
  };
}
