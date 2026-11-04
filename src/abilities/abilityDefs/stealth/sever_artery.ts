import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "sever_artery",
  name: "Вскрыть артерию",
  aspectId: "stealth",
  status: "одобрено",
  icon: "sever_artery.png",
  hook: "18 урона + кровотечение 12/с на 5 с",
  description: "Вскрывает артерию цели, нанося 18 ед. физического урона и вызывая кровотечение: 12 ед. физического урона в секунду в течение 5 сек.",
  cooldown: 4,
  manaCost: 10,
  damage: 18,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "18 физического урона",
    "кровотечение 12 урона в секунду, 5 с (итого 60)"
  ],
  zone: null,
  combat: {
    aspect: "stealth",
    glyph: "🗡",
    targetMode: "enemy",
    range: "melee",
    reach: 1,
    effects: { bleedPerSec: 12, bleedDuration: 5 },
  },
};

export default def;
