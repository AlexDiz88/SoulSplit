import { isPotionItem, POTION_BUY_PRICE, POTION_SELL_PRICE } from "../items/potions";
import type { ItemDef, ItemRarity } from "../items/types";

/** Множитель продажи по редкости (цена = ilvl * mult). */
export const RARITY_SELL_MULT: Record<ItemRarity, number> = {
  common: 5,
  uncommon: 10,
  magic: 18,
  rare: 28,
  epic: 40,
};

/** Золото за победу: `(8 + kills * 2) * zone.itemLevel`. */
export function victoryGold(zoneItemLevel: number, kills: number): number {
  return (8 + kills * 2) * Math.max(1, zoneItemLevel);
}

export function sellPrice(item: ItemDef): number {
  if (isPotionItem(item)) {
    const n = Math.max(1, Math.floor(item.stackCount ?? 1));
    return POTION_SELL_PRICE * n;
  }
  return Math.max(1, item.itemLevel) * RARITY_SELL_MULT[item.rarity];
}

/** Цена покупки у торговца (продажа × 3.5; зелья - фикс). */
export function buyPrice(item: ItemDef): number {
  if (isPotionItem(item)) {
    const n = Math.max(1, Math.floor(item.stackCount ?? 1));
    return POTION_BUY_PRICE * n;
  }
  return Math.max(1, Math.round(sellPrice(item) * 3.5));
}
