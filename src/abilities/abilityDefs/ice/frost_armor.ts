import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "frost_armor",
  name: "Морозная броня",
  aspectId: "ice",
  status: "одобрено",
  icon: "frost_armor.png",
  hook: "на себя 6 с: каждый мили-удар по герою - скорость атаки бьющего -60% на 3 с",
  description:
    "Кожа покрывается морозной бронёй. Пока эффект держится, каждый удар в ближнем бою по вам стыдит атакующего: его скорость атаки резко падает.",
  cooldown: 10,
  manaCost: 32,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "бафф, дебафф",
  numbers: [
    "длится 6 с",
    "каждый полученный удар ближнего боя: скорость атаки бьющего врага снижена на 60% на 3 с",
  ],
  extra: "Срабатывает только от атак ближнего боя. Дальние атаки и способности броню не провоцируют.",
};

export default def;
