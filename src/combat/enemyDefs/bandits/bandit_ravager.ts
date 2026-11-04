import type { EnemyDef } from "../types";

const banditRavager: EnemyDef = {
  id: "bandit_ravager",
  name: "Разорительница",
  short: "РЗР",
  group: "Бандиты",
  groupId: "bandits",
  region: "Северная дорога",
  regionId: "north_road",
  status: "одобрено",
  portrait: "bandit_ravager.png",
  baseLevel: 2,
  reach: 1,
  spawnRows: [1],
  hp: 78,
  atk: 11,
  cd: 1.9,
  aspect: "might",
  weapon: "melee",
  description:
    "Отчаянная воительница без щита: лезет в первый ряд с булавой и бьёт жёстко. Держится хуже Бригадира, но бьет чаще и больнее.",
  hook: "reach 1, ряд 1, агрессивный мили с булавой без щита",
};

export default banditRavager;
