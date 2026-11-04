import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "living_bones",
  name: "Живые кости",
  aspectId: "enemies",
  status: "одобрено",
  icon: "living_bones.png",
  hook: "призыв защитника (ряд 1) и лучника (2-3), кд 30 с, старт на полном кд",
  description: "Мгновенно поднимает двух скелетов: защитника (по возможности в 1 ряду) и лучника (ряды 2-3). При старте боя способность сразу на кулдауне.",
  cooldown: 30,
  manaCost: null,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "призыв",
  numbers: [
    "мгновенно: Скелет-защитник (ряд 1 по возможности) и Скелет-лучник (ряды 2-3)",
    "при старте боя сразу на полном кулдауне (первое применение через 30 с)"
  ],
  extra: "Если свободных клеток нет, недостающие призывы не появляются.",
  zone: null,
  combat: {
    aspect: "necromancy",
    glyph: "💀",
    targetMode: "self",
    range: "any",
    reach: 0,
    effects: { startOnFullCooldown: true },
  },
};

export default def;
