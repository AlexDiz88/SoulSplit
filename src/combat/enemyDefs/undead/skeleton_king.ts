import type { EnemyDef } from "../types";

const skeletonKing: EnemyDef = {
  id: "skeleton_king",
  name: "Король скелетов",
  short: "КСК",
  group: "Нежить",
  groupId: "undead",
  region: "Руины",
  regionId: "ruins",
  status: "одобрено",
  portrait: "skeleton_king.png",
  baseLevel: 4,
  threatMult: 1.5,
  boss: true,
  reach: 4,
  spawnRows: [4],
  hp: 300,
  atk: 17,
  cd: 2.3,
  aspect: "necromancy",
  weapon: "staff",
  abilities: ["living_bones"],
  description:
    "Владыка склепа с костяным жезлом. Держится в дальнем ряду и поднимает стражу из костей своих подданных.",
  extra: "Появляется только в ряду 4. Бьёт жезлом на всю глубину поля.",
  hook: 'reach 4, ряд 4, босс со жезлом и "Живыми костями"',
};

export default skeletonKing;
