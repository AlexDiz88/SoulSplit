import {
  GLOBAL_EFFECT_DEFS,
  makeGlobalEffect,
  type GlobalEffect,
  type GlobalEffectId,
} from "../effects/globalEffects";

/** Длительность травмы после поражения (10 мин). */
export const TRAUMA_DURATION_SEC = 10 * 60;

export type TraumaLevel = 1 | 2 | 3;

export interface TraumaLevelDef {
  level: TraumaLevel;
  id: GlobalEffectId;
  name: string;
  /** Множитель исходящего урона (0.8 = -20%). */
  damageDealtMult: number;
  /** Снижение урона для текста игрока (0.2 = -20%). */
  damageReduceFraction: number;
  healCost: number;
}

/** Три ступени травмы: каждая следующая смерть усиливает. */
export const TRAUMA_LEVELS: readonly TraumaLevelDef[] = [
  {
    level: 1,
    id: "trauma_bruise",
    name: "Ушиб",
    damageDealtMult: 0.8,
    damageReduceFraction: 0.2,
    healCost: 100,
  },
  {
    level: 2,
    id: "trauma_wound",
    name: "Рана",
    damageDealtMult: 0.65,
    damageReduceFraction: 0.35,
    healCost: 250,
  },
  {
    level: 3,
    id: "trauma_fracture",
    name: "Перелом",
    damageDealtMult: 0.5,
    damageReduceFraction: 0.5,
    healCost: 500,
  },
] as const;

const TRAUMA_IDS = new Set<GlobalEffectId>(TRAUMA_LEVELS.map((t) => t.id));

export interface HealerBuffOffer {
  id: GlobalEffectId;
  name: string;
  description: string;
  durationSec: number;
  price: number;
}

/** Временные усиления у лекаря. Повторная покупка обновляет таймер до max. */
export const HEALER_BUFF_OFFERS: readonly HealerBuffOffer[] = [
  {
    id: "blessing_might",
    name: "Благословение силы",
    description: "Урон повышен на 15%.",
    durationSec: 15 * 60,
    price: 150,
  },
  {
    id: "stone_skin",
    name: "Каменная кожа",
    description: "Входящий урон снижен на 15%.",
    durationSec: 20 * 60,
    price: 200,
  },
  {
    id: "vital_surge",
    name: "Живительный эликсир",
    description: "Максимальное здоровье повышено на 20%.",
    durationSec: 20 * 60,
    price: 180,
  },
  {
    id: "spirit_clarity",
    name: "Ясность духа",
    description: "Максимальная мана повышена на 25%.",
    durationSec: 15 * 60,
    price: 120,
  },
  {
    id: "swift_hands",
    name: "Быстрые руки",
    description: "Скорость атаки повышена на 15%.",
    durationSec: 10 * 60,
    price: 160,
  },
] as const;

export function isTraumaEffectId(id: GlobalEffectId): boolean {
  return TRAUMA_IDS.has(id);
}

export function traumaDefById(id: GlobalEffectId): TraumaLevelDef | null {
  return TRAUMA_LEVELS.find((t) => t.id === id) ?? null;
}

export function findTrauma(effects: GlobalEffect[]): GlobalEffect | null {
  return effects.find((e) => isTraumaEffectId(e.id)) ?? null;
}

export function traumaLevelOf(effects: GlobalEffect[]): TraumaLevelDef | null {
  const cur = findTrauma(effects);
  if (!cur) return null;
  return traumaDefById(cur.id);
}

/** Следующая ступень травмы (или та же 3-я с обновлением таймера). */
export function nextTraumaLevel(current: TraumaLevel | null): TraumaLevelDef {
  if (current == null) return TRAUMA_LEVELS[0]!;
  if (current >= 3) return TRAUMA_LEVELS[2]!;
  return TRAUMA_LEVELS[current]!;
}

/**
 * После поражения: наложить / усилить травму на 10 мин.
 * Несколько травм одновременно нельзя - остаётся одна ступень.
 */
export function applyDefeatTrauma(effects: GlobalEffect[]): {
  effects: GlobalEffect[];
  trauma: TraumaLevelDef;
} {
  const cur = traumaLevelOf(effects);
  const next = nextTraumaLevel(cur?.level ?? null);
  const without = effects.filter((e) => !isTraumaEffectId(e.id));
  return {
    effects: [...without, makeGlobalEffect(next.id, TRAUMA_DURATION_SEC)],
    trauma: next,
  };
}

/** Снять все травмы (лечение у лекаря). */
export function clearTrauma(effects: GlobalEffect[]): GlobalEffect[] {
  return effects.filter((e) => !isTraumaEffectId(e.id));
}

/** Купить / обновить бафф лекаря: таймер = max(текущий, длительность оффера). */
export function grantOrRefreshHealerBuff(
  effects: GlobalEffect[],
  buffId: GlobalEffectId,
): GlobalEffect[] {
  const offer = HEALER_BUFF_OFFERS.find((o) => o.id === buffId);
  if (!offer) return effects;
  const def = GLOBAL_EFFECT_DEFS[buffId];
  if (!def || def.polarity !== "buff" || def.presence !== "meta") return effects;

  const existing = effects.find((e) => e.id === buffId);
  const nextRemaining =
    existing?.remaining != null
      ? Math.max(existing.remaining, offer.durationSec)
      : offer.durationSec;

  const without = effects.filter((e) => e.id !== buffId);
  return [...without, makeGlobalEffect(buffId, nextRemaining)];
}

export function healerBuffOffer(id: GlobalEffectId): HealerBuffOffer | null {
  return HEALER_BUFF_OFFERS.find((o) => o.id === id) ?? null;
}

export function formatTraumaPenaltyLine(trauma: TraumaLevelDef): string {
  const pct = Math.round(trauma.damageReduceFraction * 100);
  return `(Получена травма: ${trauma.name}. Урон снижен на ${pct}% на 10 мин. Лечение у лекаря в городе.)`;
}
