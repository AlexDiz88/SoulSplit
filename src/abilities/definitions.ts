import type { AbilityDef, AbilityId, School } from "../types";

export const SCHOOL_LABEL: Record<School, string> = {
  ice: "Лёд",
  fire: "Огонь",
  iron: "Железо",
  stealth: "Скрытность",
  light: "Свет",
};

export const SCHOOL_COLOR: Record<School, number> = {
  ice: 0x7ec8e8,
  fire: 0xff7a3d,
  iron: 0xc9b896,
  stealth: 0x9b7bb8,
  light: 0xf0e2b0,
};

/** id карточки гримуара (design/abilities) → AbilityId боя. */
export const ABILITY_BY_GRIMOIRE_ID: Record<string, AbilityId> = {
  "ice-arrow": "ice_arrow",
  "ice-shield": "ice_shield",
  fireball: "fireball",
  "flame-cone": "flame_cone",
  "hammer-throw": "stun_strike",
  "battle-cry": "battle_cry",
  "sever-artery": "sever_artery",
  "shadow-strike": "shadow_strike",
};

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  ice_arrow: {
    id: "ice_arrow",
    name: "Ледяная стрела",
    school: "ice",
    glyph: "❄",
    cooldown: 4.5,
    damage: 38,
    targetMode: "cell",
    range: "ranged",
    reach: 4,
    effects: { slowDuration: 3, slowPotency: 0.35 },
  },
  ice_shield: {
    id: "ice_shield",
    name: "Ледяной щит",
    school: "ice",
    glyph: "🛡",
    cooldown: 7,
    damage: 0,
    targetMode: "ally",
    range: "any",
    reach: 0,
    effects: { shieldAmount: 55, shieldDuration: 6 },
  },
  fireball: {
    id: "fireball",
    name: "Огненный шар",
    school: "fire",
    glyph: "🔥",
    cooldown: 5.5,
    damage: 42,
    targetMode: "cell",
    range: "ranged",
    reach: 3,
    effects: { burnPerSec: 8, burnDuration: 4 },
  },
  flame_cone: {
    id: "flame_cone",
    name: "Дыхание дракона",
    school: "fire",
    glyph: "🌋",
    cooldown: 6.5,
    damage: 40,
    targetMode: "zone",
    range: "any",
    reach: 1,
    effects: { zoneSecondaryRatio: 0.55 },
  },
  stun_strike: {
    id: "stun_strike",
    name: "Бросок молота",
    school: "light",
    glyph: "⚔",
    cooldown: 5,
    damage: 45,
    targetMode: "cell",
    range: "melee",
    reach: 1,
    effects: { stunDuration: 2.2 },
  },
  battle_cry: {
    id: "battle_cry",
    name: "Боевой клич",
    school: "iron",
    glyph: "📢",
    cooldown: 8,
    damage: 0,
    targetMode: "ally_aura",
    range: "any",
    reach: 0,
    effects: { atkBuffDuration: 5, atkBuffPotency: 0.35 },
  },
  sever_artery: {
    id: "sever_artery",
    name: "Вскрыть артерию",
    school: "stealth",
    glyph: "🗡",
    cooldown: 4,
    damage: 18,
    targetMode: "enemy",
    range: "melee",
    reach: 1,
    effects: { bleedPerSec: 12, bleedDuration: 5 },
  },
  shadow_strike: {
    id: "shadow_strike",
    name: "Теневой удар",
    school: "stealth",
    glyph: "👤",
    cooldown: 7.5,
    damage: 55,
    targetMode: "enemy",
    range: "any",
    reach: 2,
    effects: { invulnerableDuringCast: true },
  },
};

export const ALL_ABILITY_IDS: AbilityId[] = [
  "ice_arrow",
  "ice_shield",
  "fireball",
  "flame_cone",
  "stun_strike",
  "battle_cry",
  "sever_artery",
  "shadow_strike",
];

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function fmtMult(potency: number): string {
  return (1 + potency).toFixed(2).replace(/\.?0+$/, "");
}

function fmtPct(potency: number): string {
  return String(Math.round(potency * 100));
}

export function zoneSecondaryDamage(def: AbilityDef): number {
  const ratio = def.effects?.zoneSecondaryRatio ?? 0.55;
  return Math.round(def.damage * ratio);
}

/** Описание в духе классических RPG. Числа только из параметров способности. */
export function describeAbility(def: AbilityDef): string {
  const e = def.effects ?? {};
  switch (def.id) {
    case "ice_arrow":
      return `Выпускает ледяную стрелу, наносящую ${def.damage} ед. урона льдом. Сковывает цель холодом, увеличивая интервал ее автоатаки в ${fmtMult(e.slowPotency ?? 0)} раза на ${fmtNum(e.slowDuration ?? 0)} сек.`;
    case "ice_shield":
      return `Окутывает вас ледяным щитом, поглощающим ${fmtNum(e.shieldAmount ?? 0)} ед. урона. Действует ${fmtNum(e.shieldDuration ?? 0)} сек. или пока щит не будет разрушен.`;
    case "fireball":
      return `Наносит ${def.damage} ед. урона огнем и воспламеняет цель, нанося ${fmtNum(e.burnPerSec ?? 0)} ед. урона огнем в секунду в течение ${fmtNum(e.burnDuration ?? 0)} сек.`;
    case "flame_cone":
      return `Выдыхает столб пламени в выбранную клетку, нанося ${def.damage} ед. урона огнем. Клетки выше по зоне получают ${zoneSecondaryDamage(def)} ед. урона огнем.`;
    case "stun_strike":
      return `Швыряет молот во врага, нанося ${def.damage} ед. урона светом и оглушая цель на ${fmtNum(e.stunDuration ?? 0)} сек.`;
    case "battle_cry":
      return `Издает боевой клич, увеличивая ваш урон от атак на ${fmtPct(e.atkBuffPotency ?? 0)}% на ${fmtNum(e.atkBuffDuration ?? 0)} сек.`;
    case "sever_artery":
      return `Вскрывает артерию цели, нанося ${def.damage} ед. физического урона и вызывая кровотечение: ${fmtNum(e.bleedPerSec ?? 0)} ед. физического урона в секунду в течение ${fmtNum(e.bleedDuration ?? 0)} сек.`;
    case "shadow_strike":
      return `Наносит удар из тени, причиняя ${def.damage} ед. физического урона. Пока длится удар, вы неуязвимы.`;
  }
}

/** Строки блока "Числа" для гримуара, из тех же параметров. */
export function abilityNumberLines(def: AbilityDef): string[] {
  const e = def.effects ?? {};
  const lines: string[] = [];
  switch (def.id) {
    case "ice_arrow":
      lines.push(`${def.damage} урона льда`);
      lines.push(`интервал автоатаки ×${fmtMult(e.slowPotency ?? 0)} на ${fmtNum(e.slowDuration ?? 0)} с`);
      break;
    case "ice_shield":
      lines.push(`поглощение ${fmtNum(e.shieldAmount ?? 0)}`);
      lines.push(`держится до ${fmtNum(e.shieldDuration ?? 0)} с или пока запас не сбит`);
      break;
    case "fireball":
      lines.push(`${def.damage} урона огня`);
      lines.push(
        `горение ${fmtNum(e.burnPerSec ?? 0)} урона в секунду, ${fmtNum(e.burnDuration ?? 0)} с (итого ${fmtNum((e.burnPerSec ?? 0) * (e.burnDuration ?? 0))})`,
      );
      break;
    case "flame_cone":
      lines.push(`клик: ${def.damage} урона огня`);
      lines.push(`каждая клетка ряда выше (до трех): ${zoneSecondaryDamage(def)} урона огня`);
      break;
    case "stun_strike":
      lines.push(`${def.damage} урона света`);
      lines.push(`стан ${fmtNum(e.stunDuration ?? 0)} с`);
      break;
    case "battle_cry":
      lines.push(`урон атаки ×${fmtMult(e.atkBuffPotency ?? 0)} на ${fmtNum(e.atkBuffDuration ?? 0)} с`);
      break;
    case "sever_artery":
      lines.push(`${def.damage} физического урона`);
      lines.push(
        `кровотечение ${fmtNum(e.bleedPerSec ?? 0)} урона в секунду, ${fmtNum(e.bleedDuration ?? 0)} с (итого ${fmtNum((e.bleedPerSec ?? 0) * (e.bleedDuration ?? 0))})`,
      );
      break;
    case "shadow_strike":
      lines.push(`${def.damage} физического урона`);
      lines.push("неуязвимость на время удара");
      break;
  }
  return lines;
}

export function abilityDefForGrimoireId(cardId: string): AbilityDef | undefined {
  const id = ABILITY_BY_GRIMOIRE_ID[cardId];
  return id ? ABILITIES[id] : undefined;
}
