import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "behind_backs",
  name: "За спинами",
  aspectId: "enemies",
  status: "одобрено",
  icon: "behind_backs.png",
  hook: "без урона, вне 1 ряда входящий урон -50%",
  description: "Пока носитель стоит не в ближнем ряду, входящий урон снижен на 50%. В первом ряду прикрытие срывается.",
  cooldown: null,
  manaCost: null,
  damage: 0,
  application: "пассив",
  zoneLabel: "нет",
  effect: "защита",
  numbers: [
    "вне 1 ряда: входящий урон снижен на 50%",
    "в 1 ряду: входящий урон без снижения"
  ],
  extra: "Пассивная. Действует на любой урон (автоатаки, способности, DoT).",
  zone: null,
  combat: {
    aspect: "might",
    glyph: "🛡",
    targetMode: "passive",
    range: "any",
    reach: 0,
    effects: { rearDamageTakenMult: 0.5 },
  },
};

export default def;
