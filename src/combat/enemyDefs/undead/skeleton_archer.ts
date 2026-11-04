import type { EnemyDef } from "../types";

const skeletonArcher: EnemyDef = {
  id: "skeleton_archer",
  name: "Скелет-лучник",
  short: "СКЛ",
  group: "Нежить",
  groupId: "undead",
  region: "Руины",
  regionId: "ruins",
  status: "одобрено",
  portrait: "skeleton_archer.png",
  baseLevel: 2,
  reach: 3,
  spawnRows: [2, 3],
  hp: 58,
  atk: 9,
  cd: 1.8,
  aspect: "stealth",
  weapon: "bow",
  description:
    "Костяной стрелок, бродящий среди руин. Держит дистанцию и сыплет стрелами по врагам.",
  hook: "reach 3, ряды 2-3, хрупкий лучник с галереи",
};

export default skeletonArcher;
