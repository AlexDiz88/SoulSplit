import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "shadow_strike",
  name: "Теневой удар",
  aspectId: "stealth",
  status: "одобрено",
  icon: "shadow_strike.png",
  hook: "55 урона + неуязвимость на время удара",
  description: "Наносит удар из тени, причиняя 55 ед. физического урона. Пока длится удар, вы неуязвимы.",
  cooldown: 7.5,
  manaCost: 18,
  damage: 55,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, неуязвимость",
  numbers: [
    "55 физического урона",
    "неуязвимость на время удара"
  ],
  zone: null,
  combat: {
    aspect: "stealth",
    glyph: "👤",
    targetMode: "enemy",
    range: "any",
    reach: 2,
    effects: { invulnerableDuringCast: true },
  },
};

export default def;
