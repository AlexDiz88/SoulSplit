import { ensureItemIcon } from "../art/itemIcons";
import { normalizeWeaponItemSlot } from "../items/equipment";
import { generateItem } from "../items/generate";
import {
  createPotionItem,
  POTION_BUY_PRICE,
  type PotionId,
} from "../items/potions";
import type { OffhandTypeId } from "../items/offhandTypes";
import type { EquipSlotId } from "../items/slots";
import type { ItemDef, ItemRarity } from "../items/types";
import { buyPrice, sellPrice } from "./economy";
import type { Aspect } from "../types";
import type { GameState } from "./gameState";

export type MerchantId =
  | "weaponsmith"
  | "armorer"
  | "jeweler"
  | "mystic"
  | "baker";

/** Вкладка рынка: торговцы + выкуп. */
export type MarketTabId = MerchantId | "buyback";

export interface MerchantDef {
  id: MerchantId;
  label: string;
  /** Слоты ассортимента. Пустой массив - пока ничего не продаёт. */
  slots: readonly EquipSlotId[];
  /**
   * Если в slots есть offhand - ограничить типы левой руки.
   * Без списка роллятся все OffhandTypeId.
   */
  offhandTypes?: readonly OffhandTypeId[];
  /** Мин. число офферов при реролле (без закреплённых зелий). */
  stockMin: number;
  /** Макс. число офферов при реролле (без закреплённых зелий). */
  stockMax: number;
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
    slots: ["mainhand"],
    stockMin: 3,
    stockMax: 6,
    accent: "#c45a3a",
    portraitStem: "weaponsmith",
  },
  {
    id: "armorer",
    label: "Бронник",
    slots: ["head", "chest", "shoulders", "hands", "waist", "legs", "feet", "offhand"],
    offhandTypes: ["shield", "quiver"],
    stockMin: 5,
    stockMax: 10,
    accent: "#6a8a9a",
    portraitStem: "armorsmith",
  },
  {
    id: "jeweler",
    label: "Ювелир",
    slots: ["ring1", "ring2", "neck"],
    stockMin: 2,
    stockMax: 4,
    accent: "#9a7acc",
    portraitStem: "jeweler",
  },
  {
    id: "mystic",
    label: "Мистик",
    slots: ["trinket", "offhand"],
    offhandTypes: ["tome", "orb", "relic"],
    stockMin: 2,
    stockMax: 4,
    accent: "#5a9a5a",
    portraitStem: "mystic",
  },
  {
    id: "baker",
    label: "Пекарь",
    slots: [],
    stockMin: 0,
    stockMax: 0,
    accent: "#c4a05a",
    portraitStem: "baker",
  },
];

export const MERCHANT_BY_ID: Record<MerchantId, MerchantDef> = Object.fromEntries(
  MERCHANTS.map((m) => [m.id, m]),
) as Record<MerchantId, MerchantDef>;

/** Чаще обычные, реже необычные, еще реже магические, крайне редко редкие. Эпик+ никогда. */
const SHOP_RARITY: { rarity: ItemRarity; weight: number }[] = [
  { rarity: "common", weight: 55 },
  { rarity: "uncommon", weight: 30 },
  { rarity: "magic", weight: 13 },
  { rarity: "rare", weight: 2 },
];

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
    jeweler: [],
    mystic: [],
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

function pickOffhandType(
  merchant: MerchantDef,
  rng: () => number,
): OffhandTypeId | undefined {
  const pool = merchant.offhandTypes;
  if (!pool?.length) return undefined;
  return pool[randInt(rng, 0, pool.length - 1)]!;
}

function rollOffer(
  merchant: MerchantDef,
  itemLevel: number,
  learnedAspects: Aspect[],
  rng: () => number,
): MarketOffer {
  const slot = merchant.slots[randInt(rng, 0, merchant.slots.length - 1)]!;
  const rarity = pickWeighted(SHOP_RARITY, (r) => r.weight, rng).rarity;
  const forceOffhandType = slot === "offhand" ? pickOffhandType(merchant, rng) : undefined;
  const item = generateItem({
    slot,
    rarity,
    itemLevel,
    learnedAspects,
    forceOffhandType,
    rng,
  });
  return { item, price: buyPrice(item) };
}

export function rollMerchantStock(
  merchant: MerchantDef,
  opts: { heroLevel: number; learnedAspects: Aspect[]; rng?: () => number },
): MarketOffer[] {
  if (merchant.slots.length === 0 || merchant.stockMax <= 0) return [];
  const rng = opts.rng ?? Math.random;
  const lo = Math.max(0, merchant.stockMin);
  const hi = Math.max(lo, merchant.stockMax);
  const count = randInt(rng, lo, hi);
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
  const raw = src.stock as Partial<Record<MerchantId | "herbalist", MarketOffer[]>>;
  for (const merchant of MERCHANTS) {
    stock[merchant.id] = cloneOffers(raw[merchant.id]);
  }
  // Старые сейвы: herbalist → mystic.
  if (!stock.mystic.length && raw.herbalist?.length) {
    stock.mystic = cloneOffers(raw.herbalist);
  }
  return { stock, buyback: cloneOffers(src.buyback) };
}

/** Дозаполнить market у старых сейвов; полный реролл только если все полки пусты. */
export function ensureMarket(state: GameState): void {
  const srcStock = state.market?.stock as
    | (Partial<Record<MerchantId | "herbalist", MarketOffer[]>> & object)
    | undefined
    | null;
  const hadJeweler = Boolean(srcStock && Object.prototype.hasOwnProperty.call(srcStock, "jeweler"));
  const hadMystic = Boolean(
    srcStock &&
      (Object.prototype.hasOwnProperty.call(srcStock, "mystic") ||
        Object.prototype.hasOwnProperty.call(srcStock, "herbalist")),
  );
  state.market = cloneMarketState(state.market);
  for (const merchant of MERCHANTS) {
    if (merchant.slots.length === 0) state.market.stock[merchant.id] = [];
  }
  const sellable = MERCHANTS.filter((m) => m.slots.length > 0);
  const allEmpty = sellable.every((m) => state.market.stock[m.id].length === 0);
  if (allEmpty) {
    refreshMarketStock(state);
  } else {
    if (!hadJeweler) {
      state.market.stock.jeweler = rollMerchantStock(MERCHANT_BY_ID.jeweler, {
        heroLevel: state.hero.level,
        learnedAspects: state.hero.learnedAspects,
      });
    }
    if (!hadMystic) {
      state.market.stock.mystic = rollMerchantStock(MERCHANT_BY_ID.mystic, {
        heroLevel: state.hero.level,
        learnedAspects: state.hero.learnedAspects,
      });
    }
  }
  for (const merchant of MERCHANTS) {
    for (const offer of state.market.stock[merchant.id]) {
      normalizeWeaponItemSlot(offer.item);
      ensureItemIcon(offer.item);
    }
  }
  for (const offer of state.market.buyback) {
    normalizeWeaponItemSlot(offer.item);
    ensureItemIcon(offer.item);
  }
}

export function isMerchantId(id: string): id is MerchantId {
  return id in MERCHANT_BY_ID;
}

/** Закреплённые зелья мистика: всегда в продаже, не кончаются. */
export function mysticPinnedOffers(): MarketOffer[] {
  const ids: PotionId[] = ["healing_potion", "mana_potion"];
  return ids.map((id) => {
    const item = createPotionItem(id, 1);
    item.id = `shop_${id}`;
    return { item, price: POTION_BUY_PRICE };
  });
}
