import rejuvenationIconUrl from "../../assets/art/skills/rejuvenation.png";

/** Глобальный эффект вне боя (город / карта). В бой не переносится. */
export interface GlobalEffect {
  id: GlobalEffectId;
  /** null = бесконечно. */
  remaining: number | null;
}

export type GlobalEffectId = "rest_recovery";

export type GlobalEffectTickMode = "hub_vitals" | "none";

export interface GlobalEffectDef {
  id: GlobalEffectId;
  name: string;
  description: string;
  iconUrl: string;
  /** null = бесконечно при ensure. */
  defaultRemaining: number | null;
  tickMode: GlobalEffectTickMode;
  /** Для hub_vitals: HP и мана за тик. */
  hpPerTick?: number;
  manaPerTick?: number;
}

export const GLOBAL_EFFECT_DEFS: Record<GlobalEffectId, GlobalEffectDef> = {
  rest_recovery: {
    id: "rest_recovery",
    name: "Восстановление сил",
    description: "В городе восстанавливает 1 здоровья и 1 маны каждую секунду.",
    iconUrl: rejuvenationIconUrl,
    defaultRemaining: null,
    tickMode: "hub_vitals",
    hpPerTick: 1,
    manaPerTick: 1,
  },
};

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

/** Гарантировать постоянные глобальные эффекты (сейв / новый герой). */
export function ensureDefaultGlobalEffects(list: GlobalEffect[] | undefined | null): GlobalEffect[] {
  const out = Array.isArray(list) ? list.map((e) => ({ ...e })) : [];
  if (!out.some((e) => e.id === "rest_recovery")) {
    out.push(makeGlobalEffect("rest_recovery"));
  }
  return out;
}

export function cloneGlobalEffects(list: GlobalEffect[] | undefined | null): GlobalEffect[] {
  return ensureDefaultGlobalEffects(list);
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
