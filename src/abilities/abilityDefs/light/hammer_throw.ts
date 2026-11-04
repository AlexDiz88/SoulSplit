import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "hammer_throw",
  name: "Бросок молота",
  aspectId: "light",
  status: "одобрено",
  icon: "hammer_throw.png",
  hook: "45 урона + стан 2.2 с, только ближний ряд",
  description: "Швыряет молот во врага, нанося 45 ед. урона светом и оглушая цель на 2.2 сек.",
  cooldown: 5,
  manaCost: 12,
  damage: 45,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, контроль",
  numbers: [
    "45 урона света",
    "стан 2.2 с"
  ],
  zone: null,
  combat: {
    aspect: "light",
    glyph: "⚔",
    targetMode: "cell",
    range: "melee",
    reach: 1,
    effects: { stunDuration: 2.2 },
  },
};

export default def;
