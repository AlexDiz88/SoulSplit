import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "chain_lightning",
  name: "Цепная молния",
  aspectId: "lightning",
  status: "черновик",
  icon: "chain_lightning.png",
  hook: "база 36, до 4 целей, прыжок манхэттен 1, урон 100/75/50/25%",
  description: "Разряд бьёт выбранного врага и до трёх раз перескакивает на других врагов в соседней клетке, каждый скачок слабее предыдущего.",
  cooldown: 7.5,
  manaCost: 36,
  damage: 0,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон",
  numbers: [
    "до 4 целей за один каст, база 36 урона молнии",
    "урон по целям по порядку: 100%, 75%, 50%, 25% от базы (36 / 27 / 18 / 9)",
    "каждый прыжок на нового врага в радиусе 1 клетки от предыдущей цели (манхэттен)",
    "одна цель не может получить разряд дважды за один каст"
  ],
  zone: null,
};

export default def;
