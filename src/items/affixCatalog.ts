import { ALL_ASPECTS, ASPECT_LABEL } from "../abilities/definitions";
import { aspectDamageStat, formatAffixBonus, type AffixFamily, type StatId } from "../stats/statIds";
import type { AffixDef, AffixTierRange, RolledAffix } from "./types";
import {
  rollTierIndex,
  sampleAffixQuality,
  TIER_COUNT,
  TIER_IDS,
  type AffixTierId,
} from "./tiers";

/** [min, max] на каждый из 10 тиров F…A5. */
type TierScales = readonly [number, number][];

function tiers10(scales: TierScales): AffixTierRange[] {
  if (scales.length !== TIER_COUNT) {
    throw new Error(`affix tiers: expected ${TIER_COUNT}, got ${scales.length}`);
  }
  return scales.map(([min, max], i) => ({
    id: TIER_IDS[i]!,
    min,
    max,
  }));
}

function affix(
  id: string,
  statId: StatId,
  family: AffixFamily,
  label: string,
  scale: TierScales,
  weight = 10,
): AffixDef {
  return {
    id,
    statId,
    family,
    label,
    allowedAffixSlots: ["prefix", "suffix"],
    tiers: tiers10(scale),
    weight,
  };
}

/**
 * Диапазоны: avg растёт; соседнее перекрытие ≤ ~10% ширины;
 * max(T) < avg(T+2). Кап контента ilvl 20.
 */
const CORE: AffixDef[] = [
  affix("max_hp", "maxHp", "defense", "здоровья", [
    [22, 30],
    [28, 38],
    [36, 48],
    [45, 60],
    [56, 74],
    [70, 92],
    [86, 112],
    [105, 136],
    [128, 166],
    [156, 200],
  ]),
  affix(
    "hp_regen",
    "hpRegen",
    "resource",
    "здоровья/сек",
    [
      [1, 1],
      [1, 2],
      [1, 2],
      [2, 3],
      [2, 3],
      [2, 4],
      [3, 4],
      [3, 5],
      [4, 6],
      [4, 6],
    ],
    6,
  ),
  affix("phys_dr", "physDamageReduction", "defense", "снижения физ. урона", [
    [2, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [5, 7],
    [6, 8],
    [7, 9],
    [8, 10],
    [9, 12],
    [10, 13],
  ]),
  affix("magic_res", "magicResist", "defense", "сопротивления магии", [
    [2, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [5, 7],
    [6, 8],
    [7, 9],
    [8, 10],
    [9, 12],
    [10, 13],
  ]),
  affix(
    "evasion",
    "evasion",
    "defense",
    "уклонения",
    [
      [2, 3],
      [2, 4],
      [3, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 11],
      [9, 12],
    ],
    8,
  ),
  affix(
    "block",
    "blockChance",
    "defense",
    "шанса блока",
    [
      [2, 3],
      [2, 4],
      [3, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 10],
      [9, 12],
    ],
    5,
  ),
  affix(
    "parry",
    "parryChance",
    "defense",
    "шанса парирования",
    [
      [2, 3],
      [2, 4],
      [3, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 10],
      [9, 12],
    ],
    5,
  ),

  affix("max_mana", "maxMana", "resource", "маны", [
    [10, 16],
    [14, 22],
    [18, 28],
    [24, 36],
    [30, 44],
    [38, 54],
    [46, 66],
    [56, 80],
    [68, 96],
    [82, 116],
  ]),
  affix("mana_regen", "manaRegen", "resource", "маны/сек", [
    [1, 1],
    [1, 2],
    [1, 2],
    [2, 2],
    [2, 3],
    [2, 3],
    [3, 4],
    [3, 4],
    [3, 5],
    [4, 5],
  ]),
  affix(
    "mana_cost_red",
    "manaCostReduction",
    "resource",
    "снижения стоимости маны",
    [
      [2, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [5, 8],
      [6, 9],
      [7, 10],
      [8, 11],
      [9, 12],
    ],
    7,
  ),

  affix("weapon_atk", "weaponAttackBonus", "offense", "бонуса атаки оружия", [
    [3, 5],
    [4, 6],
    [5, 8],
    [6, 9],
    [7, 11],
    [8, 13],
    [10, 15],
    [12, 18],
    [14, 20],
    [16, 24],
  ]),
  affix("ability_dmg", "abilityDamage", "offense", "урона способностей", [
    [4, 6],
    [5, 8],
    [6, 9],
    [7, 11],
    [8, 12],
    [10, 14],
    [11, 16],
    [13, 18],
    [15, 21],
    [17, 24],
  ]),
  affix("crit_chance", "critChance", "offense", "шанса крита", [
    [1, 2],
    [1, 3],
    [2, 3],
    [2, 4],
    [3, 5],
    [3, 5],
    [4, 6],
    [4, 7],
    [5, 8],
    [6, 9],
  ]),
  affix(
    "crit_dmg",
    "critDamage",
    "offense",
    "урона крита",
    [
      [5, 9],
      [7, 12],
      [8, 14],
      [10, 16],
      [12, 18],
      [14, 22],
      [16, 24],
      [18, 28],
      [20, 32],
      [24, 36],
    ],
    8,
  ),

  affix("attack_speed", "attackSpeed", "tempo", "скорости атаки", [
    [3, 5],
    [4, 6],
    [5, 7],
    [5, 8],
    [6, 9],
    [7, 11],
    [8, 12],
    [9, 13],
    [10, 14],
    [11, 16],
  ]),
  affix("cast_speed", "castSpeed", "tempo", "скорости каста", [
    [3, 5],
    [4, 6],
    [5, 7],
    [5, 8],
    [6, 9],
    [7, 11],
    [8, 12],
    [9, 13],
    [10, 14],
    [11, 16],
  ]),
  affix("cdr", "cooldownReduction", "tempo", "скорости перезарядки", [
    [2, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [4, 7],
    [5, 8],
    [6, 9],
    [7, 10],
    [8, 11],
    [9, 12],
  ]),
];

function aspectAffixes(): AffixDef[] {
  return ALL_ASPECTS.map((aspect) =>
    affix(
      `aspect_dmg_${aspect}`,
      aspectDamageStat(aspect),
      "aspect",
      `урона аспекта (${ASPECT_LABEL[aspect]})`,
      [
        [4, 7],
        [5, 9],
        [6, 10],
        [7, 12],
        [8, 14],
        [10, 16],
        [11, 18],
        [13, 20],
        [15, 23],
        [17, 26],
      ],
      8,
    ),
  );
}

export const AFFIX_CATALOG: AffixDef[] = [...CORE, ...aspectAffixes()];

export const AFFIX_BY_ID: Record<string, AffixDef> = Object.fromEntries(
  AFFIX_CATALOG.map((a) => [a.id, a]),
);

export function tierRangeAt(def: AffixDef, tierIndex: number): AffixTierRange {
  return def.tiers[Math.max(0, Math.min(TIER_COUNT - 1, tierIndex))]!;
}

/** @deprecated Используй rollAffix. Оставлен для совместимости вызовов. */
export function pickTier(def: AffixDef, itemLevel: number): AffixTierRange {
  const idx = Math.min(TIER_COUNT - 1, Math.max(0, Math.ceil(itemLevel / 2) - 1));
  return tierRangeAt(def, idx);
}

export interface RolledAffixValues {
  value: number;
  tierId: AffixTierId;
  tierMin: number;
  tierMax: number;
}

/** Тир (с оффсетом) + значение внутри диапазона (чаще середина). */
export function rollAffix(def: AffixDef, itemLevel: number, rng: () => number): RolledAffixValues {
  const tierIndex = rollTierIndex(itemLevel, rng);
  const t = tierRangeAt(def, tierIndex);
  if (t.max <= t.min) {
    return { value: t.min, tierId: t.id, tierMin: t.min, tierMax: t.max };
  }
  const q = sampleAffixQuality(rng);
  const value = Math.round(t.min + q * (t.max - t.min));
  return { value, tierId: t.id, tierMin: t.min, tierMax: t.max };
}

/** @deprecated → rollAffix */
export function rollAffixValue(def: AffixDef, itemLevel: number, rng: () => number): number {
  return rollAffix(def, itemLevel, rng).value;
}

/**
 * Текст аффикса: "+52 здоровья [48-66] D"
 * Старые сейвы без tier* показывают только бонус.
 */
export function formatRolledAffix(a: RolledAffix): string {
  const label = AFFIX_BY_ID[a.affixId]?.label ?? a.label;
  const bonus = formatAffixBonus(a.statId, a.value, label);
  if (
    a.tierId !== undefined &&
    a.tierMin !== undefined &&
    a.tierMax !== undefined
  ) {
    return `${bonus} [${a.tierMin}-${a.tierMax}] ${a.tierId}`;
  }
  return bonus;
}
