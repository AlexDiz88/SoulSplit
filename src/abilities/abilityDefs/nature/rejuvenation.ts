import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "rejuvenation",
  name: "Омоложение",
  aspectId: "nature",
  status: "одобрено",
  icon: "rejuvenation.png",
  hook: "без урона, регенерация 10/с на 5 с",
  description: "Сила природы омолаживает вас, восстанавливая 10 ед. здоровья в секунду в течение 5 сек.",
  cooldown: 8,
  manaCost: 32,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "лечение",
  numbers: [
    "лечение 10 в секунду, 5 с (итого 50)"
  ],
  zone: null,
  combat: {
    aspect: "nature",
    glyph: "🌿",
    targetMode: "self",
    range: "any",
    reach: 0,
    effects: { regenPerSec: 10, regenDuration: 5 },
  },
};

export default def;
