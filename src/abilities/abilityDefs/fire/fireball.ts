import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "fireball",
  name: "Огненный шар",
  aspectId: "fire",
  status: "одобрено",
  icon: "fireball.png",
  hook: "42 урона + горение 8/с на 4 с",
  description: "Наносит 42 ед. урона огнем и воспламеняет цель, нанося 8 ед. урона огнем в секунду в течение 4 сек.",
  cooldown: 5.5,
  manaCost: 14,
  damage: 42,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "42 урона огня",
    "горение 8 урона в секунду, 4 с (итого 32)"
  ],
  zone: null,
  combat: {
    aspect: "fire",
    glyph: "🔥",
    targetMode: "cell",
    range: "ranged",
    reach: 3,
    effects: { burnPerSec: 8, burnDuration: 4 },
  },
};

export default def;
