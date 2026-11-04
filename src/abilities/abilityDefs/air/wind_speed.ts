import type { AbilityCatalogDef } from "../types";
import { attackSpeedIncreaseToHasteMult } from "../../attackSpeed";

const def: AbilityCatalogDef = {
  id: "wind_speed",
  name: "Скорость ветра",
  aspectId: "air",
  status: "одобрено",
  icon: "wind_speed.png",
  hook: "без урона, скорость атаки +25% на 5 с",
  description: "Обвивает вас быстрым потоком ветра: скорость атаки повышена на 25% на 5 сек.",
  cooldown: 7,
  manaCost: 16,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "бафф",
  numbers: [
    "скорость атаки повышена на 25% на 5 с"
  ],
  zone: null,
  combat: {
    aspect: "air",
    glyph: "🍃",
    targetMode: "ally",
    range: "any",
    reach: 0,
    effects: { hasteIntervalMult: attackSpeedIncreaseToHasteMult(0.25), hasteDuration: 5 },
  },
};

export default def;
