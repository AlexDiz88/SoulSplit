import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "blood_pulse",
  name: "Пульс крови",
  aspectId: "blood",
  status: "черновик",
  icon: "blood_pulse.png",
  hook: "каст 2.5 с, кд 14 с: 13 урона крови всем + кровотечение 6/с на 3 с",
  description:
    "Герой вбивает пульс в землю, и по всему полю пробегает кровавая волна. Каждый враг получает удар и слабое, но всеобщее кровотечение.",
  cooldown: 14,
  manaCost: 54,
  castTime: 2.5,
  damage: 13,
  application: "все враги",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "время каста 2.5 с",
    "13 урона крови каждому врагу",
    "кровотечение 6 урона крови в секунду на 3 с",
  ],
};

export default def;