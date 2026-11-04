import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "acid_flask",
  name: "Кислотная склянка",
  aspectId: "alchemy",
  status: "черновик",
  icon: "acid_flask.png",
  hook: "38 кислота + 8/с кислота 4 с",
  description: "В выбранного врага летит склянка: стекло разлетается, кислота прожигает плоть и продолжает есть дальше.",
  cooldown: 5,
  manaCost: 26,
  damage: 38,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон",
  numbers: [
    "38 урона кислотой по выбранному врагу",
    "8 урона кислотой в секунду в течение 4 с"
  ],
  zone: null,
};

export default def;
