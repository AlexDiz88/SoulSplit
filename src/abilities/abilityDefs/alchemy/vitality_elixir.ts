import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "vitality_elixir",
  name: "Эликсир оживления",
  aspectId: "alchemy",
  status: "черновик",
  icon: "vitality_elixir.png",
  hook: "регенерация 10/с на 5 с",
  description: "Герой выпивает настой: раны затягиваются, дыхание выравнивается, тело быстрее восстанавливается.",
  cooldown: 6,
  manaCost: 22,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "лечение",
  numbers: [
    "регенерация 10 в секунду в течение 5 с"
  ],
  zone: null,
};

export default def;
