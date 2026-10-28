import { generateItem } from "../items/generate";
import { createPotionItem, type PotionId } from "../items/potions";
import type { EquipSlotId } from "../items/slots";
import type { ItemDef, ItemRarity } from "../items/types";
import type { Aspect } from "../types";
import type { ZoneDef, ZonePointDef } from "./zones";

const SLOT_WEIGHTS: { slot: EquipSlotId; weight: number }[] = [
  { slot: "mainhand", weight: 22 },
  { slot: "chest", weight: 12 },
  { slot: "head", weight: 10 },
  { slot: "hands", weight: 10 },
  { slot: "feet", weight: 10 },
  { slot: "legs", weight: 8 },
  { slot: "waist", weight: 6 },
  { slot: "shoulders", weight: 6 },
  { slot: "neck", weight: 5 },
  { slot: "ring1", weight: 6 },
  { slot: "trinket", weight: 5 },
];

type RarityTable = { rarity: ItemRarity; weight: number }[];

interface PointLootTable {
  /** Базовое число дропов экипа. */
  gearMin: number;
  gearMax: number;
  rarity: RarityTable;
  /** Шанс выдать хотя бы одно зелье. */
  potionChance: number;
  /** Шанс второго зелья (после первого). */
  potionExtraChance: number;
}

/** Пер-локационные таблицы Северной дороги. */
const NORTH_ROAD_LOOT: Record<string, PointLootTable> = {
  wall: {
    gearMin: 1,
    gearMax: 1,
    rarity: [
      { rarity: "common", weight: 55 },
      { rarity: "uncommon", weight: 30 },
      { rarity: "magic", weight: 13 },
      { rarity: "rare", weight: 2 },
    ],
    potionChance: 0.35,
    potionExtraChance: 0.05,
  },
  crossroads: {
    gearMin: 1,
    gearMax: 2,
    rarity: [
      { rarity: "common", weight: 40 },
      { rarity: "uncommon", weight: 32 },
      { rarity: "magic", weight: 20 },
      { rarity: "rare", weight: 7 },
      { rarity: "epic", weight: 1 },
    ],
    potionChance: 0.45,
    potionExtraChance: 0.1,
  },
  thicket: {
    gearMin: 1,
    gearMax: 2,
    rarity: [
      { rarity: "common", weight: 34 },
      { rarity: "uncommon", weight: 32 },
      { rarity: "magic", weight: 24 },
      { rarity: "rare", weight: 9 },
      { rarity: "epic", weight: 1 },
    ],
    potionChance: 0.5,
    potionExtraChance: 0.15,
  },
  bandit_camp: {
    gearMin: 2,
    gearMax: 3,
    rarity: [
      { rarity: "common", weight: 22 },
      { rarity: "uncommon", weight: 30 },
      { rarity: "magic", weight: 28 },
      { rarity: "rare", weight: 16 },
      { rarity: "epic", weight: 4 },
    ],
    potionChance: 0.6,
    potionExtraChance: 0.28,
  },
};

const DEFAULT_ZONE_LOOT: PointLootTable = {
  gearMin: 1,
  gearMax: 2,
  rarity: [
    { rarity: "common", weight: 40 },
    { rarity: "uncommon", weight: 30 },
    { rarity: "magic", weight: 20 },
    { rarity: "rare", weight: 9 },
    { rarity: "epic", weight: 1 },
  ],
  potionChance: 0.35,
  potionExtraChance: 0.1,
};

const RUINS_LOOT: PointLootTable = {
  gearMin: 1,
  gearMax: 2,
  rarity: [
    { rarity: "common", weight: 22 },
    { rarity: "uncommon", weight: 28 },
    { rarity: "magic", weight: 28 },
    { rarity: "rare", weight: 17 },
    { rarity: "epic", weight: 5 },
  ],
  potionChance: 0.4,
  potionExtraChance: 0.12,
};

function lootTableFor(zone: ZoneDef, point: ZonePointDef): PointLootTable {
  if (zone.id === "north_road") {
    return NORTH_ROAD_LOOT[point.id] ?? DEFAULT_ZONE_LOOT;
  }
  if (zone.id === "ruins") return RUINS_LOOT;
  return DEFAULT_ZONE_LOOT;
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

function rollGearCount(table: PointLootTable, kills: number, rng: () => number): number {
  const bonus = Math.min(0.12 + kills * 0.02, 0.35);
  let count = table.gearMin;
  while (count < table.gearMax && rng() < bonus + (count === table.gearMin ? 0.25 : 0.12)) {
    count += 1;
  }
  return count;
}

function rollPotions(table: PointLootTable, rng: () => number): ItemDef[] {
  if (rng() >= table.potionChance) return [];
  const out: ItemDef[] = [rollOnePotion(rng)];
  if (rng() < table.potionExtraChance) out.push(rollOnePotion(rng));
  return out;
}

function rollOnePotion(rng: () => number): ItemDef {
  const id: PotionId = rng() < 0.5 ? "healing_potion" : "mana_potion";
  return createPotionItem(id, 1);
}

export interface LootRollOptions {
  zone: ZoneDef;
  point: ZonePointDef;
  kills: number;
  learnedAspects: Aspect[];
  rng?: () => number;
}

/** Ролл добычи после победы. */
export function rollVictoryLoot(opts: LootRollOptions): ItemDef[] {
  const rng = opts.rng ?? Math.random;
  const table = lootTableFor(opts.zone, opts.point);
  const gearCount = rollGearCount(table, opts.kills, rng);
  const items: ItemDef[] = [];
  for (let i = 0; i < gearCount; i++) {
    const slot = pickWeighted(SLOT_WEIGHTS, (s) => s.weight, rng).slot;
    const rarity = pickWeighted(table.rarity, (r) => r.weight, rng).rarity;
    items.push(
      generateItem({
        slot,
        rarity,
        itemLevel: opts.point.itemLevel,
        learnedAspects: opts.learnedAspects,
        rng,
      }),
    );
  }
  items.push(...rollPotions(table, rng));
  return items;
}

export function victoryXp(zone: ZoneDef, kills: number): number {
  return zone.xpBase + kills * zone.xpPerKill;
}
