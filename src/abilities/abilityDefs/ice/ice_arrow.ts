import type { AbilityCatalogDef } from "../types";
import { attackSpeedReduceToSlowPotency } from "../../attackSpeed";

const def: AbilityCatalogDef = {
  id: "ice_arrow",
  name: "Ледяная стрела",
  aspectId: "ice",
  status: "одобрено",
  icon: "frostbolt.png",
  hook: "38 урона + скорость атаки цели -35% на 3 сек.",
  description: "Выпускает ледяную стрелу, наносящую 38 ед. урона льдом. Сковывает цель холодом: скорость атаки снижена на 35% на 3 сек.",
  cooldown: 4.5,
  manaCost: 12,
  damage: 38,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "38 урона льда",
    "скорость атаки цели снижена на 35% на 3 с"
  ],
  zone: null,
  combat: {
    aspect: "ice",
    glyph: "❄",
    targetMode: "cell",
    range: "ranged",
    reach: 4,
    effects: { slowDuration: 3, slowPotency: attackSpeedReduceToSlowPotency(0.35) },
  },
};

export default def;
