import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "beast_bite",
  name: "Звериный укус",
  aspectId: "beast",
  status: "черновик",
  icon: "beast_bite.png",
  hook: "42 физ + метка добычи: Дух Зверя +25% по цели, 6 с",
  description: "Дух хищника вонзается в выбранного врага и оставляет метку добычи: по помеченной цели легче бить другими приёмами зверя.",
  cooldown: 5,
  manaCost: 26,
  damage: 0,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "42 физического урона по выбранному врагу",
    "метка добычи 6 с: способности аспекта Дух Зверя по этой цели наносят на 25% больше урона"
  ],
  zone: null,
};

export default def;
