import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "dawn_barrier",
  name: "Барьер рассвета",
  aspectId: "light",
  status: "черновик",
  icon: "dawn_barrier.png",
  hook: "щит 62 на 6 с + снимает один дебафф с героя, без урона по врагам",
  description:
    "Сжимает вокруг вас утренний свет: поглощает удары и смывает с тела одно проклятие или ослабление.",
  cooldown: 8,
  manaCost: 38,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "щит, защита",
  numbers: [
    "щит 62 на 6 с",
    "снимает один дебафф с героя (новые не блокирует)",
  ],
};

export default def;