import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "life_siphon",
  name: "Вытягивание жизни",
  aspectId: "necromancy",
  status: "черновик",
  icon: "life_siphon.png",
  hook: "40 урона смерти по цели + лечение героя на 50% нанесённого",
  description:
    "Цепляет душу врага и тянет из неё жизнь в вашу грудь. Урон смертью по одной цели; часть силы возвращается вам как исцеление.",
  cooldown: 6,
  manaCost: 32,
  castTime: 1.5,
  damage: 40,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, лечение",
  numbers: [
    "40 урона смерти по выбранному врагу",
    "время каста 1.5 с",
    "герой лечится на 50% нанесённого урона (округление вверх)",
  ],
};

export default def;