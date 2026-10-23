import type { Aspect } from "../types";

/** Глобальные статы героя (не свойства оружия). */
export type FlatStatId =
  | "maxHp"
  | "hpRegen"
  | "maxMana"
  | "manaRegen"
  | "weaponAttackBonus";

export type PercentStatId =
  | "manaCostReduction"
  | "attackSpeed"
  | "castSpeed"
  | "cooldownReduction"
  | "abilityDamage"
  | "critChance"
  | "critDamage"
  | "physDamageReduction"
  | "magicResist"
  | "evasion"
  | "blockChance"
  | "parryChance";

export type StatId = FlatStatId | PercentStatId | `aspectDamage:${Aspect}`;

export type AffixFamily = "offense" | "defense" | "resource" | "tempo" | "aspect";

export const CHANCE_CAP = 75;
export const OFFENSE_AMP_CAP = 100;
export const CRIT_DAMAGE_BASE = 150;
export const CRIT_DAMAGE_CAP = 250;

/** Капы после суммирования (до применения в формулах). */
export const STAT_CAPS: Partial<Record<StatId, number>> = {
  manaCostReduction: CHANCE_CAP,
  attackSpeed: CHANCE_CAP,
  castSpeed: CHANCE_CAP,
  cooldownReduction: CHANCE_CAP,
  abilityDamage: OFFENSE_AMP_CAP,
  critChance: CHANCE_CAP,
  critDamage: CRIT_DAMAGE_CAP,
  physDamageReduction: CHANCE_CAP,
  magicResist: CHANCE_CAP,
  evasion: CHANCE_CAP,
  blockChance: CHANCE_CAP,
  parryChance: CHANCE_CAP,
};

export const STAT_LABEL: Record<PercentStatId | FlatStatId, string> = {
  maxHp: "Здоровье",
  hpRegen: "Реген здоровья",
  maxMana: "Мана",
  manaRegen: "Реген маны",
  weaponAttackBonus: "Бонус атаки оружия",
  manaCostReduction: "Снижение стоимости маны",
  attackSpeed: "Скорость атаки",
  castSpeed: "Скорость каста",
  cooldownReduction: "Скорость перезарядки",
  abilityDamage: "Урон способностей",
  critChance: "Шанс крита",
  critDamage: "Урон крита",
  physDamageReduction: "Снижение физ. урона",
  magicResist: "Сопротивление магии",
  evasion: "Уклонение",
  blockChance: "Шанс блока",
  parryChance: "Шанс парирования",
};

export const FAMILY_LABEL: Record<AffixFamily, string> = {
  offense: "Нападение",
  defense: "Защита",
  resource: "Ресурсы",
  tempo: "Темп",
  aspect: "Аспект",
};

export const STAT_DESC: Record<PercentStatId | FlatStatId, string> = {
  maxHp: "Максимум здоровья героя. Плоское значение.",
  hpRegen: "Восстановление здоровья в секунду. Плоское, без %.",
  maxMana: "Максимум маны. Плоское значение.",
  manaRegen: "Восстановление маны в секунду. Плоское, без %.",
  weaponAttackBonus: "Глобальный бонус к урону автоатак. Не меняет базовый урон на тултипе оружия.",
  manaCostReduction: "Плоский % снижения стоимости способностей по мане. Кап 75%.",
  attackSpeed: "Плоский % к скорости автоатак. finalCd = weaponBaseCd * (1 - AS/100). Не влияет на каст. Кап 75%.",
  castSpeed: "Плоский % к скорости каста способностей. Не влияет на автоатаки. Кап 75%.",
  cooldownReduction: "Плоский % сокращения кулдаунов способностей. Кап 75%.",
  abilityDamage: "Плоский % ко всем пакетам урона способностей (клетки, DoT). Складывается с аспектным %. Кап суммы 100%.",
  critChance: "Плоский % шанса крита для автоатак и способностей. Кап 75%.",
  critDamage: "Итоговый множитель крита в %. База 150. Рост плоский. Кап 250%.",
  physDamageReduction: "Плоский % снижения физического урона вместо брони. Кап 75%.",
  magicResist: "Плоский % снижения магического урона (способности аспектов в v1). Кап 75%.",
  evasion: "Плоский % полного уклонения от удара. Кап 75%.",
  blockChance: "Плоский % блока. Аффикс есть, бой позже. Кап 75%.",
  parryChance: "Плоский % парирования. Аффикс есть, бой позже. Кап 75%.",
};

/** Core-статы без aspectDamage:* для справочника. */
export const CORE_STAT_IDS: Array<PercentStatId | FlatStatId> = [
  "maxHp",
  "hpRegen",
  "maxMana",
  "manaRegen",
  "manaCostReduction",
  "weaponAttackBonus",
  "attackSpeed",
  "castSpeed",
  "cooldownReduction",
  "abilityDamage",
  "critChance",
  "critDamage",
  "physDamageReduction",
  "magicResist",
  "evasion",
  "blockChance",
  "parryChance",
];

export function capLabelForStat(id: StatId): string {
  if (isAspectDamageStat(id)) return `${OFFENSE_AMP_CAP}% (в сумме с уроном способностей)`;
  if (id === "abilityDamage") return `${OFFENSE_AMP_CAP}% (в сумме с аспектом)`;
  if (id === "critDamage") return `${CRIT_DAMAGE_CAP}% (база ${CRIT_DAMAGE_BASE}%)`;
  const cap = STAT_CAPS[id];
  if (cap === undefined) return "-";
  return `${cap}%`;
}

export function typeLabelForStat(id: StatId): string {
  if (id === "hpRegen" || id === "manaRegen") return "flat / сек";
  if (isPercentStat(id)) return "плоский %";
  return "flat";
}

export function aspectDamageStat(aspect: Aspect): StatId {
  return `aspectDamage:${aspect}`;
}

export function isAspectDamageStat(id: StatId): id is `aspectDamage:${Aspect}` {
  return id.startsWith("aspectDamage:");
}

export function aspectFromStat(id: `aspectDamage:${Aspect}`): Aspect {
  return id.slice("aspectDamage:".length) as Aspect;
}

export function isPercentStat(id: StatId): boolean {
  if (isAspectDamageStat(id)) return true;
  return (
    id === "manaCostReduction" ||
    id === "attackSpeed" ||
    id === "castSpeed" ||
    id === "cooldownReduction" ||
    id === "abilityDamage" ||
    id === "critChance" ||
    id === "critDamage" ||
    id === "physDamageReduction" ||
    id === "magicResist" ||
    id === "evasion" ||
    id === "blockChance" ||
    id === "parryChance"
  );
}

export function formatStatValue(id: StatId, value: number): string {
  if (id === "hpRegen" || id === "manaRegen") return `${value}/сек`;
  if (isPercentStat(id)) return `${value}%`;
  return String(value);
}

/** Строка бонуса на предмете: "+5% уклонения", "+2 маны/сек". */
export function formatAffixBonus(id: StatId, value: number, label: string): string {
  const sign = value > 0 ? "+" : "";
  if (isPercentStat(id)) return `${sign}${value}% ${label}`;
  return `${sign}${value} ${label}`;
}
