import { generateItem } from "../items/generate";
import type { EquipSlotId } from "../items/slots";
import type { ItemDef, ItemRarity } from "../items/types";
import { buyPrice, sellPrice } from "./economy";
import type { Aspect } from "../types";
import type { GameState } from "./gameState";

export type MerchantId = "weaponsmith" | "armorer" | "herbalist" | "baker";

/** Вкладка рынка: торговцы + выкуп. */
export type MarketTabId = MerchantId | "buyback";

export interface MerchantDef {
  id: MerchantId;
  label: string;
  /** Слоты ассортимента. */
  slots: readonly EquipSlotId[];
  /** Акцент портрета (CSS color). */
  accent: string;
  /** Имя файла в assets/art/backgrounds без расширения. */
  portraitStem: string;
}

export interface MarketOffer {
  item: ItemDef;
  price: number;
}

export type MarketStock = Record<MerchantId, MarketOffer[]>;

export interface MarketState {
  stock: MarketStock;
  /** Последние проданные игроком предметы (новые в начале), макс. BUYBACK_MAX. */
  buyback: MarketOffer[];
}

export const BUYBACK_MAX = 20;

export const MERCHANTS: readonly MerchantDef[] = [
  {
    id: "weaponsmith",
    label: "Оружейник",
    slots: ["mainhand", "offhand"],
    accent: "#c45a3a",
    portraitStem: "weaponsmith",
  },
  {
    id: "armorer",
    label: "Бронник",
    slots: ["head", "chest", "shoulders", "hands", "waist", "legs", "feet"],
    accent: "#6a8a9a",
    portraitStem: "armorsmith",
  },
  {
    id: "herbalist",
    label: "Травник",
    slots: ["neck", "trinket"],
    accent: "#5a9a5a",
    portraitStem: "herbalist",
  },
  {
    id: "baker",
    label: "Пекарь",
    slots: ["ring1", "ring2", "trinket"],
    accent: "#c4a05a",
    portraitStem: "baker",
  },
];

export const MERCHANT_BY_ID: Record<MerchantId, MerchantDef> = Object.fromEntries(
  MERCHANTS.map((m) => [m.id, m]),
) as Record<MerchantId, MerchantDef>;

/** В основном необычные, реже магические, редко редкие. Эпик+ никогда. */
const SHOP_RARITY: { rarity: ItemRarity; weight: number }[] = [
  { rarity: "uncommon", weight: 68 },
  { rarity: "magic", weight: 27 },
  { rarity: "rare", weight: 5 },
];

const STOCK_MIN = 3;
const STOCK_MAX = 10;

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

function pickWeighted<T>(items: T[], weightOf: (t: T) => number, rng: () => number): T {
  let total = 0;
  for (const it of items) total += Math.max(0, weightOf(it));
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1]!;
}

function emptyStock(): MarketStock {
  return {
    weaponsmith: [],
    armorer: [],
    herbalist: [],
    baker: [],
  };
}

function cloneOffers(list: MarketOffer[] | undefined | null): MarketOffer[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((o) => o?.item && typeof o.price === "number")
    .map((o) => ({
      item: structuredClone(o.item),
      price: Math.max(1, Math.floor(o.price)),
    }));
}

function shopItemLevel(heroLevel: number): number {
  return Math.max(1, heroLevel);
}

function rollOffer(
  merchant: MerchantDef,
  itemLevel: number,
  learnedAspects: Aspect[],
  rng: () => number,
): MarketOffer {
  const slot = merchant.slots[randInt(rng, 0, merchant.slots.length - 1)]!;
  const rarity = pickWeighted(SHOP_RARITY, (r) => r.weight, rng).rarity;
  const item = generateItem({
    slot,
    rarity,
    itemLevel,
    learnedAspects,
    rng,
  });
  return { item, price: buyPrice(item) };
}

export function rollMerchantStock(
  merchant: MerchantDef,
  opts: { heroLevel: number; learnedAspects: Aspect[]; rng?: () => number },
): MarketOffer[] {
  const rng = opts.rng ?? Math.random;
  const count = randInt(rng, STOCK_MIN, STOCK_MAX);
  const ilvl = shopItemLevel(opts.heroLevel);
  const out: MarketOffer[] = [];
  for (let i = 0; i < count; i++) {
    out.push(rollOffer(merchant, ilvl, opts.learnedAspects, rng));
  }
  return out;
}

/** Полный реролл ассортимента торговцев (выкуп не трогаем). */
export function refreshMarketStock(
  state: GameState,
  rng: () => number = Math.random,
): MarketState {
  const buyback = cloneOffers(state.market?.buyback);
  const stock = emptyStock();
  for (const merchant of MERCHANTS) {
    stock[merchant.id] = rollMerchantStock(merchant, {
      heroLevel: state.hero.level,
      learnedAspects: state.hero.learnedAspects,
      rng,
    });
  }
  state.market = { stock, buyback };
  return state.market;
}

/** Добавить проданный предмет в выкуп (цена = цена продажи). */
export function pushBuyback(state: GameState, item: ItemDef): void {
  ensureMarket(state);
  const offer: MarketOffer = {
    item: structuredClone(item),
    price: sellPrice(item),
  };
  state.market.buyback.unshift(offer);
  if (state.market.buyback.length > BUYBACK_MAX) {
    state.market.buyback.length = BUYBACK_MAX;
  }
}

export function cloneMarketState(src: MarketState | undefined | null): MarketState {
  if (!src?.stock) {
    return { stock: emptyStock(), buyback: [] };
  }
  const stock = emptyStock();
  for (const merchant of MERCHANTS) {
    stock[merchant.id] = cloneOffers(src.stock[merchant.id]);
  }
  return { stock, buyback: cloneOffers(src.buyback) };
}

/** Дозаполнить market у старых сейвов; полный реролл только если все полки пусты. */
export function ensureMarket(state: GameState): void {
  state.market = cloneMarketState(state.market);
  const allEmpty = MERCHANTS.every((m) => state.market.stock[m.id].length === 0);
  if (allEmpty) refreshMarketStock(state);
}

export function isMerchantId(id: string): id is MerchantId {
  return id in MERCHANT_BY_ID;
}
