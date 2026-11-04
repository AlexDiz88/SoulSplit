import type { EnemyDef } from "../types";

const wandering: EnemyDef = {
  id: "wandering",
  name: "Бродячий",
  short: "ЗМБ",
  group: "Нежить",
  groupId: "undead",
  region: "Руины",
  regionId: "ruins",
  status: "одобрено",
  portrait: "wandering.png",
  baseLevel: 1,
  reach: 1,
  spawnRows: [1],
  hp: 90,
  atk: 9,
  cd: 2.4,
  aspect: "might",
  weapon: "melee",
  description:
    "Тяжёлая туша, что бродит по двору руин. Атакует медленно, но довольно крепкий и может выдержать несколько ударов.",
  hook: "reach 1, ряд 1, медленный толстый ближник",
};

export default wandering;
