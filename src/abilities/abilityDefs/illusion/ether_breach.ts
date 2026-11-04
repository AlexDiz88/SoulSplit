import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "ether_breach",
  name: "Эфирный разлом",
  aspectId: "illusion",
  status: "черновик",
  icon: "ether_breach.png",
  hook: "клик пустой, 34 эфир на кресте вокруг",
  description: "Герой бьёт в пустую клетку, но удар проходит сквозь мираж и вырывается эфиром на врагов вокруг точки.",
  cooldown: 6,
  manaCost: 30,
  damage: 34,
  application: "зона",
  zoneLabel: "1–4",
  effect: "урон",
  numbers: [
    "34 урона эфиром на каждой из до четырёх клеток креста вокруг клика",
    "точка клика урона не получает"
  ],
  zone: {
    anchor: "клик",
    damage: "одинаковый",
    rows: [
      [".", ".", ".", "."],
      [".", ".", "A", "."],
      [".", "A", "+", "A"],
      [".", ".", "A", "."]
    ],
    notes: [
      "`+` — точка клика, без урона, (dcol 0, drow 0)",
      "A — 34 урона эфиром, (dcol 0, drow −1), (dcol −1, drow 0), (dcol +1, drow 0), (dcol 0, drow +1)"
    ],
  },
};

export default def;
