import { canEquipInSlot, type EquipmentMap } from "./equipment";
import type { EquipSlotId } from "./slots";
import type { ItemDef } from "./types";

/** Сетка рюкзака: 5×5, один предмет = одна ячейка. */
export const INVENTORY_COLS = 5;
export const INVENTORY_ROWS = 5;
export const INVENTORY_SIZE = INVENTORY_COLS * INVENTORY_ROWS;

/** Тайник в городе: 10×10. */
export const STASH_COLS = 10;
export const STASH_ROWS = 10;
export const STASH_SIZE = STASH_COLS * STASH_ROWS;

export type InventoryBag = (ItemDef | null)[];

export function createEmptyInventory(size = INVENTORY_SIZE): InventoryBag {
  return Array.from({ length: size }, () => null);
}

export function createEmptyStash(): InventoryBag {
  return createEmptyInventory(STASH_SIZE);
}

export function cloneInventory(src: InventoryBag | undefined | null, size = INVENTORY_SIZE): InventoryBag {
  const out = createEmptyInventory(size);
  if (!src) return out;
  for (let i = 0; i < Math.min(size, src.length); i++) {
    out[i] = src[i] ?? null;
  }
  return out;
}

export function cloneStash(src: InventoryBag | undefined | null): InventoryBag {
  return cloneInventory(src, STASH_SIZE);
}

/** Обмен ячеек между двумя сумками (инвентарь ↔ тайник). */
export function swapBetweenBags(
  aBag: InventoryBag,
  aIndex: number,
  bBag: InventoryBag,
  bIndex: number,
): GearChangeResult {
  if (aBag === bBag) return swapInventoryCells(aBag, aIndex, bIndex);
  if (aIndex < 0 || bIndex < 0 || aIndex >= aBag.length || bIndex >= bBag.length) {
    return { ok: false, reason: "bad_slot" };
  }
  const tmp = aBag[aIndex] ?? null;
  aBag[aIndex] = bBag[bIndex] ?? null;
  bBag[bIndex] = tmp;
  return { ok: true };
}

export function findEmptyInventorySlot(inv: InventoryBag): number {
  return inv.findIndex((cell) => cell == null);
}

export function addItemToInventory(inv: InventoryBag, item: ItemDef): number {
  const i = findEmptyInventorySlot(inv);
  if (i < 0) return -1;
  inv[i] = item;
  return i;
}

/** Целевой слот экипировки для предмета (кольца - в первую пустую ячейку). */
export function resolveEquipSlot(item: ItemDef, equipment: EquipmentMap): EquipSlotId | null {
  if (item.slot === "ring1" || item.slot === "ring2") {
    if (!equipment.ring1 && canEquipInSlot(item, "ring1")) return "ring1";
    if (!equipment.ring2 && canEquipInSlot(item, "ring2")) return "ring2";
    const prefer = item.slot;
    return canEquipInSlot(item, prefer) ? prefer : null;
  }
  return canEquipInSlot(item, item.slot) ? item.slot : null;
}

export type GearChangeResult =
  | { ok: true }
  | { ok: false; reason: "empty" | "bad_slot" | "inventory_full" };

/** Надеть предмет из ячейки инвентаря. Занятый слот уходит обратно в ту же ячейку. */
export function equipFromInventory(
  equipment: EquipmentMap,
  inventory: InventoryBag,
  invIndex: number,
): GearChangeResult {
  const item = inventory[invIndex];
  if (!item) return { ok: false, reason: "empty" };
  const slot = resolveEquipSlot(item, equipment);
  if (!slot) return { ok: false, reason: "bad_slot" };
  return equipFromInventoryToSlot(equipment, inventory, invIndex, slot);
}

/** Надеть в конкретный слот (перетаскивание). Замена, если слот занят. */
export function equipFromInventoryToSlot(
  equipment: EquipmentMap,
  inventory: InventoryBag,
  invIndex: number,
  slot: EquipSlotId,
): GearChangeResult {
  const item = inventory[invIndex];
  if (!item) return { ok: false, reason: "empty" };
  if (!canEquipInSlot(item, slot)) return { ok: false, reason: "bad_slot" };
  const previous = equipment[slot] ?? null;
  equipment[slot] = item;
  inventory[invIndex] = previous;
  return { ok: true };
}

/** Снять предмет в первую свободную ячейку инвентаря. */
export function unequipToInventory(
  equipment: EquipmentMap,
  inventory: InventoryBag,
  slot: EquipSlotId,
): GearChangeResult {
  const item = equipment[slot];
  if (!item) return { ok: false, reason: "empty" };
  const free = findEmptyInventorySlot(inventory);
  if (free < 0) return { ok: false, reason: "inventory_full" };
  return unequipToInventoryAt(equipment, inventory, slot, free);
}

/** Снять предмет в конкретную ячейку (перетаскивание). Замена, если ячейка занята. */
export function unequipToInventoryAt(
  equipment: EquipmentMap,
  inventory: InventoryBag,
  slot: EquipSlotId,
  invIndex: number,
): GearChangeResult {
  const item = equipment[slot];
  if (!item) return { ok: false, reason: "empty" };
  if (invIndex < 0 || invIndex >= inventory.length) return { ok: false, reason: "bad_slot" };
  const previous = inventory[invIndex] ?? null;
  if (previous && !canEquipInSlot(previous, slot)) {
    return { ok: false, reason: "bad_slot" };
  }
  inventory[invIndex] = item;
  if (previous) equipment[slot] = previous;
  else delete equipment[slot];
  return { ok: true };
}

/** Переставить / обменять две ячейки рюкзака. */
export function swapInventoryCells(inventory: InventoryBag, a: number, b: number): GearChangeResult {
  if (a === b) return { ok: true };
  if (a < 0 || b < 0 || a >= inventory.length || b >= inventory.length) {
    return { ok: false, reason: "bad_slot" };
  }
  const tmp = inventory[a] ?? null;
  inventory[a] = inventory[b] ?? null;
  inventory[b] = tmp;
  return { ok: true };
}

/** Обмен двух слотов экипировки (если типы совместимы). */
export function swapEquipmentSlots(
  equipment: EquipmentMap,
  from: EquipSlotId,
  to: EquipSlotId,
): GearChangeResult {
  if (from === to) return { ok: true };
  const a = equipment[from];
  if (!a) return { ok: false, reason: "empty" };
  if (!canEquipInSlot(a, to)) return { ok: false, reason: "bad_slot" };
  const b = equipment[to] ?? null;
  if (b && !canEquipInSlot(b, from)) return { ok: false, reason: "bad_slot" };
  equipment[to] = a;
  if (b) equipment[from] = b;
  else delete equipment[from];
  return { ok: true };
}
