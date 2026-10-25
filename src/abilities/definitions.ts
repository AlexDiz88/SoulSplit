import type { AbilityDef, AbilityId } from "../types";
export { ALL_ASPECTS, ASPECT_COLOR, ASPECT_HEX, ASPECT_LABEL } from "./aspects";

/** id карточки гримуара (design/abilities) → AbilityId боя. */
export const ABILITY_BY_GRIMOIRE_ID: Record<string, AbilityId> = {
  "ice-arrow": "ice_arrow",
  "ice-shield": "ice_shield",
  fireball: "fireball",
  "flame-cone": "flame_cone",
  "hammer-throw": "hammer_throw",
  "titan-might": "titan_might",
  "demoralizing-shout": "demoralizing_shout",
  "sever-artery": "sever_artery",
  "shadow-strike": "shadow_strike",
  "wind-gust": "wind_gust",
  "wind-speed": "wind_speed",
  squall: "squall",
  "dust-veil": "dust_veil",
  "air-pocket": "air_pocket",
  tornado: "tornado",
  "dark-arrow": "dark_arrow",
  rejuvenation: "rejuvenation",
  "root-grasp": "root_grasp",
  "poison-bush": "poison_bush",
};

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  ice_arrow: {
    id: "ice_arrow",
    name: "Ледяная стрела",
    aspect: "ice",
    glyph: "❄",
    cooldown: 4.5,
    damage: 38,
    manaCost: 12,
    targetMode: "cell",
    range: "ranged",
    reach: 4,
    effects: { slowDuration: 3, slowPotency: 0.35 },
  },
  ice_shield: {
    id: "ice_shield",
    name: "Ледяной щит",
    aspect: "ice",
    glyph: "🛡",
    cooldown: 7,
    damage: 0,
    manaCost: 18,
    targetMode: "ally",
    range: "any",
    reach: 0,
    effects: { shieldAmount: 55, shieldDuration: 6 },
  },
  fireball: {
    id: "fireball",
    name: "Огненный шар",
    aspect: "fire",
    glyph: "🔥",
    cooldown: 5.5,
    damage: 42,
    manaCost: 14,
    targetMode: "cell",
    range: "ranged",
    reach: 3,
    effects: { burnPerSec: 8, burnDuration: 4 },
  },
  flame_cone: {
    id: "flame_cone",
    name: "Дыхание дракона",
    aspect: "fire",
    glyph: "🌋",
    cooldown: 6.5,
    damage: 40,
    manaCost: 16,
    targetMode: "zone",
    range: "any",
    reach: 1,
    effects: { zoneSecondaryRatio: 0.55 },
  },
  hammer_throw: {
    id: "hammer_throw",
    name: "Бросок молота",
    aspect: "light",
    glyph: "⚔",
    cooldown: 5,
    damage: 45,
    manaCost: 12,
    targetMode: "cell",
    range: "melee",
    reach: 1,
    effects: { stunDuration: 2.2 },
  },
  titan_might: {
    id: "titan_might",
    name: "Мощь титана",
    aspect: "might",
    glyph: "📢",
    cooldown: 8,
    damage: 0,
    manaCost: 20,
    targetMode: "ally_aura",
    range: "any",
    reach: 0,
    effects: { atkBuffDuration: 5, atkBuffPotency: 0.35 },
  },
  demoralizing_shout: {
    id: "demoralizing_shout",
    name: "Деморализующий крик",
    aspect: "might",
    glyph: "📣",
    cooldown: 7.5,
    damage: 0,
    manaCost: 32,
    targetMode: "all_enemies",
    range: "any",
    reach: 0,
    effects: { atkDebuffDuration: 5, atkDebuffMult: 0.7 },
  },
  sever_artery: {
    id: "sever_artery",
    name: "Вскрыть артерию",
    aspect: "stealth",
    glyph: "🗡",
    cooldown: 4,
    damage: 18,
    manaCost: 10,
    targetMode: "enemy",
    range: "melee",
    reach: 1,
    effects: { bleedPerSec: 12, bleedDuration: 5 },
  },
  shadow_strike: {
    id: "shadow_strike",
    name: "Теневой удар",
    aspect: "stealth",
    glyph: "👤",
    cooldown: 7.5,
    damage: 55,
    manaCost: 18,
    targetMode: "enemy",
    range: "any",
    reach: 2,
    effects: { invulnerableDuringCast: true },
  },
  wind_gust: {
    id: "wind_gust",
    name: "Порыв ветра",
    aspect: "air",
    glyph: "🌬",
    cooldown: 6,
    damage: 44,
    manaCost: 14,
    targetMode: "enemy",
    range: "ranged",
    reach: 4,
    effects: {},
  },
  wind_speed: {
    id: "wind_speed",
    name: "Скорость ветра",
    aspect: "air",
    glyph: "🍃",
    cooldown: 7,
    damage: 0,
    manaCost: 16,
    targetMode: "ally",
    range: "any",
    reach: 0,
    effects: { hasteIntervalMult: 0.75, hasteDuration: 5 },
  },
  squall: {
    id: "squall",
    name: "Шквал",
    aspect: "air",
    glyph: "💨",
    cooldown: 7.5,
    damage: 34,
    manaCost: 18,
    targetMode: "zone",
    range: "any",
    reach: 4,
    effects: {},
  },
  dust_veil: {
    id: "dust_veil",
    name: "Пыльная пелена",
    aspect: "air",
    glyph: "🌫",
    cooldown: 8,
    damage: 0,
    manaCost: 34,
    targetMode: "all_enemies",
    range: "any",
    reach: 0,
    effects: { slowDuration: 4, slowPotency: 0.3 },
  },
  air_pocket: {
    id: "air_pocket",
    name: "Воздушный карман",
    aspect: "air",
    glyph: "🫧",
    cooldown: 9,
    damage: 0,
    manaCost: 38,
    targetMode: "zone",
    range: "any",
    reach: 4,
    effects: { slowDuration: 5, slowPotency: 0.35 },
  },
  tornado: {
    id: "tornado",
    name: "Смерч",
    aspect: "air",
    glyph: "🌪",
    cooldown: 11,
    damage: 10,
    manaCost: 28,
    targetMode: "zone",
    range: "any",
    reach: 4,
    effects: { tornadoDps: 10, tornadoStaySec: 3, tornadoStays: 3 },
  },
  dark_arrow: {
    id: "dark_arrow",
    name: "Стрела тьмы",
    aspect: "stealth",
    glyph: "🏹",
    cooldown: 8,
    damage: 44,
    manaCost: 0,
    targetMode: "enemy",
    range: "ranged",
    reach: 4,
    effects: { castTime: 2 },
  },
  rejuvenation: {
    id: "rejuvenation",
    name: "Омоложение",
    aspect: "nature",
    glyph: "🌿",
    cooldown: 8,
    damage: 0,
    manaCost: 32,
    targetMode: "self",
    range: "any",
    reach: 0,
    effects: { regenPerSec: 10, regenDuration: 5 },
  },
  root_grasp: {
    id: "root_grasp",
    name: "Хватка корней",
    aspect: "nature",
    glyph: "🌱",
    cooldown: 12,
    damage: 0,
    manaCost: 30,
    targetMode: "enemy",
    range: "ranged",
    reach: 4,
    effects: {
      rootDuration: 5,
      poisonPerSec: 8,
      poisonDuration: 5,
      slowDuration: 5,
      slowPotency: 1,
    },
  },
  poison_bush: {
    id: "poison_bush",
    name: "Ядовитый куст",
    aspect: "nature",
    glyph: "🥀",
    cooldown: 7.5,
    damage: 0,
    manaCost: 36,
    targetMode: "zone",
    range: "any",
    reach: 4,
    effects: { poisonPerSec: 8, poisonDuration: 4 },
  },
};

/** Слоты панели героя (песочница). */
export const ALL_ABILITY_IDS: AbilityId[] = ["wind_gust", "wind_speed", "squall", "tornado"];

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
    case "hammer_throw":
      return `Швыряет молот во врага, нанося ${def.damage} ед. урона светом и оглушая цель на ${fmtNum(e.stunDuration ?? 0)} сек.`;
    case "titan_might":
      return `Наполняет вас мощью титана, увеличивая урон от атак на ${fmtPct(e.atkBuffPotency ?? 0)}% на ${fmtNum(e.atkBuffDuration ?? 0)} сек.`;
    case "demoralizing_shout":
      return `Издает устрашающий крик. Урон атаки всех врагов ×${fmtNum(e.atkDebuffMult ?? 0)} на ${fmtNum(e.atkDebuffDuration ?? 0)} сек.`;
    case "sever_artery":
      return `Вскрывает артерию цели, нанося ${def.damage} ед. физического урона и вызывая кровотечение: ${fmtNum(e.bleedPerSec ?? 0)} ед. физического урона в секунду в течение ${fmtNum(e.bleedDuration ?? 0)} сек.`;
    case "shadow_strike":
      return `Наносит удар из тени, причиняя ${def.damage} ед. физического урона. Пока длится удар, вы неуязвимы.`;
    case "wind_gust":
      return `Сжимает воздух в удар по выбранному врагу, нанося ${def.damage} ед. урона воздухом, и отбрасывает его на клетку дальше от героя.`;
    case "wind_speed":
      return `Обвивает вас быстрым потоком ветра, ускоряя автоатаки: интервал атаки ×${fmtNum(e.hasteIntervalMult ?? 0)} на ${fmtNum(e.hasteDuration ?? 0)} сек.`;
    case "squall":
      return `Рассекает воздух вокруг выбранной клетки. Сам клик пуст: соседние клетки крестом получают ${def.damage} ед. урона воздухом.`;
    case "dust_veil":
      return `Поднимает пыль по всему полю. Интервал автоатаки всех врагов ×${fmtMult(e.slowPotency ?? 0)} на ${fmtNum(e.slowDuration ?? 0)} сек.`;
    case "air_pocket":
      return `Сжимает воздух в карман на клике и соседних клетках. Интервал автоатаки врагов в зоне ×${fmtMult(e.slowPotency ?? 0)} на ${fmtNum(e.slowDuration ?? 0)} сек.`;
    case "tornado":
      return `На клетке поднимается смерч, нанося ${fmtNum(e.tornadoDps ?? def.damage)} ед. урона воздухом в секунду. Через ${fmtNum(e.tornadoStaySec ?? 0)} сек. он сам прыгает на соседнюю клетку, затем ещё раз, и рассеивается после ${fmtNum(e.tornadoStays ?? 0)} стоянок.`;
    case "dark_arrow":
      return `Враг готовит стрелу тьмы и выпускает ее в героя. Пока идет подготовка, он не атакует.`;
    case "rejuvenation":
      return `Сила природы омолаживает вас, восстанавливая ${fmtNum(e.regenPerSec ?? 0)} ед. здоровья в секунду в течение ${fmtNum(e.regenDuration ?? 0)} сек.`;
    case "root_grasp":
      return `Корни смыкаются вокруг врага и удерживают его на клетке на ${fmtNum(e.rootDuration ?? 0)} сек. Цель получает ${fmtNum(e.poisonPerSec ?? 0)} ед. урона природы в секунду и замедляет автоатаки: интервал ×${fmtMult(e.slowPotency ?? 0)} на ${fmtNum(e.slowDuration ?? 0)} сек. Мгновенного урона нет.`;
    case "poison_bush":
      return `Отмечает клетку. На четырёх диагоналях всходит ядовитый куст: враги там получают ${fmtNum(e.poisonPerSec ?? 0)} ед. урона ядом в секунду в течение ${fmtNum(e.poisonDuration ?? 0)} сек. Клетка клика без эффекта.`;
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
    case "hammer_throw":
      lines.push(`${def.damage} урона света`);
      lines.push(`стан ${fmtNum(e.stunDuration ?? 0)} с`);
      break;
    case "titan_might":
      lines.push(`урон атаки ×${fmtMult(e.atkBuffPotency ?? 0)} на ${fmtNum(e.atkBuffDuration ?? 0)} с`);
      break;
    case "demoralizing_shout":
      lines.push(`урон атаки всех врагов ×${fmtNum(e.atkDebuffMult ?? 0)} на ${fmtNum(e.atkDebuffDuration ?? 0)} с`);
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
    case "wind_gust":
      lines.push(`${def.damage} урона воздуха по выбранному врагу`);
      lines.push("отброс на 1 клетку дальше от героя");
      break;
    case "wind_speed":
      lines.push(`интервал автоатаки героя ×${fmtNum(e.hasteIntervalMult ?? 0)} на ${fmtNum(e.hasteDuration ?? 0)} с`);
      break;
    case "squall":
      lines.push(`каждая клетка креста: ${def.damage} урона воздуха`);
      break;
    case "dust_veil":
      lines.push(`интервал автоатаки всех врагов ×${fmtMult(e.slowPotency ?? 0)} на ${fmtNum(e.slowDuration ?? 0)} с`);
      break;
    case "air_pocket":
      lines.push(`клик и 3 соседа: интервал автоатаки ×${fmtMult(e.slowPotency ?? 0)} на ${fmtNum(e.slowDuration ?? 0)} с`);
      break;
    case "tornado":
      lines.push(`${fmtNum(e.tornadoDps ?? def.damage)} урона воздуха в секунду по врагам на клетке смерча`);
      lines.push(`стоянка ${fmtNum(e.tornadoStaySec ?? 0)} с (3 удара за стоянку)`);
      lines.push(`${fmtNum(e.tornadoStays ?? 0)} стоянки подряд (старт + 2 перемещения)`);
      break;
    case "dark_arrow":
      lines.push(`подготовка ${fmtNum(e.castTime ?? 0)} с`);
      lines.push(`${def.damage} урона по герою, если подготовка дошла до конца`);
      lines.push("на время подготовки автоатаки этого врага не проходят, шкала автоатаки стоит");
      lines.push("после завершенной подготовки кулдаун автоатаки начинается с нуля и заполняется заново");
      break;
    case "rejuvenation":
      lines.push(
        `лечение ${fmtNum(e.regenPerSec ?? 0)} в секунду, ${fmtNum(e.regenDuration ?? 0)} с (итого ${fmtNum((e.regenPerSec ?? 0) * (e.regenDuration ?? 0))})`,
      );
      break;
    case "root_grasp":
      lines.push(`удержание на клетке ${fmtNum(e.rootDuration ?? 0)} с`);
      lines.push(
        `${fmtNum(e.poisonPerSec ?? 0)} урона природы в секунду, ${fmtNum(e.poisonDuration ?? 0)} с (итого ${fmtNum((e.poisonPerSec ?? 0) * (e.poisonDuration ?? 0))})`,
      );
      lines.push(`интервал автоатаки ×${fmtMult(e.slowPotency ?? 0)} на ${fmtNum(e.slowDuration ?? 0)} с`);
      lines.push("каст не блокирует, перемещение блокирует");
      break;
    case "poison_bush":
      lines.push(`каждая диагональ: яд ${fmtNum(e.poisonPerSec ?? 0)} в секунду, ${fmtNum(e.poisonDuration ?? 0)} с`);
      break;
  }
  return lines;
}

export function abilityDefForGrimoireId(cardId: string): AbilityDef | undefined {
  const id = ABILITY_BY_GRIMOIRE_ID[cardId];
  return id ? ABILITIES[id] : undefined;
}
