import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "claw_sweep",
  name: "Когтистый взмах",
  aspectId: "beast",
  status: "черновик",
  icon: "claw_sweep.png",
  hook: "клик: 40 в клике, 26 на двух соседях по горизонтали",
  description: "Дух проносится полосой когтей через ряд врагов: центр удара получает полный удар, соседи по клетке - ослабленный.",
  cooldown: 6,
  manaCost: 30,
  damage: 0,
  application: "зона",
  zoneLabel: "1–3",
  effect: "урон",
  numbers: [
    "40 физического урона в точке клика",
    "26 физического урона на каждой из двух соседних клеток по горизонтали на том же ряду"
  ],
  zone: {
    anchor: "клик",
    damage: "разный",
    rows: [
      [".", ".", ".", "."],
      [".", "A", "X", "A"],
      [".", ".", ".", "."],
      [".", ".", ".", "."]
    ],
    notes: [
      "`X` — точка клика, 40 урона, (dcol 0, drow 0)",
      "A — 26 урона, (dcol −1, drow 0) и (dcol +1, drow 0)"
    ],
  },
};

export default def;
