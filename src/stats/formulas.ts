import type { School } from "../types";
import { abilityAmpPercent, getStat, type HeroStatSheet } from "./sheet";
import { CHANCE_CAP, CRIT_DAMAGE_BASE } from "./statIds";

export type DamageChannel = "physical" | "magical";

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
  school: School,
  atkBuffMult: number,
  crit: boolean,
): number {
  const amp = abilityAmpPercent(sheet, school);
  let dmg = basePacket * (1 + amp / 100) * atkBuffMult;
  if (crit) dmg *= critMultiplier(sheet);
  return Math.max(0, Math.round(dmg));
}

export function rollEvasion(sheet: HeroStatSheet, rng: () => number = Math.random): boolean {
  return rng() * 100 < clampChance(getStat(sheet, "evasion"));
}

/** Снижение входящего урона после уклонения. */
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
