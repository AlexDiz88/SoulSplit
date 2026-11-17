import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "sanctifying_ray",
  name: "Освящающий луч",
  aspectId: "light",
  status: "черновик",
  icon: "sanctifying_ray.png",
  hook: "38 урона света по цели; +20, если на цели любой дебафф (any_debuff)",
  description:
    "Луч с небес бьёт выбранного врага. Сияние сильнее, если на цели уже висит проклятие, яд или иное ослабление.",
  cooldown: 5.5,
  manaCost: 26,
  damage: 38,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон",
  numbers: [
    "38 урона света по выбранному врагу",
    "если на цели любой дебафф (any_debuff): ещё 20 урона света",
  ],
};

export default def;