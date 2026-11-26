import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "stone_spike",
  name: "Каменный шип",
  aspectId: "earth",
  status: "черновик",
  icon: "stone_spike.png",
  hook: "42 урона земли по цели + скорость атаки цели -30% на 4 с",
  description:
    "Из-под ног врага вырывается острый шип. Удар тяжёлый, и цели после него трудно разогнать темп атаки.",
  cooldown: 5.5,
  manaCost: 28,
  damage: 42,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "42 урона земли по выбранному врагу",
    "скорость атаки цели снижена на 30% на 4 с",
  ],
};

export default def;