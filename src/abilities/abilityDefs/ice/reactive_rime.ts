import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "reactive_rime",
  name: "Ответный иней",
  aspectId: "ice",
  status: "черновик",
  icon: "reactive_rime.png",
  hook: "на себя 6 с: каждый удар по герою - скорость атаки бьющего -35% на 3 с",
  description:
    "Кожа покрывается тонким инеем. Пока эффект держится, каждый удар по вам стыдит атакующего: его скорость атаки падает.",
  cooldown: 10,
  manaCost: 32,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "бафф, дебафф",
  numbers: [
    "длится 6 с",
    "каждый полученный удар: скорость атаки бьющего врага снижена на 35% на 3 с",
  ],
  extra:
    "Срабатывает на каждый удар, пока бафф активен. Не поглощает урон.",
};

export default def;
