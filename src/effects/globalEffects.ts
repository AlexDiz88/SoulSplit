import rejuvenationIconUrl from "../../assets/art/skills/rejuvenation.png";
import severArteryIconUrl from "../../assets/art/skills/sever_artery.png";
import titanMightIconUrl from "../../assets/art/skills/titan_might.png";
import beastHideIconUrl from "../../assets/art/skills/beast_hide.png";
import vitalityElixirIconUrl from "../../assets/art/skills/vitality_elixir.png";
import etherBreachIconUrl from "../../assets/art/skills/ether_breach.png";
import windSpeedIconUrl from "../../assets/art/skills/wind_speed.png";

/** Глобальный эффект героя (город / карта / бой). */
export interface GlobalEffect {
  id: GlobalEffectId;
  /** null = бесконечно. */
  remaining: number | null;
}

export type GlobalEffectId =
  | "rest_recovery"
  | "fireplace_rest"
  | "trauma_bruise"
  | "trauma_wound"
  | "trauma_fracture"
  | "blessing_might"
  | "stone_skin"
  | "vital_surge"
  | "spirit_clarity"
  | "swift_hands";

export type GlobalEffectTickMode = "hub_vitals" | "none";

/** Где эффект висит: только город или везде (город + карта + бой). */
export type GlobalEffectPresence = "hub" | "meta";

export type GlobalEffectPolarity = "buff" | "debuff" | "neutral";

/** Боевые / лист-модификаторы от глобального эффекта. */
export interface GlobalEffectCombatMods {
  /** Множитель исходящего урона (1 = без изменений). */
  damageDealtMult: number;
  /** Множитель входящего урона. */
  damageTakenMult: number;
  /** Множитель max HP. */
  maxHpMult: number;
  /** Множитель max маны. */
  maxManaMult: number;
  /** Доля повышения скорости атаки (0.15 = +15%). */
  attackSpeedBonus: number;
}

export interface GlobalEffectDef {
  id: GlobalEffectId;
  name: string;
  description: string;
  iconUrl: string;
  /** null = бесконечно при ensure. */
  defaultRemaining: number | null;
  tickMode: GlobalEffectTickMode;
  /** hub - только в городе; meta - город, карта и бой. */
  presence: GlobalEffectPresence;
  polarity: GlobalEffectPolarity;
  /** Для hub_vitals: HP и мана за тик. */
  hpPerTick?: number;
  manaPerTick?: number;
  combat?: Partial<GlobalEffectCombatMods>;
}

const TRAUMA_DURATION = 10 * 60;

export const GLOBAL_EFFECT_DEFS: Record<GlobalEffectId, GlobalEffectDef> = {
  rest_recovery: {
    id: "rest_recovery",
    name: "Восстановление сил",
    description: "В городе восстанавливает 1 здоровья и 1 маны каждую секунду.",
    iconUrl: rejuvenationIconUrl,
    defaultRemaining: null,
    tickMode: "hub_vitals",
    presence: "hub",
    polarity: "buff",
    hpPerTick: 1,
    manaPerTick: 1,
  },
  fireplace_rest: {
    id: "fireplace_rest",
    name: "Отдых у камина",
    description:
      "Отдых у камина в таверне помогает быстрее восстановить здоровье и ману. +3 здоровья и маны/сек.",
    iconUrl: vitalityElixirIconUrl,
    defaultRemaining: null,
    tickMode: "hub_vitals",
    presence: "hub",
    polarity: "buff",
    hpPerTick: 3,
    manaPerTick: 3,
  },
  trauma_bruise: {
    id: "trauma_bruise",
    name: "Ушиб",
    description: "Урон снижен на 20%. Можно вылечить у лекаря.",
    iconUrl: severArteryIconUrl,
    defaultRemaining: TRAUMA_DURATION,
    tickMode: "none",
    presence: "meta",
    polarity: "debuff",
    combat: { damageDealtMult: 0.8 },
  },
  trauma_wound: {
    id: "trauma_wound",
    name: "Рана",
    description: "Урон снижен на 35%. Можно вылечить у лекаря.",
    iconUrl: severArteryIconUrl,
    defaultRemaining: TRAUMA_DURATION,
    tickMode: "none",
    presence: "meta",
    polarity: "debuff",
    combat: { damageDealtMult: 0.65 },
  },
  trauma_fracture: {
    id: "trauma_fracture",
    name: "Перелом",
    description: "Урон снижен на 50%. Можно вылечить у лекаря.",
    iconUrl: severArteryIconUrl,
    defaultRemaining: TRAUMA_DURATION,
    tickMode: "none",
    presence: "meta",
    polarity: "debuff",
    combat: { damageDealtMult: 0.5 },
  },
  blessing_might: {
    id: "blessing_might",
    name: "Благословение силы",
    description: "Урон повышен на 15%.",
    iconUrl: titanMightIconUrl,
    defaultRemaining: 15 * 60,
    tickMode: "none",
    presence: "meta",
    polarity: "buff",
    combat: { damageDealtMult: 1.15 },
  },
  stone_skin: {
    id: "stone_skin",
    name: "Каменная кожа",
    description: "Входящий урон снижен на 15%.",
    iconUrl: beastHideIconUrl,
    defaultRemaining: 20 * 60,
    tickMode: "none",
    presence: "meta",
    polarity: "buff",
    combat: { damageTakenMult: 0.85 },
  },
  vital_surge: {
    id: "vital_surge",
    name: "Живительный эликсир",
    description: "Максимальное здоровье повышено на 20%.",
    iconUrl: vitalityElixirIconUrl,
    defaultRemaining: 20 * 60,
    tickMode: "none",
    presence: "meta",
    polarity: "buff",
    combat: { maxHpMult: 1.2 },
  },
  spirit_clarity: {
    id: "spirit_clarity",
    name: "Ясность духа",
    description: "Максимальная мана повышена на 25%.",
    iconUrl: etherBreachIconUrl,
    defaultRemaining: 15 * 60,
    tickMode: "none",
    presence: "meta",
    polarity: "buff",
    combat: { maxManaMult: 1.25 },
  },
  swift_hands: {
    id: "swift_hands",
    name: "Быстрые руки",
    description: "Скорость атаки повышена на 15%.",
    iconUrl: windSpeedIconUrl,
    defaultRemaining: 10 * 60,
    tickMode: "none",
    presence: "meta",
    polarity: "buff",
    combat: { attackSpeedBonus: 0.15 },
  },
};

export function isGlobalEffectId(id: string): id is GlobalEffectId {
  return Object.prototype.hasOwnProperty.call(GLOBAL_EFFECT_DEFS, id);
}

export function globalEffectDef(id: GlobalEffectId): GlobalEffectDef {
  return GLOBAL_EFFECT_DEFS[id];
}

export function makeGlobalEffect(id: GlobalEffectId, remaining?: number | null): GlobalEffect {
  const def = GLOBAL_EFFECT_DEFS[id];
  return {
    id,
    remaining: remaining === undefined ? def.defaultRemaining : remaining,
  };
}

export function emptyCombatMods(): GlobalEffectCombatMods {
  return {
    damageDealtMult: 1,
    damageTakenMult: 1,
    maxHpMult: 1,
    maxManaMult: 1,
    attackSpeedBonus: 0,
  };
}

/** Суммарные боевые модификаторы от активных глобальных эффектов. */
export function combatModsFromGlobalEffects(
  list: GlobalEffect[] | undefined | null,
): GlobalEffectCombatMods {
  const out = emptyCombatMods();
  if (!Array.isArray(list)) return out;
  for (const effect of list) {
    if (!isGlobalEffectId(effect.id)) continue;
    const combat = GLOBAL_EFFECT_DEFS[effect.id].combat;
    if (!combat) continue;
    if (combat.damageDealtMult != null) out.damageDealtMult *= combat.damageDealtMult;
    if (combat.damageTakenMult != null) out.damageTakenMult *= combat.damageTakenMult;
    if (combat.maxHpMult != null) out.maxHpMult *= combat.maxHpMult;
    if (combat.maxManaMult != null) out.maxManaMult *= combat.maxManaMult;
    if (combat.attackSpeedBonus != null) out.attackSpeedBonus += combat.attackSpeedBonus;
  }
  return out;
}

/**
 * Синхронизировать список с местом героя.
 * В городе - дописать hub-эффекты; на карте / в бою - снять их.
 * `rest_recovery` и `fireplace_rest` взаимоисключающие: камин не авто-добавляется.
 */
export function syncGlobalEffectsPresence(
  list: GlobalEffect[] | undefined | null,
  opts: { inHub: boolean },
): GlobalEffect[] {
  let out = sanitizeGlobalEffects(list);
  if (!opts.inHub) {
    return out.filter((e) => GLOBAL_EFFECT_DEFS[e.id]?.presence !== "hub");
  }

  const hasFireplace = out.some((e) => e.id === "fireplace_rest");
  if (hasFireplace) {
    out = out.filter((e) => e.id !== "rest_recovery");
  } else {
    out = out.filter((e) => e.id !== "fireplace_rest");
    if (!out.some((e) => e.id === "rest_recovery")) {
      out.push(makeGlobalEffect("rest_recovery"));
    }
  }

  for (const id of Object.keys(GLOBAL_EFFECT_DEFS) as GlobalEffectId[]) {
    if (GLOBAL_EFFECT_DEFS[id].presence !== "hub") continue;
    if (id === "rest_recovery" || id === "fireplace_rest") continue;
    if (!out.some((e) => e.id === id)) out.push(makeGlobalEffect(id));
  }
  return out;
}

/** Отбросить неизвестные id из старых сейвов. */
export function sanitizeGlobalEffects(list: GlobalEffect[] | undefined | null): GlobalEffect[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && isGlobalEffectId(e.id))
    .map((e) => ({
      id: e.id,
      remaining:
        e.remaining == null || !Number.isFinite(e.remaining) ? null : Math.max(0, e.remaining),
    }))
    .filter((e) => e.remaining == null || e.remaining > 0);
}

/** Гарантировать постоянные hub-эффекты (новый герой / вход в город). */
export function ensureDefaultGlobalEffects(list: GlobalEffect[] | undefined | null): GlobalEffect[] {
  return syncGlobalEffectsPresence(list, { inHub: true });
}

export function cloneGlobalEffects(list: GlobalEffect[] | undefined | null): GlobalEffect[] {
  return sanitizeGlobalEffects(list).map((e) => ({ ...e }));
}

/** Тик таймеров глобальных эффектов (секунды). Возвращает обновлённый список. */
export function tickGlobalEffectTimers(list: GlobalEffect[], dt: number): GlobalEffect[] {
  if (dt <= 0) return list;
  return list
    .map((e) => {
      if (e.remaining == null) return e;
      return { ...e, remaining: e.remaining - dt };
    })
    .filter((e) => e.remaining == null || e.remaining > 0);
}

export function formatGlobalEffectTimer(remaining: number | null): string | null {
  if (remaining == null) return null;
  const sec = Math.max(0, Math.ceil(remaining));
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return String(sec);
}
