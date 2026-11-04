import type { EnemyDef } from "../types";

const banditMagpie: EnemyDef = {
  id: "bandit_magpie",
  name: "Сорока",
  short: "СРК",
  group: "Бандиты",
  groupId: "bandits",
  region: "Северная дорога",
  regionId: "north_road",
  status: "одобрено",
  portrait: "bandit_magpie.png",
  baseLevel: 2,
  reach: 3,
  spawnRows: [2, 3],
  hp: 60,
  atk: 9,
  cd: 1.9,
  aspect: "stealth",
  weapon: "bow",
  description:
    "Девушка с лёгким луком. Держит средний ряд и сыпет стрелами, пока соратники вяжут врага.",
  hook: "reach 3, ряды 2-3, лучница с частым луком",
};

export default banditMagpie;
