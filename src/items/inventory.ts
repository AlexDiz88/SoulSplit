import {
  canEquipInSlot,
  getItemGrip,
  isBowFamilyWeapon,
  isOffhandCompatibleWithMain,
  isQuiverItem,
  isTwoHandWeapon,
  type EquipmentMap,
} from "./equipment";
import type { EquipSlotId } from "./slots";
import type { ItemDef } from "./types";

/** Оффхенд, который нужно снять при надевании mainhand (2H или лук/арбалет без колчана). */
function offhandDisplacedByMainhand(item: ItemDef, equipment: EquipmentMap): ItemDef | null {
  const off = equipment.offhand ?? null;
  if (!off) return null;
  if (isTwoHandWeapon(item)) return off;
  if (isBowFamilyWeapon(item) && !isQuiverItem(off)) return off;
  return null;
}

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

/** Целевой слот экипировки для предмета (кольца / either-оружие - в первую пустую ячейку). */
export function resolveEquipSlot(item: ItemDef, equipment: EquipmentMap): EquipSlotId | null {
  if (item.slot === "ring1" || item.slot === "ring2") {
    if (!equipment.ring1 && canEquipInSlot(item, "ring1", equipment)) return "ring1";
    if (!equipment.ring2 && canEquipInSlot(item, "ring2", equipment)) return "ring2";
    const prefer = item.slot;
    return canEquipInSlot(item, prefer, equipment) ? prefer : null;
  }
  const grip = getItemGrip(item);
  if (grip === "either") {
    if (!equipment.mainhand && canEquipInSlot(item, "mainhand", equipment)) return "mainhand";
    if (!equipment.offhand && canEquipInSlot(item, "offhand", equipment)) return "offhand";
    if (canEquipInSlot(item, "mainhand", equipment)) return "mainhand";
    if (canEquipInSlot(item, "offhand", equipment)) return "offhand";
    return null;
  }
  if (grip === "mainhand" || grip === "twoHand") {
    return canEquipInSlot(item, "mainhand", equipment) ? "mainhand" : null;
  }
  if (grip === "offhand") {
    return canEquipInSlot(item, "offhand", equipment) ? "offhand" : null;
  }
  return canEquipInSlot(item, item.slot, equipment) ? item.slot : null;
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
  if (!canEquipInSlot(item, slot, equipment)) return { ok: false, reason: "bad_slot" };

  const previous = equipment[slot] ?? null;
  const displaceOffhand =
    slot === "mainhand" ? offhandDisplacedByMainhand(item, equipment) : null;

  if (displaceOffhand) {
    if (previous) {
      const free = inventory.findIndex((cell, i) => i !== invIndex && cell == null);
      if (free < 0) return { ok: false, reason: "inventory_full" };
      inventory[free] = displaceOffhand;
      inventory[invIndex] = previous;
    } else {
      inventory[invIndex] = displaceOffhand;
    }
    delete equipment.offhand;
    equipment[slot] = item;
    return { ok: true };
  }

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
  if (previous && !canEquipInSlot(previous, slot, equipment)) {
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
  const b = equipment[to] ?? null;

  // Симулируем итог: a → to, b → from (или from пуст).
  const next: EquipmentMap = { ...equipment };
  next[to] = a;
  if (b) next[from] = b;
  else delete next[from];

  if (!canEquipInSlot(a, to, next)) return { ok: false, reason: "bad_slot" };
  if (b && !canEquipInSlot(b, from, next)) return { ok: false, reason: "bad_slot" };
  if (next.mainhand && next.offhand && !isOffhandCompatibleWithMain(next.mainhand, next.offhand)) {
    return { ok: false, reason: "bad_slot" };
  }

  equipment[to] = a;
  if (b) equipment[from] = b;
  else delete equipment[from];
  return { ok: true };
}
