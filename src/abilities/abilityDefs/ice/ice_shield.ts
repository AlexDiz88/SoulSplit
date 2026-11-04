import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "ice_shield",
  name: "Ледяной щит",
  aspectId: "ice",
  status: "одобрено",
  icon: "frost_shield.png",
  hook: "щит 55 на 6 с, без урона",
  description: "Окутывает вас ледяным щитом, поглощающим 55 ед. урона. Действует 6 сек. или пока щит не будет разрушен.",
  cooldown: 7,
  manaCost: 18,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "щит",
  numbers: [
    "поглощение 55",
    "держится до 6 с или пока запас не сбит"
  ],
  zone: null,
  combat: {
    aspect: "ice",
    glyph: "🛡",
    targetMode: "ally",
    range: "any",
    reach: 0,
    effects: { shieldAmount: 55, shieldDuration: 6 },
  },
};

export default def;
