import healingPotionUrl from "../../assets/art/items/misc/healing_potion.png";
import manaPotionUrl from "../../assets/art/items/misc/mana_potion.png";
import type { EquipmentMap } from "./equipment";
import type { InventoryBag } from "./inventory";
import type { ItemDef, PotionId } from "./types";

export type { PotionId };

export const POTION_HEAL_PCT = 0.3;
export const POTION_SHARED_CD = 10;
/** Базовая ёмкость без пояса. */
export const POTION_CAPACITY_BASE = 1;
export const POTION_CAPACITY_MAX = 5;

/** Цена продажи одной штуки. */
export const POTION_SELL_PRICE = 8;
/** Цена покупки у мистика. */
export const POTION_BUY_PRICE = 25;

export const POTION_LABEL: Record<PotionId, string> = {
  healing_potion: "Зелье здоровья",
  mana_potion: "Зелье маны",
};

/** Единый текст эффекта для тултипа, рынка, боя и пояса. */
export function potionEffectText(id: PotionId): string {
  const pct = Math.round(POTION_HEAL_PCT * 100);
  return id === "healing_potion"
    ? `Восстанавливает ${pct}% здоровья`
    : `Восстанавливает ${pct}% маны`;
}

/** Примечание к зельям в карточке предмета (инвентарь / рынок). */
export const POTION_BATTLE_NOTE =
  "В бою можно применить только снаряженные зелья";

const POTION_ICON: Record<PotionId, string> = {
  healing_potion: healingPotionUrl,
  mana_potion: manaPotionUrl,
};

export function isPotionItem(item: ItemDef | null | undefined): item is ItemDef & {
  potionId: PotionId;
} {
  return Boolean(item?.potionId === "healing_potion" || item?.potionId === "mana_potion");
}

export function potionIconUrl(id: PotionId): string {
  return POTION_ICON[id];
}

export function createPotionItem(id: PotionId, stackCount = 1): ItemDef {
  const count = Math.max(1, Math.floor(stackCount));
  return {
    id: `potion_${id}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: POTION_LABEL[id],
    /** Не используется для экипа; зелья блокируются через isPotionItem. */
    slot: "trinket",
    rarity: "common",
    itemLevel: 1,
    affixes: [],
    icon: potionIconUrl(id),
    potionId: id,
    stackCount: count,
  };
}

/**
 * Ёмкость зелий: 1 по умолчанию, пояс добавляет `potionCount`, кап 5.
 */
export function beltPotionCapacity(equipment: EquipmentMap): number {
  const base = equipment.waist?.base;
  const bonus =
    base?.statId === "potionCount" ? Math.max(0, Math.floor(base.value)) : 0;
  return Math.min(POTION_CAPACITY_MAX, POTION_CAPACITY_BASE + bonus);
}

export interface BeltPotionState {
  beltHpPotions: number;
  beltManaPotions: number;
}

export function beltLoadedCount(belt: BeltPotionState): number {
  return Math.max(0, belt.beltHpPotions) + Math.max(0, belt.beltManaPotions);
}

export function clampBeltToCapacity(
  belt: BeltPotionState,
  capacity: number,
): { belt: BeltPotionState; overflowHp: number; overflowMana: number } {
  const cap = Math.max(0, Math.min(POTION_CAPACITY_MAX, Math.floor(capacity)));
  let hp = Math.max(0, Math.floor(belt.beltHpPotions));
  let mana = Math.max(0, Math.floor(belt.beltManaPotions));
  let overflowHp = 0;
  let overflowMana = 0;
  while (hp + mana > cap) {
    if (mana > 0) {
      mana -= 1;
      overflowMana += 1;
    } else if (hp > 0) {
      hp -= 1;
      overflowHp += 1;
    } else break;
  }
  return {
    belt: { beltHpPotions: hp, beltManaPotions: mana },
    overflowHp,
    overflowMana,
  };
}

/** Добавить стак зелий в сумку (слияние по potionId). -1 если нет места. */
export function addPotionToInventory(inv: InventoryBag, potion: ItemDef): number {
  if (!isPotionItem(potion)) return -1;
  const add = Math.max(1, Math.floor(potion.stackCount ?? 1));
  for (let i = 0; i < inv.length; i++) {
    const cell = inv[i];
    if (isPotionItem(cell) && cell.potionId === potion.potionId) {
      cell.stackCount = Math.max(1, Math.floor(cell.stackCount ?? 1)) + add;
      return i;
    }
  }
  const free = inv.findIndex((cell) => cell == null);
  if (free < 0) return -1;
  inv[free] = {
    ...potion,
    id: potion.id,
    stackCount: add,
    icon: potion.icon ?? potionIconUrl(potion.potionId),
  };
  return free;
}

/** Снять 1 зелье из ячейки; удаляет стак при 0. */
export function takeOneFromPotionStack(inv: InventoryBag, index: number): PotionId | null {
  const cell = inv[index];
  if (!isPotionItem(cell)) return null;
  const count = Math.max(1, Math.floor(cell.stackCount ?? 1));
  const id = cell.potionId;
  if (count <= 1) inv[index] = null;
  else cell.stackCount = count - 1;
  return id;
}

export function loadPotionToBelt(
  inv: InventoryBag,
  invIndex: number,
  belt: BeltPotionState,
  capacity: number,
): { ok: true; potionId: PotionId } | { ok: false; reason: "empty" | "not_potion" | "belt_full" } {
  const cell = inv[invIndex];
  if (!cell) return { ok: false, reason: "empty" };
  if (!isPotionItem(cell)) return { ok: false, reason: "not_potion" };
  if (beltLoadedCount(belt) >= capacity) return { ok: false, reason: "belt_full" };
  const id = takeOneFromPotionStack(inv, invIndex);
  if (!id) return { ok: false, reason: "empty" };
  if (id === "healing_potion") belt.beltHpPotions += 1;
  else belt.beltManaPotions += 1;
  return { ok: true, potionId: id };
}

export function unloadPotionFromBelt(
  inv: InventoryBag,
  belt: BeltPotionState,
  potionId: PotionId,
): { ok: true } | { ok: false; reason: "empty" | "inventory_full" } {
  if (potionId === "healing_potion") {
    if (belt.beltHpPotions <= 0) return { ok: false, reason: "empty" };
  } else if (belt.beltManaPotions <= 0) {
    return { ok: false, reason: "empty" };
  }
  const added = addPotionToInventory(inv, createPotionItem(potionId, 1));
  if (added < 0) return { ok: false, reason: "inventory_full" };
  if (potionId === "healing_potion") belt.beltHpPotions -= 1;
  else belt.beltManaPotions -= 1;
  return { ok: true };
}

/** Порядок ячеек пояса для UI: сначала HP, потом Mana. */
export function beltCellPotionIds(belt: BeltPotionState): PotionId[] {
  const out: PotionId[] = [];
  for (let i = 0; i < belt.beltHpPotions; i++) out.push("healing_potion");
  for (let i = 0; i < belt.beltManaPotions; i++) out.push("mana_potion");
  return out;
}

/** Вернуть overflow в инвентарь после смены пояса. */
export function returnOverflowPotions(
  inv: InventoryBag,
  overflowHp: number,
  overflowMana: number,
): { returned: number; lost: number } {
  let returned = 0;
  let lost = 0;
  for (let i = 0; i < overflowHp; i++) {
    if (addPotionToInventory(inv, createPotionItem("healing_potion", 1)) >= 0) returned += 1;
    else lost += 1;
  }
  for (let i = 0; i < overflowMana; i++) {
    if (addPotionToInventory(inv, createPotionItem("mana_potion", 1)) >= 0) returned += 1;
    else lost += 1;
  }
  return { returned, lost };
}

/** Сколько зелий данного типа лежит в сумке (сумма стаков). */
export function countPotionsInInventory(inv: InventoryBag, potionId: PotionId): number {
  let n = 0;
  for (const cell of inv) {
    if (isPotionItem(cell) && cell.potionId === potionId) {
      n += Math.max(1, Math.floor(cell.stackCount ?? 1));
    }
  }
  return n;
}

/** Снять 1 зелье нужного типа из сумки. */
export function takePotionOfTypeFromInventory(
  inv: InventoryBag,
  potionId: PotionId,
): boolean {
  for (let i = 0; i < inv.length; i++) {
    const cell = inv[i];
    if (isPotionItem(cell) && cell.potionId === potionId) {
      return takeOneFromPotionStack(inv, i) != null;
    }
  }
  return false;
}

/**
 * После боя: дозарядить пояс до целевых счётчиков (как до боя) из сумки.
 * Тип и порядок ячеек UI сохраняются (сначала HP, потом Mana).
 */
export function refillBeltFromInventory(
  inv: InventoryBag,
  belt: BeltPotionState,
  target: BeltPotionState,
): { missingHp: number; missingMana: number } {
  const needHp = Math.max(
    0,
    Math.floor(target.beltHpPotions) - Math.max(0, Math.floor(belt.beltHpPotions)),
  );
  const needMana = Math.max(
    0,
    Math.floor(target.beltManaPotions) - Math.max(0, Math.floor(belt.beltManaPotions)),
  );
  let missingHp = 0;
  let missingMana = 0;
  for (let i = 0; i < needHp; i++) {
    if (takePotionOfTypeFromInventory(inv, "healing_potion")) belt.beltHpPotions += 1;
    else missingHp += 1;
  }
  for (let i = 0; i < needMana; i++) {
    if (takePotionOfTypeFromInventory(inv, "mana_potion")) belt.beltManaPotions += 1;
    else missingMana += 1;
  }
  return { missingHp, missingMana };
}

/** Текст нехватки для попапа после автодозарядки. */
export function beltRefillShortageText(missingHp: number, missingMana: number): string | null {
  const parts: string[] = [];
  if (missingHp > 0) parts.push(`${POTION_LABEL.healing_potion} ×${missingHp}`);
  if (missingMana > 0) parts.push(`${POTION_LABEL.mana_potion} ×${missingMana}`);
  if (parts.length === 0) return null;
  return `В сумке не хватило зелий для пояса: ${parts.join(", ")}.`;
}
