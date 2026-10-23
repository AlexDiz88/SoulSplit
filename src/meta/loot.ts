import { generateItem } from "../items/generate";
import type { EquipSlotId } from "../items/slots";
import type { ItemDef, ItemRarity } from "../items/types";
import type { Aspect } from "../types";
import type { ZoneDef } from "./zones";

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

const RARITY_BY_ZONE: Record<string, RarityTable> = {
  outskirts: [
    { rarity: "common", weight: 45 },
    { rarity: "uncommon", weight: 30 },
    { rarity: "magic", weight: 18 },
    { rarity: "rare", weight: 6 },
    { rarity: "epic", weight: 1 },
  ],
  ruins: [
    { rarity: "common", weight: 25 },
    { rarity: "uncommon", weight: 30 },
    { rarity: "magic", weight: 28 },
    { rarity: "rare", weight: 14 },
    { rarity: "epic", weight: 3 },
  ],
};

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

function dropCount(kills: number, rng: () => number): number {
  const bonusChance = Math.min(0.15 + kills * 0.03, 0.55);
  return 1 + (rng() < bonusChance ? 1 : 0);
}

export interface LootRollOptions {
  zone: ZoneDef;
  kills: number;
  learnedAspects: Aspect[];
  rng?: () => number;
}

/** Ролл добычи после победы. */
export function rollVictoryLoot(opts: LootRollOptions): ItemDef[] {
  const rng = opts.rng ?? Math.random;
  const count = dropCount(opts.kills, rng);
  const table = RARITY_BY_ZONE[opts.zone.id] ?? RARITY_BY_ZONE.outskirts!;
  const items: ItemDef[] = [];
  for (let i = 0; i < count; i++) {
    const slot = pickWeighted(SLOT_WEIGHTS, (s) => s.weight, rng).slot;
    const rarity = pickWeighted(table, (r) => r.weight, rng).rarity;
    items.push(
      generateItem({
        slot,
        rarity,
        itemLevel: opts.zone.itemLevel,
        learnedAspects: opts.learnedAspects,
        rng,
      }),
    );
  }
  return items;
}

export function victoryXp(zone: ZoneDef, kills: number): number {
  return zone.xpBase + kills * zone.xpPerKill;
}
