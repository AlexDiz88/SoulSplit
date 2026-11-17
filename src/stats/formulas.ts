import type { Aspect } from "../types";
import { abilityAmpPercent, getStat, type HeroStatSheet } from "./sheet";
import { CHANCE_CAP, CRIT_DAMAGE_BASE } from "./statIds";

export type DamageChannel = "physical" | "magical";
export type AttackRange = "melee" | "ranged";

/** Теги входящего удара для avoidance / mitigation. */
export interface AttackPacket {
  channel: DamageChannel;
  range: AttackRange;
  /** DoT не роллит парирование / уклонение / блок. */
  isDot?: boolean;
  /** Ответка парирования: сама не порождает новое парирование. */
  isRiposte?: boolean;
}

export type AvoidanceOutcome = "parried" | "evaded" | "blocked" | "none";

/** Доля урона, срезаемая успешным блоком (до phys DR). */
/** Базовая точность автоатаки, если у оружия нет своего hitChance. */
export const DEFAULT_WEAPON_HIT_CHANCE = 100;

export const BLOCK_DAMAGE_MITIGATION = 0.5;
/** Доля среднего урона mainhand в ответке парирования. */
export const PARRY_RIPOSTE_FRACTION = 0.25;

export function clampChance(pct: number): number {
  return Math.max(0, Math.min(CHANCE_CAP, pct));
}

/** Интервал автоатаки от базы оружия и % скорости атаки. */
export function autoAttackInterval(weaponBaseCd: number, attackSpeedPct: number, statusMult = 1): number {
  const as = clampChance(attackSpeedPct);
  return weaponBaseCd * (1 - as / 100) * statusMult;
}

export function castDuration(baseCast: number, castSpeedPct: number): number {
  const cs = clampChance(castSpeedPct);
  return baseCast * (1 - cs / 100);
}

export function abilityCooldown(baseCd: number, cdrPct: number): number {
  const cdr = clampChance(cdrPct);
  return baseCd * (1 - cdr / 100);
}

export function manaCost(baseCost: number, reductionPct: number): number {
  const red = clampChance(reductionPct);
  return Math.max(0, Math.round(baseCost * (1 - red / 100)));
}

export function rollCrit(sheet: HeroStatSheet, rng: () => number = Math.random): boolean {
  return rng() * 100 < clampChance(getStat(sheet, "critChance"));
}

/**
 * Итоговая точность автоатаки: база оружия (или 100) минус штрафы ослепления.
 * `blindPotency` - доли снижения точности (0.35 = −35 п.п. к базе).
 */
export function autoAttackHitChancePct(baseHitChance: number, blindPotencySum: number): number {
  const base = clampChance(baseHitChance);
  const penalty = Math.max(0, blindPotencySum) * 100;
  return clampChance(base - penalty);
}

export function rollAttackHit(hitChancePct: number, rng: () => number = Math.random): boolean {
  return rng() * 100 < clampChance(hitChancePct);
}

export function critMultiplier(sheet: HeroStatSheet): number {
  const critDmg = getStat(sheet, "critDamage") || CRIT_DAMAGE_BASE;
  return critDmg / 100;
}

/** Урон автоатаки: база оружия + глобальный бонус атаки. */
export function autoAttackDamage(
  weaponRoll: number,
  sheet: HeroStatSheet,
  atkBuffMult: number,
  crit: boolean,
): number {
  let dmg = (weaponRoll + getStat(sheet, "weaponAttackBonus")) * atkBuffMult;
  if (crit) dmg *= critMultiplier(sheet);
  return Math.max(0, Math.round(dmg));
}

/** Пакет урона способности (основной / вторичный / DoT тик). */
export function abilityPacketDamage(
  basePacket: number,
  sheet: HeroStatSheet,
  aspect: Aspect,
  atkBuffMult: number,
  crit: boolean,
): number {
  const amp = abilityAmpPercent(sheet, aspect);
  let dmg = basePacket * (1 + amp / 100) * atkBuffMult;
  if (crit) dmg *= critMultiplier(sheet);
  return Math.max(0, Math.round(dmg));
}

export function rollEvasion(sheet: HeroStatSheet, rng: () => number = Math.random): boolean {
  return rng() * 100 < clampChance(getStat(sheet, "evasion"));
}

export function rollChanceStat(
  sheet: HeroStatSheet,
  statId: "evasion" | "blockChance" | "parryChance",
  rng: () => number = Math.random,
): boolean {
  return rng() * 100 < clampChance(getStat(sheet, statId));
}

export interface AvoidanceContext {
  sheet: HeroStatSheet | null;
  blockActive: boolean;
  parryActive: boolean;
  packet: AttackPacket;
  rng?: () => number;
}

/**
 * Порядок: парирование → уклонение → блок.
 * Магия и DoT - без avoidance. Ответка не может быть парирована снова.
 */
export function resolveAvoidance(ctx: AvoidanceContext): AvoidanceOutcome {
  const { sheet, packet } = ctx;
  if (!sheet || packet.isDot || packet.channel !== "physical") return "none";
  const rng = ctx.rng ?? Math.random;

  if (!packet.isRiposte && ctx.parryActive && packet.range === "melee") {
    if (rollChanceStat(sheet, "parryChance", rng)) return "parried";
  }
  if (rollChanceStat(sheet, "evasion", rng)) return "evaded";
  if (ctx.blockActive && rollChanceStat(sheet, "blockChance", rng)) return "blocked";
  return "none";
}

/** Снижение входящего урона после avoidance. */
export function mitigateIncoming(raw: number, sheet: HeroStatSheet | null, channel: DamageChannel): number {
  if (!sheet || raw <= 0) return raw;
  if (channel === "physical") {
    const dr = clampChance(getStat(sheet, "physDamageReduction"));
    return raw * (1 - dr / 100);
  }
  const res = clampChance(getStat(sheet, "magicResist"));
  return raw * (1 - res / 100);
}

export function rollWeaponDamage(min: number, max: number, rng: () => number = Math.random): number {
  if (max <= min) return min;
  return Math.floor(min + rng() * (max - min + 1));
}
