import type { EnemyDef } from "../types";

const scavenger: EnemyDef = {
  id: "scavenger",
  name: "Падальщик",
  short: "ПДЛ",
  group: "Нежить",
  groupId: "undead",
  region: "Руины",
  regionId: "ruins",
  status: "одобрено",
  portrait: "scavenger.png",
  baseLevel: 1,
  reach: 1,
  spawnRows: [1],
  hp: 55,
  atk: 7,
  cd: 1.6,
  aspect: "stealth",
  weapon: "melee",
  description:
    "Не до конца разложившийся труп. Возможно бывший житель города или заблудившийся торговец. Бросается в рукопашную и рвёт цель когтями.",
  hook: "reach 1, ряд 1, быстрый хрупкий ближник",
};

export default scavenger;
