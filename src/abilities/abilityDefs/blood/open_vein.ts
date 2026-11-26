import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "open_vein",
  name: "Вскрытие жилы",
  aspectId: "blood",
  status: "черновик",
  icon: "open_vein.png",
  hook: "36 урона крови + кровотечение 10/с на 5 с",
  description:
    "Точный порез на уязвимом месте. Враг истекает кровью, и рана долго не затягивается.",
  cooldown: 5.5,
  manaCost: 26,
  damage: 36,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "36 урона крови по выбранному врагу",
    "кровотечение 10 урона крови в секунду на 5 с",
  ],
};

export default def;