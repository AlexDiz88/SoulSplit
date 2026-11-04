import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "demoralizing_shout",
  name: "Деморализующий крик",
  aspectId: "might",
  status: "одобрено",
  icon: "demoralizing_shout.png",
  hook: "без урона, урон атаки всех врагов -30% на 5 с",
  description: "Издает устрашающий крик. Урон атаки всех врагов снижен на 30% на 5 сек.",
  cooldown: 7.5,
  manaCost: 32,
  damage: 0,
  application: "все враги",
  zoneLabel: "нет",
  effect: "дебафф",
  numbers: [
    "урон атаки всех врагов снижен на 30% на 5 с"
  ],
  zone: null,
  combat: {
    aspect: "might",
    glyph: "📣",
    targetMode: "all_enemies",
    range: "any",
    reach: 0,
    effects: { atkDebuffDuration: 5, atkDebuffMult: 0.7 },
  },
};

export default def;
