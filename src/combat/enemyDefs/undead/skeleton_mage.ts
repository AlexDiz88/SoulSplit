import type { EnemyDef } from "../types";

const skeletonMage: EnemyDef = {
  id: "skeleton_mage",
  name: "Скелет-маг",
  short: "СКМ",
  group: "Нежить",
  groupId: "undead",
  region: "Руины",
  regionId: "ruins",
  status: "одобрено",
  portrait: "skeleton_mage.png",
  baseLevel: 3,
  reach: 4,
  spawnRows: [3, 4],
  hp: 62,
  atk: 13,
  cd: 2.0,
  aspect: "stealth",
  weapon: "staff",
  abilities: ["dark_arrow"],
  description:
    'Костяной колдун дальнего боя. Между автоатаками применяет "Стрелу тьмы".',
  hook: 'reach 4, ряды 3-4, дальний маг со "Стрелой тьмы"',
};

export default skeletonMage;
