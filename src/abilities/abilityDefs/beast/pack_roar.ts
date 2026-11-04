import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "pack_roar",
  name: "Рев стаи",
  aspectId: "beast",
  status: "черновик",
  icon: "pack_roar.png",
  hook: "20 физ всем + урон атаки врагов -25% на 4 с",
  description: "Герой выпускает звериный рев: враги на поле боя получают удар волной и на миг стягиваются, боясь броситься в атаку.",
  cooldown: 9,
  manaCost: 36,
  damage: 0,
  application: "все враги",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "20 физического урона каждому врагу на сетке",
    "урон атаки всех врагов снижен на 25% на 4 с"
  ],
  zone: null,
};

export default def;
