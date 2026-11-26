import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "devour_minion",
  name: "Пожирание слуги",
  aspectId: "necromancy",
  status: "черновик",
  icon: "devour_minion.png",
  hook:
    "поглощает вашего прислужника: лечение 45 + щит 40 на 5 с, без урона врагам",
  description:
    "Сжимает призванную тварь обратно в пыль и забирает остаток её воли. Прислужник исчезает, вы залечиваете раны и накрываетесь костяной коркой.",
  cooldown: 8,
  manaCost: 28,
  damage: 0,
  application: "на себя",
  zoneLabel: "нет",
  effect: "лечение, щит, защита",
  numbers: [
    "если есть ваш прислужник: он исчезает",
    "герой: лечение 45",
    "щит 40 на 5 с",
  ],
  extra:
    "Без живого прислужника кнопка не срабатывает. Поглощает только ваших призванных существ Некромантии.",
};

export default def;