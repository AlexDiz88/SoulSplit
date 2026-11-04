import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "blind_spot_strike",
  name: "Удар слепого пятна",
  aspectId: "illusion",
  status: "черновик",
  icon: "blind_spot_strike.png",
  hook: "36 эфир по цели + 22 эфир одному соседу манхэттен 1",
  description: "Эфир бьёт в выбранного врага и одновременно в соседа, которого он из-за миража не замечает.",
  cooldown: 6.5,
  manaCost: 32,
  damage: 36,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон",
  numbers: [
    "36 урона эфиром по выбранному врагу",
    "22 урона эфиром одному другому врагу в соседней клетке (манхэттен 1) от цели, если такой есть",
    "второй удар не проходит, если подходящего соседа нет"
  ],
  zone: null,
};

export default def;
