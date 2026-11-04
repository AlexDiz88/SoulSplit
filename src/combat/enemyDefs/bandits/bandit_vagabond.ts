import type { EnemyDef } from "../types";

const banditVagabond: EnemyDef = {
  id: "bandit_vagabond",
  name: "Бродяга",
  short: "БРД",
  group: "Бандиты",
  groupId: "bandits",
  region: "Северная дорога",
  regionId: "north_road",
  status: "одобрено",
  portrait: "bandit_vagabond.png",
  baseLevel: 1,
  reach: 1,
  spawnRows: [1, 2],
  hp: 58,
  atk: 8,
  cd: 1.6,
  aspect: "stealth",
  weapon: "melee",
  description:
    "Оборванец с тракта, лезет в упор с коротким кинжалом. Атакует часто, но не сильно и долго не держится.",
  hook: "reach 1, ряды 1-2, быстрый ближник с кинжалом",
};

export default banditVagabond;
