import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "judgment_seal",
  name: "Печать суда",
  aspectId: "light",
  status: "черновик",
  icon: "judgment_seal.png",
  hook: "без урона, печать на цели 6 с: следующая способность Света по ней +30% урона",
  description:
    "Накладывает на врага сияющий знак. Пока знак горит, ваш следующий приём Света по этой же цели бьёт заметно сильнее.",
  cooldown: 5,
  manaCost: 18,
  damage: 0,
  application: "цель",
  zoneLabel: "нет",
  effect: "дебафф",
  numbers: [
    "печать на 6 с",
    "следующая способность Света по этой цели наносит на 30% больше урона, затем печать снимается",
  ],
  extra:
    "повторное наложение на ту же цель обновляет длительность печати, бонус урона не суммируется",
};

export default def;