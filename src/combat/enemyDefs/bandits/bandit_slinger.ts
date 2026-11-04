import type { EnemyDef } from "../types";

const banditSlinger: EnemyDef = {
  id: "bandit_slinger",
  name: "Швыряла",
  short: "ШВР",
  group: "Бандиты",
  groupId: "bandits",
  region: "Северная дорога",
  regionId: "north_road",
  status: "одобрено",
  portrait: "bandit_slinger.png",
  baseLevel: 1,
  reach: 3,
  spawnRows: [2, 3],
  hp: 55,
  atk: 8,
  cd: 2.0,
  aspect: "stealth",
  weapon: "bow",
  description:
    "Мелкий жулик. Швыряется камнями со средней дистанции. Выглядит дохло, но может стать занозой в заднице, если долго его игнорировать.",
  hook: "reach 3, ряды 2-3, метатель булыжников",
};

export default banditSlinger;
