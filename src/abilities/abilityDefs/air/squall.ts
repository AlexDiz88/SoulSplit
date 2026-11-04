import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "squall",
  name: "Шквал",
  aspectId: "air",
  status: "одобрено",
  icon: "squall.png",
  hook: "клик пустой, 34 урона воздуха на 4 клетках крестом",
  description: "Рассекает воздух вокруг выбранной клетки. Сам клик пуст: соседние клетки крестом получают 34 ед. урона воздухом.",
  cooldown: 7.5,
  manaCost: 18,
  damage: 34,
  application: "зона",
  zoneLabel: "клик без эффекта, урон на четырёх соседних клетках крестом",
  effect: "урон",
  numbers: [
    "каждая клетка креста: 34 урона воздуха"
  ],
  zone: {
    anchor: "клик",
    damage: "одинаковый",
    rows: [
      [".", ".", ".", "."],
      [".", "A", ".", "."],
      ["B", "+", "C", "."],
      [".", "D", ".", "."]
    ],
    notes: [
      "`+` - точка клика, без эффекта, (0, 0)",
      "A - 34 урона, (dcol 0, drow -1)",
      "B - 34 урона, (dcol -1, drow 0)",
      "C - 34 урона, (dcol +1, drow 0)",
      "D - 34 урона, (dcol 0, drow +1)"
    ],
  },
  combat: {
    aspect: "air",
    glyph: "💨",
    targetMode: "zone",
    range: "any",
    reach: 4,
    effects: {},
  },
};

export default def;
