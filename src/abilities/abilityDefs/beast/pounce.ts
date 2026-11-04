import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "pounce",
  name: "Прыжок на добычу",
  aspectId: "beast",
  status: "черновик",
  icon: "pounce.png",
  hook: "34 физ по цели, 52 если метка добычи зверя",
  description: "Дух срывается с места на выбранного врага. Удар особенно жесток, если цель уже помечена как добыча.",
  cooldown: 6.5,
  manaCost: 28,
  damage: 0,
  application: "цель",
  zoneLabel: "1–2",
  effect: "урон",
  numbers: [
    "34 физического урона по выбранному врагу",
    "52 физического урона вместо 34, если на цели активна метка добычи от способностей Духа Зверя"
  ],
  zone: null,
};

export default def;
