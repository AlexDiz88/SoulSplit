import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "avalanche",
  name: "Лавина",
  aspectId: "ice",
  status: "одобрено",
  icon: "avalanche.png",
  hook: "каст 2.5 с, кд 14 с: 14 урона льда всем + хрупкость: следующий удар +35%, 4 с",
  description:
    "Герой собирает стылую волну и обрушивает её на всё поле. Каждый враг получает урон льдом и на миг становится хрупким: следующий удар по нему бьёт заметно сильнее.",
  cooldown: 14,
  manaCost: 55,
  castTime: 2.5,
  damage: 14,
  application: "все враги",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "время каста 2.5 с",
    "14 урона льда каждому врагу",
    "хрупкость на 4 с: следующий удар по цели наносит на 35% больше урона, затем хрупкость снимается",
  ],
};

export default def;
