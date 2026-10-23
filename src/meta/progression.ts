import type { StatId } from "../stats/statIds";

/** Максимальный уровень героя v1. */
export const MAX_HERO_LEVEL = 30;

/** XP, нужный чтобы перейти с `level` на `level + 1`. */
export function xpToNextLevel(level: number): number {
  if (level < 1) return xpToNextLevel(1);
  if (level >= MAX_HERO_LEVEL) return 0;
  return 400 + 250 * (level - 1);
}

/** Суммарный XP от 1 уровня до начала `level` (не включая прогресс текущего). */
export function totalXpForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_HERO_LEVEL, Math.floor(level)));
  let total = 0;
  for (let L = 1; L < clamped; L++) total += xpToNextLevel(L);
  return total;
}

export interface LevelBonuses {
  maxHp: number;
  maxMana: number;
  manaRegen: number;
}

/** Бонусы за уровни выше 1 (уровень 1 = нули). */
export function levelBonusesForLevel(level: number): LevelBonuses {
  const gains = Math.max(0, Math.min(MAX_HERO_LEVEL, Math.floor(level)) - 1);
  let manaRegen = 0;
  for (let L = 2; L <= gains + 1; L++) {
    if (L % 5 === 0) manaRegen += 0.5;
  }
  return {
    maxHp: gains * 35,
    maxMana: gains * 5,
    manaRegen,
  };
}

export function levelBonusesAsStatDelta(level: number): Partial<Record<StatId, number>> {
  const b = levelBonusesForLevel(level);
  const delta: Partial<Record<StatId, number>> = {};
  if (b.maxHp) delta.maxHp = b.maxHp;
  if (b.maxMana) delta.maxMana = b.maxMana;
  if (b.manaRegen) delta.manaRegen = b.manaRegen;
  return delta;
}

export interface AddXpResult {
  leveled: boolean;
  levelsGained: number;
  /** XP, который не влез из-за капа уровня. */
  overflowXp: number;
}

/**
 * Добавляет XP в профиль (мутирует level/xp/levelBonuses снаружи через callback).
 * Возвращает сколько уровней получено.
 */
export function applyXpGain(
  level: number,
  xp: number,
  amount: number,
): { level: number; xp: number } & AddXpResult {
  let curLevel = Math.max(1, Math.min(MAX_HERO_LEVEL, level));
  let curXp = Math.max(0, xp);
  let remaining = Math.max(0, Math.floor(amount));
  let levelsGained = 0;

  while (remaining > 0 && curLevel < MAX_HERO_LEVEL) {
    const need = xpToNextLevel(curLevel);
    const space = need - curXp;
    if (remaining < space) {
      curXp += remaining;
      remaining = 0;
      break;
    }
    remaining -= space;
    curLevel += 1;
    curXp = 0;
    levelsGained += 1;
  }

  const overflowXp = curLevel >= MAX_HERO_LEVEL ? remaining : 0;
  if (curLevel >= MAX_HERO_LEVEL) {
    curLevel = MAX_HERO_LEVEL;
    curXp = 0;
  }

  return {
    level: curLevel,
    xp: curXp,
    leveled: levelsGained > 0,
    levelsGained,
    overflowXp,
  };
}
