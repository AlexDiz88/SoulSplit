import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "quake_heart",
  name: "Сердце толчка",
  aspectId: "earth",
  status: "черновик",
  icon: "quake_heart.png",
  hook: "каст 2.5 с, кд 14 с: 15 урона земли всем + оглушение 1.4 с",
  description:
    "Герой вдавливает ладонь в грунт, и под всем полем пробегает сотрясение. Враги получают удар и на миг теряют равновесие.",
  cooldown: 14,
  manaCost: 56,
  castTime: 2.5,
  damage: 15,
  application: "все враги",
  zoneLabel: "нет",
  effect: "урон, контроль",
  numbers: [
    "время каста 2.5 с",
    "15 урона земли каждому врагу",
    "оглушение на 1.4 с",
  ],
};

export default def;