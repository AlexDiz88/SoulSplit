import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "beast_hide",
  name: "Шкура зверя",
  aspectId: "beast",
  status: "черновик",
  icon: "beast_hide.png",
  hook: "щит 52 на 5 с, без урона по врагам",
  description: "На миг тело героя покрывает звериная шкура: удары по нему слабее, пока слой не истощится.",
  cooldown: 7,
  manaCost: 24,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "щит",
  numbers: [
    "щит 52 на 5 с (поглощает урон по герою, пока не сбит или не истёк срок)"
  ],
  zone: null,
};

export default def;
