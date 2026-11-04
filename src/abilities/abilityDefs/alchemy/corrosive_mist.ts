import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "corrosive_mist",
  name: "Коррозионный туман",
  aspectId: "alchemy",
  status: "черновик",
  icon: "corrosive_mist.png",
  hook: "22 кислота всем + урон атаки врагов -20% на 4 с",
  description: "Облако едких паров накрывает поле боя: враги кашляют, оружие и доспехи покрываются ржавчиной, удары слабеют.",
  cooldown: 8.5,
  manaCost: 34,
  damage: 22,
  application: "все враги",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "22 урона кислотой каждому врагу на сетке",
    "урон атаки всех врагов снижен на 20% на 4 с"
  ],
  zone: null,
};

export default def;
