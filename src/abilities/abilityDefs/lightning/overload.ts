import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "overload",
  name: "Перегрузка",
  aspectId: "lightning",
  status: "черновик",
  icon: "overload.png",
  hook: "без урона, следующая молния с уроном +50%, 6 с, один каст",
  description: "Герой на мгновение пропускает через себя грозовой ток и копит заряд. Следующий удар молнии по врагам выходит с размахом.",
  cooldown: 6,
  manaCost: 22,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "бафф",
  numbers: [
    "6 с: следующая способность молнии с прямым уроном наносит на 50% больше урона (один каст, срывается после применения)"
  ],
  zone: null,
};

export default def;
