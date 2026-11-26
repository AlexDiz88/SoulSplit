import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "granite_shell",
  name: "Гранитная оболочка",
  aspectId: "earth",
  status: "черновик",
  icon: "granite_shell.png",
  hook: "щит 60 на 6 с + входящий урон героя -25% на 6 с, без урона по врагам",
  description:
    "Кожа срастается с плитами гранита. Пока оболочка держится, удары по вам слабеют, а слой камня принимает на себя часть удара.",
  cooldown: 10,
  manaCost: 35,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "защита, щит",
  numbers: [
    "щит поглощает до 60 урона, держится 6 с",
    "входящий урон снижен на 25% на 6 с",
  ],
};

export default def;