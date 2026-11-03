import { getStat } from "../stats/sheet";
import type { Unit } from "../combat/Unit";
import {
  GLOBAL_EFFECT_DEFS,
  tickGlobalEffectTimers,
  type GlobalEffect,
} from "./globalEffects";

export interface GlobalVitalsTickResult {
  effects: GlobalEffect[];
  changed: boolean;
}

/**
 * Тик глобальных эффектов вне боя.
 * `inHub` - только в городе применяются hub_vitals (+HP/+мана).
 * Таймеры длительности тикают и в городе, и на карте.
 */
export function tickGlobalEffectsOutsideCombat(
  effects: GlobalEffect[],
  unit: Unit | null,
  opts: { inHub: boolean; dt: number },
): GlobalVitalsTickResult {
  let next = tickGlobalEffectTimers(effects, opts.dt);
  let changed = next.length !== effects.length;

  if (!opts.inHub || !unit) {
    return { effects: next, changed };
  }

  for (const effect of next) {
    const def = GLOBAL_EFFECT_DEFS[effect.id];
    if (def.tickMode !== "hub_vitals") continue;
    const hpGain = def.hpPerTick ?? 0;
    const manaGain = def.manaPerTick ?? 0;
    if (hpGain > 0 && unit.hp < unit.stats.maxHp) {
      unit.hp = Math.min(unit.stats.maxHp, unit.hp + hpGain);
      changed = true;
    }
    if (manaGain > 0 && unit.sheet) {
      const maxMana = getStat(unit.sheet, "maxMana");
      if (unit.mana < maxMana) {
        unit.mana = Math.min(maxMana, unit.mana + manaGain);
        changed = true;
      }
    }
  }

  return { effects: next, changed };
}
