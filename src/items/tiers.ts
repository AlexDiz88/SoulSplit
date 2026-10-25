/** Канон тиров аффиксов v1 (кап предмета / героя = 20). */

export const MAX_ITEM_LEVEL = 20;

/** F→E→D→C→B, затем A1…A5. Дальше можно добавить S1…S5. */
export const TIER_IDS = [
  "F",
  "E",
  "D",
  "C",
  "B",
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
] as const;

export type AffixTierId = (typeof TIER_IDS)[number];

export const TIER_COUNT = TIER_IDS.length;

export function tierIdAt(index: number): AffixTierId {
  const i = Math.max(0, Math.min(TIER_COUNT - 1, index));
  return TIER_IDS[i]!;
}

export function tierIndexOf(id: AffixTierId): number {
  return TIER_IDS.indexOf(id);
}

/** Базовый индекс тира: ilvl 1-2 → F(0), 5-6 → D(2), 19-20 → A5(9). */
export function baseTierIndex(itemLevel: number): number {
  const ilvl = Math.max(1, Math.min(MAX_ITEM_LEVEL, Math.floor(itemLevel)));
  return Math.min(TIER_COUNT - 1, Math.ceil(ilvl / 2) - 1);
}

/**
 * Низ пары уровней (1,3,5,…): оффсеты -2/-1/0/+1 (не +2).
 * Верх пары (2,4,6,…): оффсеты -1/0/+1/+2 (не -2).
 */
export function isLowHalfOfBand(itemLevel: number): boolean {
  return Math.max(1, Math.floor(itemLevel)) % 2 === 1;
}

const WEIGHT_ZERO = 50;
const WEIGHT_ONE = 18;
const WEIGHT_TWO = 7;

/** Оффсет тира; ±3 запрещены. */
export function rollTierOffset(itemLevel: number, rng: () => number): number {
  const low = isLowHalfOfBand(itemLevel);
  const options: { offset: number; weight: number }[] = [
    { offset: 0, weight: WEIGHT_ZERO },
    { offset: -1, weight: WEIGHT_ONE },
    { offset: 1, weight: WEIGHT_ONE },
  ];
  if (low) options.push({ offset: -2, weight: WEIGHT_TWO });
  else options.push({ offset: 2, weight: WEIGHT_TWO });

  let total = 0;
  for (const o of options) total += o.weight;
  let r = rng() * total;
  for (const o of options) {
    r -= o.weight;
    if (r <= 0) return o.offset;
  }
  return options[options.length - 1]!.offset;
}

export function rollTierIndex(itemLevel: number, rng: () => number): number {
  const base = baseTierIndex(itemLevel);
  const offset = rollTierOffset(itemLevel, rng);
  return Math.max(0, Math.min(TIER_COUNT - 1, base + offset));
}

/**
 * Качество ролла внутри [min, max] тира.
 * Среднее двух uniform → чаще середина, края заметны (не удушение в центр).
 */
export function sampleAffixQuality(rng: () => number): number {
  return (rng() + rng()) / 2;
}
