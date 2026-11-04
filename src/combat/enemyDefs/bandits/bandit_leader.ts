import type { EnemyDef } from "../types";

const banditLeader: EnemyDef = {
  id: "bandit_leader",
  name: "Главарь бандитов",
  short: "ГЛВ",
  group: "Бандиты",
  groupId: "bandits",
  region: "Северная дорога",
  regionId: "north_road",
  status: "одобрено",
  portrait: "bandit_leader.png",
  baseLevel: 3,
  threatMult: 1.5,
  boss: true,
  reach: 1,
  spawnRows: [4],
  hp: 240,
  atk: 18,
  cd: 2.6,
  aspect: "might",
  weapon: "melee",
  abilities: ["behind_backs"],
  description:
    "Главарь банды бандитов. Не лезет на рожон пока его приспешники бьются за него. Вступает в бой только в отчаянный момент, круша всех, кто до него добрался.",
  extra:
    "Появляется только в ряду 4 и бьёт в упор (дистанция 1): до него нужно прорваться сквозь пачку.",
  hook: "reach 1, ряд 4, мини-босс с двуручной булавой и приёмом за спинами",
};

export default banditLeader;
