import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "arcane_missiles",
  name: "Чародейские стрелы",
  aspectId: "arcane",
  status: "одобрено",
  icon: "arcane_missiles.png",
  hook: "канал 3 с: 3 снаряда аркана по 26 урона, раз в 1 с по цели",
  description:
    "Герой удерживает поток маны на враге. Каждую секунду в цель вылетает чародейская стрела, пока канал не завершится или его не сорвут.",
  cooldown: 6,
  manaCost: 30,
  channelTime: 3,
  damage: 26,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон",
  numbers: [
    "канал 3 с: 3 снаряда аркана",
    "каждый снаряд: 26 урона аркана по выбранному врагу",
    "интервал между снарядами 1 с",
  ],
  extra: "прервётся при оглушении, заморозке и прочем жёстком контроле на герое",
  combat: {
    aspect: "arcane",
    glyph: "✦",
    targetMode: "enemy",
    range: "ranged",
    reach: 4,
    damageChannel: "magical",
    attackRange: "ranged",
    effects: {
      channelStages: 3,
      channelStageInterval: 1,
    },
  },
};

export default def;