import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "bone_servant",
  name: "Костяной слуга",
  aspectId: "necromancy",
  status: "черновик",
  icon: "bone_servant.png",
  hook:
    "призыв одного костяного прислужника (ряды 1-2), кд 14 с, не больше одного живого",
  description:
    "Срывает с земли кость и натягивает на неё остаток чужой воли. На ближнем поле появляется прислужник: бьёт врагов рядом с героем, пока не падёт.",
  cooldown: 14,
  manaCost: 48,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "призыв",
  numbers: [
    "мгновенно: Костяной прислужник на свободной клетке рядов 1-2 (ближе к герою приоритетнее)",
    "не больше одного вашего прислужника за раз",
  ],
  extra: "Если свободной клетки нет, призыв не срабатывает.",
};

export default def;