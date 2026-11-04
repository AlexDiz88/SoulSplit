import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "image_reflect",
  name: "Отражение образа",
  aspectId: "illusion",
  status: "черновик",
  icon: "image_reflect.png",
  hook: "5 с, первый удар по герою без урона и без эффектов, 1 раз",
  description: "Рядом с героем на миг проступает двойник. Первый удар по герою за это время рассекает пустой образ.",
  cooldown: 7,
  manaCost: 24,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "неуязвимость",
  numbers: [
    "5 с: первый полученный удар по герою (автоатака или способность врага) не наносит урона и не накладывает эффекты",
    "срабатывает один раз за каст, затем двойник исчезает"
  ],
  zone: null,
};

export default def;
