import { createBaseHeroSheet, emptySheet, addToSheet, applyStatCaps, type HeroStatSheet } from "../stats/sheet";
import type { StatId } from "../stats/statIds";
import type { ItemDef } from "./types";
import type { EquipSlotId } from "./slots";
import { isWeaponSlot } from "./slots";

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

export function isTwoHandPlaceholder(_item: ItemDef): boolean {
  // Зарезервировано: двуручное займёт mainhand+offhand.
  return false;
}

export function canEquipInSlot(item: ItemDef, slot: EquipSlotId): boolean {
  if (item.slot !== slot) {
    // ring1/ring2 взаимозаменяемы по типу
    if ((item.slot === "ring1" || item.slot === "ring2") && (slot === "ring1" || slot === "ring2")) {
      return true;
    }
    return false;
  }
  if (isWeaponSlot(slot) && !item.weapon) return false;
  return true;
}
