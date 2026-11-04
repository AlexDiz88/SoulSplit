import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "phantom_shot",
  name: "Призрачный выстрел",
  aspectId: "illusion",
  status: "черновик",
  icon: "phantom_shot.png",
  hook: "38 эфир + следующая автоатака врага промах",
  description: "Сгусток эфира бьёт в выбранного врага и оставляет в глазах ложный след: следующий его удар по кому-либо не попадает.",
  cooldown: 5,
  manaCost: 26,
  damage: 38,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "38 урона эфиром по выбранному врагу",
    "следующая автоатака этого врага промахивается (срывается после одной попытки)"
  ],
  zone: null,
};

export default def;
