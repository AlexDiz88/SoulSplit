import type { EnemyDef } from "../types";

const goblinSpear: EnemyDef = {
  id: "goblin_spear",
  name: "Гоблин-копейщик",
  short: "ГБЛ",
  group: "Гоблины",
  groupId: "goblins",
  region: "Северная дорога",
  regionId: "north_road",
  status: "одобрено",
  portrait: "goblin_spear.png",
  baseLevel: 1,
  reach: 2,
  spawnRows: [1, 2],
  hp: 68,
  atk: 7,
  cd: 1.7,
  aspect: "might",
  weapon: "spear",
  description:
    "Низкорослый копейщик с северной дороги. Держит героя на полшага дальше обычного клинка.",
  hook: "reach 2, ряды 1-2, лёгкий ближник с копьём",
};

export default goblinSpear;
