import { createBaseHeroSheet, emptySheet, addToSheet, applyStatCaps, type HeroStatSheet } from "../stats/sheet";
import type { StatId } from "../stats/statIds";
import { GRIP_LABEL, type ItemGrip } from "./grip";
import { OFFHAND_TYPE_BY_ID } from "./offhandTypes";
import type { ItemDef, WeaponImplicit } from "./types";
import type { EquipSlotId } from "./slots";
import { WEAPON_TYPE_BY_ID } from "./weaponTypes";

export type EquipmentMap = Partial<Record<EquipSlotId, ItemDef>>;

export function affixesToDelta(items: ItemDef[]): Partial<Record<StatId, number>> {
  const delta: Partial<Record<StatId, number>> = {};
  for (const item of items) {
    for (const a of item.affixes) {
      delta[a.statId] = (delta[a.statId] ?? 0) + a.value;
    }
  }
  return delta;
}

/** База героя + сумма аффиксов экипировки. */
export function computeHeroSheet(equipment: EquipmentMap, base = createBaseHeroSheet()): HeroStatSheet {
  const items = Object.values(equipment).filter((x): x is ItemDef => !!x);
  const sheet = emptySheet();
  addToSheet(sheet, base);
  addToSheet(sheet, affixesToDelta(items));
  return applyStatCaps(sheet);
}

/** Grip оружия с учётом typeId и legacy twoHand / bow. */
export function resolveWeaponGrip(weapon: WeaponImplicit): ItemGrip {
  if (weapon.grip) return weapon.grip;
  if (weapon.typeId && WEAPON_TYPE_BY_ID[weapon.typeId]) {
    return WEAPON_TYPE_BY_ID[weapon.typeId].grip;
  }
  // Лук раньше помечали twoHand; канон теперь mainhand (под колчан).
  if (weapon.kind === "bow") return "mainhand";
  if (weapon.twoHand) return "twoHand";
  return "either";
}

export function getItemGrip(item: ItemDef): ItemGrip | null {
  if (item.weapon) return resolveWeaponGrip(item.weapon);
  if (item.offhand) {
    const def = OFFHAND_TYPE_BY_ID[item.offhand.typeId];
    return def?.grip ?? "offhand";
  }
  return null;
}

export function gripLabel(item: ItemDef): string | null {
  const grip = getItemGrip(item);
  return grip ? GRIP_LABEL[grip] : null;
}

export function isTwoHandWeapon(item: ItemDef): boolean {
  return getItemGrip(item) === "twoHand";
}

/** @deprecated alias для isTwoHandWeapon (тултипы / старые вызовы). */
export function isTwoHandPlaceholder(item: ItemDef): boolean {
  return isTwoHandWeapon(item);
}

/** Основное оружие для reach/UI: сначала mainhand, иначе offhand. */
export function equippedWeapon(equipment: EquipmentMap): ItemDef | null {
  const main = equipment.mainhand;
  if (main?.weapon) return main;
  const off = equipment.offhand;
  if (off?.weapon) return off;
  return null;
}

export function findWeaponImplicit(equipment: EquipmentMap) {
  return equippedWeapon(equipment)?.weapon ?? null;
}

export function equippedWeapons(equipment: EquipmentMap): {
  mainhand: WeaponImplicit | null;
  offhand: WeaponImplicit | null;
} {
  return {
    mainhand: equipment.mainhand?.weapon ?? null,
    offhand: equipment.offhand?.weapon ?? null,
  };
}

/**
 * Нормализация grip/slot после загрузки сейва или генерации.
 * Не выкидывает оружие из offhand (dual wield разрешён).
 */
export function normalizeWeaponItemSlot(item: ItemDef): void {
  if (item.offhand) {
    item.slot = "offhand";
    delete item.weapon;
    return;
  }
  if (!item.weapon) return;
  const grip = resolveWeaponGrip(item.weapon);
  item.weapon.grip = grip;
  item.weapon.twoHand = grip === "twoHand";
  if (grip === "offhand") {
    item.slot = "offhand";
  } else if (grip === "either") {
    if (item.slot !== "mainhand" && item.slot !== "offhand") item.slot = "mainhand";
  } else {
    item.slot = "mainhand";
  }
}

function gripAllowsSlot(grip: ItemGrip, slot: EquipSlotId): boolean {
  if (slot === "mainhand") return grip === "mainhand" || grip === "either" || grip === "twoHand";
  if (slot === "offhand") return grip === "offhand" || grip === "either";
  return false;
}

/**
 * Можно ли надеть предмет в слот.
 * Для рук смотрит grip; `equipment` нужен чтобы блокировать offhand при 2H в mainhand.
 */
export function canEquipInSlot(
  item: ItemDef,
  slot: EquipSlotId,
  equipment?: EquipmentMap,
): boolean {
  if (item.slot === "ring1" || item.slot === "ring2") {
    if (slot !== "ring1" && slot !== "ring2") return false;
  } else {
    const grip = getItemGrip(item);
    if (grip) {
      if (!gripAllowsSlot(grip, slot)) return false;
      if (slot === "offhand" && equipment) {
        const main = equipment.mainhand;
        if (main && isTwoHandWeapon(main)) return false;
      }
      if (slot === "mainhand" || slot === "offhand") {
        if (item.weapon) return true;
        if (item.offhand) return slot === "offhand";
        return false;
      }
      return false;
    }
    if (item.slot !== slot) return false;
  }
  return true;
}
