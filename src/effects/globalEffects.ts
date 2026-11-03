import rejuvenationIconUrl from "../../assets/art/skills/rejuvenation.png";

/** Глобальный эффект вне боя. В бой не переносится. Presence задаёт город vs карта. */
export interface GlobalEffect {
  id: GlobalEffectId;
  /** null = бесконечно. */
  remaining: number | null;
}

export type GlobalEffectId = "rest_recovery";

export type GlobalEffectTickMode = "hub_vitals" | "none";

/** Где эффект висит в списке / HUD: только город или город+карта. */
export type GlobalEffectPresence = "hub" | "meta";

export interface GlobalEffectDef {
  id: GlobalEffectId;
  name: string;
  description: string;
  iconUrl: string;
  /** null = бесконечно при ensure. */
  defaultRemaining: number | null;
  tickMode: GlobalEffectTickMode;
  /** hub - только в городе; meta - город и карта. */
  presence: GlobalEffectPresence;
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
    presence: "hub",
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

/**
 * Синхронизировать список с местом героя.
 * В городе - дописать hub-эффекты; на карте - снять их (иконка и тик только в городе).
 */
export function syncGlobalEffectsPresence(
  list: GlobalEffect[] | undefined | null,
  opts: { inHub: boolean },
): GlobalEffect[] {
  let out = Array.isArray(list) ? list.map((e) => ({ ...e })) : [];
  if (!opts.inHub) {
    return out.filter((e) => GLOBAL_EFFECT_DEFS[e.id]?.presence !== "hub");
  }
  for (const id of Object.keys(GLOBAL_EFFECT_DEFS) as GlobalEffectId[]) {
    if (GLOBAL_EFFECT_DEFS[id].presence !== "hub") continue;
    if (!out.some((e) => e.id === id)) out.push(makeGlobalEffect(id));
  }
  return out;
}

/** Гарантировать постоянные hub-эффекты (новый герой / вход в город). */
export function ensureDefaultGlobalEffects(list: GlobalEffect[] | undefined | null): GlobalEffect[] {
  return syncGlobalEffectsPresence(list, { inHub: true });
}

export function cloneGlobalEffects(list: GlobalEffect[] | undefined | null): GlobalEffect[] {
  return Array.isArray(list) ? list.map((e) => ({ ...e })) : [];
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
