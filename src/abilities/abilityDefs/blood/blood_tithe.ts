import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "blood_tithe",
  name: "Дань крови",
  aspectId: "blood",
  status: "черновик",
  icon: "blood_tithe.png",
  hook: "жертва 12% текущего HP: урон способностей Крови +25% и вампиризм 20% на 6 с",
  description:
    "Герой открывает жилу на ладони и вкладывает свою кровь в дело. Ближайшие удары школы Крови бьют сильнее, а часть урона возвращается здоровьем.",
  cooldown: 10,
  manaCost: 28,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "бафф",
  numbers: [
    "при активации: теряете 12% текущего здоровья",
    "урон способностей Крови повышен на 25% на 6 с",
    "вампиризм 20% на 6 с",
  ],
};

export default def;