import type { EnemyDef } from "../types";

const skeletonSpearman: EnemyDef = {
  id: "skeleton_spearman",
  name: "Скелет-копейщик",
  short: "СКП",
  group: "Нежить",
  groupId: "undead",
  region: "Руины",
  regionId: "ruins",
  status: "одобрено",
  portrait: "skeleton_spearman.png",
  baseLevel: 3,
  reach: 2,
  spawnRows: [1, 2],
  hp: 115,
  atk: 12,
  cd: 2.0,
  aspect: "might",
  weapon: "spear",
  description:
    "Костяной страж с ржавым копьём. Может атаковать со средней дистанции. Крепкий воин с хорошим уроном, не стоит его недооценивать.",
  hook: "reach 2, ряды 1-2, копейщик среднего ряда",
};

export default skeletonSpearman;
