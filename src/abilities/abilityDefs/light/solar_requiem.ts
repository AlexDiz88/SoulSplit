import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "solar_requiem",
  name: "Солнечный реквием",
  aspectId: "light",
  status: "черновик",
  icon: "solar_requiem.png",
  hook: "каст 2.5 с, кд 14 с: 15 урона света всем + ослепление -35% скорости атаки на 3 с",
  description:
    "Герой поднимает руки к зениту и пение света накрывает всё поле: каждый враг получает лёгкий удар и на время слепнет.",
  cooldown: 14,
  manaCost: 58,
  castTime: 2.5,
  damage: 15,
  application: "все враги",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "время каста 2.5 с",
    "15 урона света каждому врагу",
    "ослепление на 3 с: скорость атаки снижена на 35%",
  ],
};

export default def;