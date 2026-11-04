import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "order",
  name: "Приказ",
  aspectId: "enemies",
  status: "одобрено",
  icon: "order.png",
  hook: "без урона, урон атаки союзника +20% на 5 с",
  description: "Главарь отдаёт короткий приказ выбранному союзнику. Тот бьёт сильнее, пока действует приказ.",
  cooldown: 8,
  manaCost: null,
  damage: 0,
  application: "союзник",
  zoneLabel: "нет",
  effect: "бафф",
  numbers: [
    "урон атаки выбранного союзника повышен на 20% на 5 с"
  ],
  zone: null,
};

export default def;
