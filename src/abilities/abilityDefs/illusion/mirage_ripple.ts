import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "mirage_ripple",
  name: "Зыбь миражей",
  aspectId: "illusion",
  status: "черновик",
  icon: "mirage_ripple.png",
  hook: "22 эфир всем + скорость атаки -25% на 4 с",
  description: "По полю боя проходит волна эфира: враги видят десятки копий друг друга и на миг теряют ритм атаки.",
  cooldown: 8.5,
  manaCost: 34,
  damage: 22,
  application: "все враги",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "22 урона эфиром каждому врагу на сетке",
    "скорость атаки каждого поражённого врага снижена на 25% на 4 с"
  ],
  zone: null,
};

export default def;
