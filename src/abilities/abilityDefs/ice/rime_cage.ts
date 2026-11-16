import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "rime_cage",
  name: "Инеевая клеть",
  aspectId: "ice",
  status: "отказ",
  icon: "rime_cage.png",
  hook: "без урона, клик и крест: заморозка на месте на 1.8 с",
  description:
    "Над выбранной клеткой смыкается клеть из инея. Враги на клике и на соседних клетках крестом на короткое время не могут сменить клетку.",
  cooldown: 8,
  manaCost: 36,
  damage: 0,
  application: "зона",
  zoneLabel: "клик и четыре клетки крестом: удержание без урона",
  effect: "контроль, зона-поле",
  numbers: [
    "удержание на месте на 1.8 с на клике и на четырёх клетках крестом",
  ],
  zone: {
    anchor: "клик",
    damage: "нет",
    rows: [
      [".", ".", ".", "."],
      [".", "#", ".", "."],
      ["#", "X", "#", "."],
      [".", "#", ".", "."],
    ],
    notes: [
      "`X` - точка клика, удержание 1.8 с, (0, 0)",
      "`#` - удержание 1.8 с, (dcol 0, drow -1), (dcol -1, drow 0), (dcol +1, drow 0), (dcol 0, drow +1)",
    ],
  },
};

export default def;
