import { ALL_ASPECTS } from "../abilities/aspects";
import type { Aspect } from "../types";
import {
  CRIT_DAMAGE_BASE,
  OFFENSE_AMP_CAP,
  STAT_CAPS,
  isAspectDamageStat,
  aspectDamageStat,
  type StatId,
} from "./statIds";

/** Суммарный лист глобальных статов после базы + геора + баффов. */
export type HeroStatSheet = Record<StatId, number>;

const FLAT_ZERO: StatId[] = [
  "maxHp",
  "hpRegen",
  "maxMana",
  "manaRegen",
  "weaponAttackBonus",
  "manaCostReduction",
  "attackSpeed",
  "castSpeed",
  "cooldownReduction",
  "abilityDamage",
  "critChance",
  "physDamageReduction",
  "magicResist",
  "evasion",
  "blockChance",
  "parryChance",
];

/** База героя без экипировки (ур. 1, без level-up бонусов). */
export function createBaseHeroSheet(overrides?: Partial<HeroStatSheet>): HeroStatSheet {
  const sheet = emptySheet();
  sheet.maxHp = 300;
  sheet.maxMana = 100;
  sheet.manaRegen = 4;
  sheet.hpRegen = 0;
  sheet.critChance = 5;
  sheet.critDamage = CRIT_DAMAGE_BASE;
  if (overrides) addToSheet(sheet, overrides);
  return applyStatCaps(sheet);
}

export function emptySheet(): HeroStatSheet {
  const sheet = {} as HeroStatSheet;
  for (const id of FLAT_ZERO) sheet[id] = 0;
  sheet.critDamage = 0;
  for (const aspect of ALL_ASPECTS) {
    sheet[aspectDamageStat(aspect)] = 0;
  }
  return sheet;
}


export function addToSheet(target: HeroStatSheet, delta: Partial<Record<StatId, number>>): void {
  for (const [key, value] of Object.entries(delta)) {
    if (value === undefined) continue;
    const id = key as StatId;
    target[id] = (target[id] ?? 0) + value;
  }
}

export function mergeSheets(...parts: Partial<Record<StatId, number>>[]): HeroStatSheet {
  const out = emptySheet();
  for (const part of parts) addToSheet(out, part);
  return applyStatCaps(out);
}

export function applyStatCaps(sheet: HeroStatSheet): HeroStatSheet {
  for (const [key, cap] of Object.entries(STAT_CAPS)) {
    if (cap === undefined) continue;
    const id = key as StatId;
    if (sheet[id] > cap) sheet[id] = cap;
  }
  for (const aspect of ALL_ASPECTS) {
    const id = aspectDamageStat(aspect);
    if (sheet[id] > OFFENSE_AMP_CAP) sheet[id] = OFFENSE_AMP_CAP;
  }
  return sheet;
}

export function getStat(sheet: HeroStatSheet, id: StatId): number {
  return sheet[id] ?? 0;
}

export function aspectDamageOf(sheet: HeroStatSheet, aspect: Aspect): number {
  return getStat(sheet, aspectDamageStat(aspect));
}

/** Сумма amp к пакету способности с капом 100%. */
export function abilityAmpPercent(sheet: HeroStatSheet, aspect: Aspect): number {
  const raw = getStat(sheet, "abilityDamage") + aspectDamageOf(sheet, aspect);
  return Math.min(raw, OFFENSE_AMP_CAP);
}

export function sheetStatEntries(sheet: HeroStatSheet): [StatId, number][] {
  return (Object.entries(sheet) as [StatId, number][]).filter(([id, v]) => {
    if (v === 0) return false;
    if (isAspectDamageStat(id)) return v !== 0;
    return true;
  });
}
