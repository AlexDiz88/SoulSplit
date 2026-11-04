import type { StatId } from "../stats/statIds";

/** Максимальный уровень героя v2. */
export const MAX_HERO_LEVEL = 20;

/** XP до следующего уровня для L = 1..19 (индекс = уровень). */
const XP_TO_NEXT: readonly number[] = [
  0, // unused (level 0)
  800, 1400, 2200, 3200, 4500, 6500, 9000, 12500, 17000, 23000, 31000, 42000, 56000, 75000,
  100000, 135000, 180000, 240000, 320000,
];

/** Макс. |Δ| уровней герой↔враг / герой↔квест, при которой ещё есть XP. */
export const XP_LEVEL_DELTA_MAX = 3;

/** Доля полосы `questLevel`, выше которой награда квеста не поднимается. */
export const QUEST_XP_BAR_CAP = 0.1;

/** Элитный множитель XP за убийство (после корреляции уровней). */
export const ELITE_KILL_XP_MULT = 1.5;

/** XP, нужный чтобы перейти с `level` на `level + 1`. */
export function xpToNextLevel(level: number): number {
  if (level < 1) return xpToNextLevel(1);
  if (level >= MAX_HERO_LEVEL) return 0;
  return XP_TO_NEXT[Math.floor(level)] ?? 0;
}

/** Целевое число equal-level убийств на один уровень. */
export function killsPerLevel(level: number): number {
  const L = Math.max(1, Math.min(MAX_HERO_LEVEL - 1, Math.floor(level)));
  return 28 + 9 * (L - 1);
}

/** Базовый XP за убийство врага уровня `enemyLevel` (до корреляции и элиты). */
export function baseKillXp(enemyLevel: number): number {
  const E = Math.max(1, Math.min(MAX_HERO_LEVEL, Math.floor(enemyLevel)));
  const need = xpToNextLevel(E);
  if (need <= 0) {
    // Враг кап-уровня: база как у перехода 19→20.
    return Math.floor(xpToNextLevel(MAX_HERO_LEVEL - 1) / killsPerLevel(MAX_HERO_LEVEL - 1));
  }
  return Math.floor(need / killsPerLevel(E));
}

/**
 * Множитель XP по разнице уровней: Δ = enemyLevel - heroLevel.
 * |Δ| > 3 → 0.
 */
export function killXpMult(heroLevel: number, enemyLevel: number): number {
  const delta = Math.floor(enemyLevel) - Math.floor(heroLevel);
  if (Math.abs(delta) > XP_LEVEL_DELTA_MAX) return 0;
  switch (delta) {
    case -3:
      return 0.25;
    case -2:
      return 0.5;
    case -1:
      return 0.8;
    case 0:
      return 1;
    case 1:
      return 1.1;
    case 2:
      return 1.25;
    case 3:
      return 1.4;
    default:
      return 0;
  }
}

export interface KillXpInput {
  enemyLevel: number;
  elite?: boolean;
}

/** XP за одно убийство с учётом уровня героя. */
export function xpForKill(heroLevel: number, kill: KillXpInput): number {
  const base = baseKillXp(kill.enemyLevel);
  const mult = killXpMult(heroLevel, kill.enemyLevel);
  if (base <= 0 || mult <= 0) return 0;
  const eliteMult = kill.elite ? ELITE_KILL_XP_MULT : 1;
  return Math.floor(base * mult * eliteMult);
}

/** Сумма XP за список убийств (только победа вызывает снаружи). */
export function xpForKills(heroLevel: number, kills: readonly KillXpInput[]): number {
  let total = 0;
  for (const k of kills) total += xpForKill(heroLevel, k);
  return total;
}

/**
 * Множитель XP квеста при сдаче: Δ = questLevel - heroLevel.
 * +3…+1 бонус, 0 норма, −1…−3 штраф, |Δ| > 3 → 0.
 */
export function questLevelXpMult(heroLevel: number, questLevel: number): number {
  const delta = Math.floor(questLevel) - Math.floor(heroLevel);
  if (Math.abs(delta) > XP_LEVEL_DELTA_MAX) return 0;
  switch (delta) {
    case 3:
      return 1.3;
    case 2:
      return 1.2;
    case 1:
      return 1.1;
    case 0:
      return 1;
    case -1:
      return 0.9;
    case -2:
      return 0.75;
    case -3:
      return 0.5;
    default:
      return 0;
  }
}

/**
 * Итоговый XP за сдачу квеста: кламп ≤10% полосы questLevel, затем множитель уровней.
 */
export function questXpAward(heroLevel: number, questLevel: number, rewardXp: number): number {
  const bar = xpToNextLevel(Math.max(1, Math.min(MAX_HERO_LEVEL - 1, Math.floor(questLevel))));
  const capped = Math.min(Math.max(0, Math.floor(rewardXp)), Math.floor(bar * QUEST_XP_BAR_CAP));
  return Math.floor(capped * questLevelXpMult(heroLevel, questLevel));
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
