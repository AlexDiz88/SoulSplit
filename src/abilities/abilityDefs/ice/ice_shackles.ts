import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "ice_shackles",
  name: "Ледяные оковы",
  aspectId: "ice",
  status: "черновик",
  icon: "ice_shackles.png",
  hook: "без урона, цель заморожена на месте на 2.2 с",
  description:
    "Сковывает выбранного врага льдом. Цель не может сменить клетку, пока оковы не растают. Урон и автоатаки оковы не мешают.",
  cooldown: 7,
  manaCost: 28,
  damage: 0,
  application: "цель",
  zoneLabel: "нет",
  effect: "контроль",
  numbers: [
    "удержание на месте на 2.2 с (блок перемещения, каст и автоатака разрешены)",
  ],
};

export default def;
