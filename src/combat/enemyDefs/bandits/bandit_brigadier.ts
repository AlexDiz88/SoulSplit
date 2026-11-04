import type { EnemyDef } from "../types";

const banditBrigadier: EnemyDef = {
  id: "bandit_brigadier",
  name: "Бригадир",
  short: "БРГ",
  group: "Бандиты",
  groupId: "bandits",
  region: "Северная дорога",
  regionId: "north_road",
  status: "одобрено",
  portrait: "bandit_brigadier.jpg",
  baseLevel: 2,
  reach: 1,
  spawnRows: [1],
  hp: 130,
  atk: 10,
  cd: 2.5,
  aspect: "might",
  weapon: "melee",
  description:
    "Толстяк со щитом и тяжёлой булавой. Закрывает ближний ряд и медленно крушит тех, кто полез вплотную. Имеет высокую живучесть.",
  hook: "reach 1, ряд 1, толстый танк со щитом и булавой",
};

export default banditBrigadier;
