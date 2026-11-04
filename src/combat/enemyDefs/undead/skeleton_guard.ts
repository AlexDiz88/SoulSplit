import type { EnemyDef } from "../types";

const skeletonGuard: EnemyDef = {
  id: "skeleton_guard",
  name: "Скелет-защитник",
  short: "СКЗ",
  group: "Нежить",
  groupId: "undead",
  region: "Руины",
  regionId: "ruins",
  status: "одобрено",
  portrait: "skeleton_guard.png",
  baseLevel: 2,
  reach: 1,
  spawnRows: [1],
  hp: 140,
  atk: 12,
  cd: 2.3,
  aspect: "might",
  weapon: "melee",
  description:
    "Костяной страж ближнего боя со щитом. Держит удар и бьёт тяжело, но медленно. Может блокировать удары.",
  hook: "reach 1, ряд 1, толстый мили-танк",
};

export default skeletonGuard;
