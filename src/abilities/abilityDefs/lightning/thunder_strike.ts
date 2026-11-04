import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "thunder_strike",
  name: "Громовой удар",
  aspectId: "lightning",
  status: "черновик",
  icon: "thunder_strike.png",
  hook: "40 урона молнии + 1 стак шока (любая Молния +15%/стак, до 3), 5 с",
  description: "С неба бьёт одиночный разряд в выбранного врага и накладывает шок. Пока шок держится, любые способности Молнии по этой цели бьют сильнее.",
  cooldown: 5,
  manaCost: 28,
  damage: 40,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "40 урона молнии по выбранному врагу",
    "1 стак шока на 5 с"
  ],
  extra: "шок: +15% урона от любых способностей аспекта Молния по этой цели за каждый стак, до 3 стаков; повторное наложение шока добавляет стак и обновляет длительность до 5 с",
  zone: null,
};

export default def;
