import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "scarlet_reap",
  name: "Жатва алого",
  aspectId: "blood",
  status: "черновик",
  icon: "scarlet_reap.png",
  hook: "каст 1.8 с, жертва 8% HP: 52 крови по цели; при кровотечении +50% урона и лечение 30",
  description:
    "Тяжёлый ритуальный удар по одной цели. Герой платит своей кровью, но вытягивает жизнь из раненого врага с особой жадностью, если тот уже истекает.",
  cooldown: 9,
  manaCost: 38,
  castTime: 1.8,
  damage: 52,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, лечение",
  numbers: [
    "время каста 1.8 с",
    "при активации: теряете 8% текущего здоровья",
    "52 урона крови по выбранному врагу",
    "при кровотечении на цели: урон этим ударом +50%, лечение героя 30",
  ],
};

export default def;