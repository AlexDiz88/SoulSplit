import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "catalyst",
  name: "Катализ",
  aspectId: "alchemy",
  status: "черновик",
  icon: "catalyst.png",
  hook: "24 кислота; при любом DoT (any_dot) +22 и переплавка в кислоту 8/с",
  description: "Реагент вливают в уже идущую реакцию на теле врага: чужой урон со временем переплавляется в кислоту и даёт всплеск.",
  cooldown: 6.5,
  manaCost: 28,
  damage: 24,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон",
  numbers: [
    "24 урона кислотой по выбранному врагу",
    "если на цели уже есть урон со временем от любого источника: дополнительно 22 урона кислотой, этот эффект заменяется на 8 урона кислотой в секунду на оставшуюся длительность (не короче 3 с)"
  ],
  zone: null,
};

export default def;
