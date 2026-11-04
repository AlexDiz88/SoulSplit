import type { AbilityCatalogDef } from "../types";
import { attackSpeedReduceToSlowPotency } from "../../attackSpeed";

const def: AbilityCatalogDef = {
  id: "dust_veil",
  name: "Пыльная пелена",
  aspectId: "air",
  status: "отказ",
  icon: "dust_veil.png",
  hook: "без урона, скорость атаки всех врагов -30% на 4 с",
  description: "Поднимает пыль по всему полю. Скорость атаки всех врагов снижена на 30% на 4 сек.",
  cooldown: 8,
  manaCost: 34,
  damage: 0,
  application: "все враги",
  zoneLabel: "нет",
  effect: "дебафф",
  numbers: [
    "скорость атаки всех врагов снижена на 30% на 4 с"
  ],
  zone: null,
  combat: {
    aspect: "air",
    glyph: "🌫",
    targetMode: "all_enemies",
    range: "any",
    reach: 0,
    effects: { slowDuration: 4, slowPotency: attackSpeedReduceToSlowPotency(0.3) },
  },
};

export default def;
