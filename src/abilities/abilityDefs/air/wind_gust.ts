import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "wind_gust",
  name: "Порыв ветра",
  aspectId: "air",
  status: "одобрено",
  icon: "wind_gust.png",
  hook: "44 урона воздуха + отброс на 1 клетку дальше от героя",
  description: "Сжимает воздух в удар по выбранному врагу, нанося 44 ед. урона воздухом, и отбрасывает его на клетку дальше от героя.",
  cooldown: 6,
  manaCost: 14,
  damage: 44,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, контроль",
  numbers: [
    "44 урона воздуха по выбранному врагу",
    "отброс на 1 клетку дальше от героя"
  ],
  extra: "Если клетка отброса занята или за краем сетки, цель остаётся на месте.",
  zone: null,
  combat: {
    aspect: "air",
    glyph: "🌬",
    targetMode: "enemy",
    range: "ranged",
    reach: 4,
    effects: {},
  },
};

export default def;
