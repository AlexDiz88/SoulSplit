import { getStarterItemIconUrl } from "../art/itemIcons";
import { WEAPON_REACH } from "../combat/weapons";
import type { ItemGrip } from "./grip";
import type { ItemDef, WeaponImplicit } from "./types";
import type { EquipSlotId } from "./slots";
import {
  WEAPON_TYPE_BY_ID,
  type WeaponTypeDef,
  type WeaponTypeId,
} from "./weaponTypes";

/** Стартовое оружие при создании персонажа (копьё и арбалет - только дроп/магазин). */
export type StarterWeaponId = Exclude<WeaponTypeId, "spear" | "crossbow">;

export interface StarterWeaponDef {
  id: StarterWeaponId;
  name: string;
  /** Stem файла: `assets/art/items/{iconId}.png` (вне пула генерации). */
  iconId: `starter_${StarterWeaponId}`;
  kind: WeaponTypeDef["kind"];
  damageMin: number;
  damageMax: number;
  baseCd: number;
  reach: number;
  range: "melee" | "ranged";
  grip: ItemGrip;
}

function toStarterDef(typeId: StarterWeaponId): StarterWeaponDef {
  const t = WEAPON_TYPE_BY_ID[typeId];
  return {
    id: typeId,
    name: t.name,
    iconId: `starter_${typeId}`,
    kind: t.kind,
    damageMin: t.damageMin,
    damageMax: t.damageMax,
    baseCd: t.baseCd,
    reach: WEAPON_REACH[t.kind],
    range: t.range,
    grip: t.grip,
  };
}

/**
 * Баланс: ближний бой сильнее по DPS; лук (reach 3) и жезл/посох (reach 4)
 * слабее за счёт дальности. Разброс min-max разный по типам.
 */
export const STARTER_WEAPONS: readonly StarterWeaponDef[] = (
  [
    "dagger",
    "sword",
    "mace",
    "axe",
    "wand",
    "bow",
    "2H_axe",
    "staff",
  ] as const satisfies readonly StarterWeaponId[]
).map(toStarterDef);

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
    typeId: def.id,
    damageMin: def.damageMin,
    damageMax: def.damageMax,
    baseCd: def.baseCd,
    reach: def.reach,
    range: def.range,
    grip: def.grip,
    twoHand: def.grip === "twoHand",
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
