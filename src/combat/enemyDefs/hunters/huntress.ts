import type { EnemyDef } from "../types";

const huntress: EnemyDef = {
  id: "huntress",
  name: "Охотница",
  short: "ОХТ",
  group: "Охотники",
  groupId: "hunters",
  region: "Северная дорога",
  regionId: "north_road",
  status: "одобрено",
  portrait: "huntress.png",
  baseLevel: 2,
  reach: 3,
  spawnRows: [2, 3],
  hp: 54,
  atk: 10,
  cd: 2.8,
  aspect: "stealth",
  weapon: "bow",
  description: "Меткий лучник среднего ряда. Мало здоровья, бьёт с дистанции.",
  hook: "reach 3, ряды 2-3, хрупкий лучник",
};

export default huntress;
