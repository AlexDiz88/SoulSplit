import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "titan_might",
  name: "Мощь титана",
  aspectId: "might",
  status: "одобрено",
  icon: "titan_might.png",
  hook: "урон атаки +35% на 5 с, без урона по врагам",
  description: "Наполняет вас мощью титана, повышая урон атаки на 35% на 5 сек.",
  cooldown: 8,
  manaCost: 20,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "бафф",
  numbers: [
    "урон атаки повышен на 35% на 5 с"
  ],
  zone: null,
  combat: {
    aspect: "might",
    glyph: "📢",
    targetMode: "ally_aura",
    range: "any",
    reach: 0,
    effects: { atkBuffDuration: 5, atkBuffPotency: 0.35 },
  },
};

export default def;
