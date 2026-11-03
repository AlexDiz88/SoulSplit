import { isPotionItem, POTION_BUY_PRICE, POTION_SELL_PRICE } from "../items/potions";
import { baseTierIndex, tierIdAt, type AffixTierId } from "../items/tiers";
import type { ItemDef } from "../items/types";

/** Базовая цена за уровень предмета. */
export const ITEM_BASE_PRICE = 10;

/** Доля от полной стоимости при продаже торговцу. */
export const SELL_RATIO = 0.15;

/**
 * Фикс. наценка за аффикс / базу / weapon-тир.
 * Пример канона: D = 25 → ilvl5 + 3×D = 10*5 + 75 = 125.
 */
export const TIER_MARKUP: Record<AffixTierId, number> = {
  F: 10,
  E: 15,
  D: 25,
  C: 40,
  B: 60,
  A1: 90,
  A2: 125,
  A3: 165,
  A4: 210,
  A5: 260,
};

/** Золото за победу: `(8 + kills * 2) * zone.itemLevel`. */
export function victoryGold(zoneItemLevel: number, kills: number): number {
  return (8 + kills * 2) * Math.max(1, zoneItemLevel);
}

/** Доля золота, теряемая при поражении. */
export const DEFEAT_GOLD_LOSS_RATIO = 0.1;

/** Сколько золота забрать при поражении (10%, вниз). */
export function defeatGoldLoss(gold: number): number {
  return Math.max(0, Math.floor(Math.max(0, gold) * DEFEAT_GOLD_LOSS_RATIO));
}

function resolveTierId(tierId: AffixTierId | undefined, itemLevel: number): AffixTierId {
  if (tierId) return tierId;
  return tierIdAt(baseTierIndex(itemLevel));
}

function tierMarkup(tierId: AffixTierId | undefined, itemLevel: number): number {
  return TIER_MARKUP[resolveTierId(tierId, itemLevel)] ?? TIER_MARKUP.F;
}

/**
 * Полная стоимость предмета (цена покупки у торговца для экипа).
 * `basePrice * ilvl + Σ markup(тира аффикса) + markup(базы) + markup(weapon)`.
 */
export function itemValue(item: ItemDef): number {
  if (isPotionItem(item)) {
    const n = Math.max(1, Math.floor(item.stackCount ?? 1));
    return POTION_BUY_PRICE * n;
  }

  const ilvl = Math.max(1, Math.floor(item.itemLevel));
  let total = ITEM_BASE_PRICE * ilvl;

  for (const affix of item.affixes ?? []) {
    total += tierMarkup(affix.tierId, ilvl);
  }
  if (item.base?.tierId || item.base) {
    total += tierMarkup(item.base.tierId, ilvl);
  }
  if (item.weapon) {
    total += tierMarkup(item.weapon.tierId, ilvl);
  }

  return Math.max(1, Math.floor(total));
}

/** Цена продажи торговцу. */
export function sellPrice(item: ItemDef): number {
  if (isPotionItem(item)) {
    const n = Math.max(1, Math.floor(item.stackCount ?? 1));
    return POTION_SELL_PRICE * n;
  }
  return Math.max(1, Math.round(itemValue(item) * SELL_RATIO));
}

/** Цена покупки у торговца. */
export function buyPrice(item: ItemDef): number {
  if (isPotionItem(item)) {
    const n = Math.max(1, Math.floor(item.stackCount ?? 1));
    return POTION_BUY_PRICE * n;
  }
  return itemValue(item);
}
