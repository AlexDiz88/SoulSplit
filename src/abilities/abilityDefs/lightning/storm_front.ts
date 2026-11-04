import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "storm_front",
  name: "Грозовой фронт",
  aspectId: "lightning",
  status: "отказ",
  icon: "storm_front.png",
  hook: "24 урона всем + 1 стак шока на каждого (любая Молния +15%/стак, до 3)",
  description: "Над полем боя прокатывается фронт грозы: все враги получают удар током и шок, от которого сильнее бьёт любая Молния.",
  cooldown: 9,
  manaCost: 38,
  damage: 24,
  application: "все враги",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "24 урона молнии каждому врагу на сетке",
    "1 стак шока на 5 с на каждом поражённом враге"
  ],
  extra: "шок: +15% урона от любых способностей аспекта Молния по этой цели за каждый стак, до 3 стаков; повторное наложение шока добавляет стак и обновляет длительность до 5 с",
  zone: null,
};

export default def;
