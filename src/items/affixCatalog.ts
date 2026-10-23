import { ASPECT_LABEL } from "../abilities/definitions";
import type { Aspect } from "../types";
import { aspectDamageStat, type AffixFamily, type StatId } from "../stats/statIds";
import type { AffixDef, AffixTierRange } from "./types";

function tiers(scales: [number, number, number][]): AffixTierRange[] {
  // scales: [minIlvl, min, max]
  return scales.map(([minIlvl, min, max]) => ({ minIlvl, min, max }));
}

function affix(
  id: string,
  statId: StatId,
  family: AffixFamily,
  label: string,
  scale: [number, number, number][],
  weight = 10,
): AffixDef {
  return {
    id,
    statId,
    family,
    label,
    allowedAffixSlots: ["prefix", "suffix"],
    tiers: tiers(scale),
    weight,
  };
}

const CORE: AffixDef[] = [
  affix("max_hp", "maxHp", "defense", "+к здоровью", [
    [1, 20, 40],
    [10, 40, 80],
    [20, 80, 140],
    [30, 120, 200],
  ]),
  affix("hp_regen", "hpRegen", "resource", "+к регену здоровья", [
    [1, 1, 2],
    [10, 2, 4],
    [20, 3, 6],
  ], 6),
  affix("phys_dr", "physDamageReduction", "defense", "+% снижения физ. урона", [
    [1, 2, 4],
    [10, 3, 6],
    [20, 5, 9],
    [30, 6, 12],
  ]),
  affix("magic_res", "magicResist", "defense", "+% сопротивления магии", [
    [1, 2, 4],
    [10, 3, 6],
    [20, 5, 9],
    [30, 6, 12],
  ]),
  affix("evasion", "evasion", "defense", "+% уклонения", [
    [1, 2, 4],
    [10, 3, 6],
    [20, 4, 8],
    [30, 5, 10],
  ], 8),
  affix("block", "blockChance", "defense", "+% шанса блока", [
    [1, 2, 4],
    [10, 3, 6],
    [20, 4, 8],
  ], 5),
  affix("parry", "parryChance", "defense", "+% шанса парирования", [
    [1, 2, 4],
    [10, 3, 6],
    [20, 4, 8],
  ], 5),

  affix("max_mana", "maxMana", "resource", "+к мане", [
    [1, 10, 20],
    [10, 20, 35],
    [20, 30, 50],
  ]),
  affix("mana_regen", "manaRegen", "resource", "+к регену маны", [
    [1, 1, 2],
    [10, 2, 3],
    [20, 2, 5],
  ]),
  affix("mana_cost_red", "manaCostReduction", "resource", "+% снижения стоимости маны", [
    [1, 2, 4],
    [10, 3, 6],
    [20, 4, 8],
  ], 7),

  affix("weapon_atk", "weaponAttackBonus", "offense", "+к бонусу атаки оружия", [
    [1, 2, 5],
    [10, 4, 9],
    [20, 7, 14],
    [30, 10, 18],
  ]),
  affix("ability_dmg", "abilityDamage", "offense", "+% урона способностей", [
    [1, 3, 6],
    [10, 5, 10],
    [20, 8, 14],
    [30, 10, 18],
  ]),
  affix("crit_chance", "critChance", "offense", "+% шанса крита", [
    [1, 1, 3],
    [10, 2, 4],
    [20, 3, 6],
    [30, 4, 8],
  ]),
  affix("crit_dmg", "critDamage", "offense", "+% урона крита", [
    [1, 5, 10],
    [10, 8, 15],
    [20, 10, 20],
    [30, 12, 25],
  ], 8),

  affix("attack_speed", "attackSpeed", "tempo", "+% скорости атаки", [
    [1, 3, 6],
    [10, 5, 9],
    [20, 7, 12],
    [30, 8, 14],
  ]),
  affix("cast_speed", "castSpeed", "tempo", "+% скорости каста", [
    [1, 3, 6],
    [10, 5, 9],
    [20, 7, 12],
  ]),
  affix("cdr", "cooldownReduction", "tempo", "+% скорости перезарядки", [
    [1, 2, 4],
    [10, 3, 6],
    [20, 4, 8],
    [30, 5, 10],
  ]),
];

const ASPECTS: Aspect[] = ["ice", "fire", "iron", "stealth", "light", "air"];

function aspectAffixes(): AffixDef[] {
  return ASPECTS.map((aspect) =>
    affix(
      `aspect_dmg_${aspect}`,
      aspectDamageStat(aspect),
      "aspect",
      `+% урона аспекта (${ASPECT_LABEL[aspect]})`,
      [
        [1, 4, 8],
        [10, 6, 12],
        [20, 8, 16],
        [30, 10, 20],
      ],
      8,
    ),
  );
}

export const AFFIX_CATALOG: AffixDef[] = [...CORE, ...aspectAffixes()];

export const AFFIX_BY_ID: Record<string, AffixDef> = Object.fromEntries(
  AFFIX_CATALOG.map((a) => [a.id, a]),
);

export function pickTier(def: AffixDef, itemLevel: number): AffixTierRange {
  let best = def.tiers[0]!;
  for (const t of def.tiers) {
    if (itemLevel >= t.minIlvl) best = t;
  }
  return best;
}

export function rollAffixValue(def: AffixDef, itemLevel: number, rng: () => number): number {
  const t = pickTier(def, itemLevel);
  if (t.max <= t.min) return t.min;
  return Math.round(t.min + rng() * (t.max - t.min));
}
