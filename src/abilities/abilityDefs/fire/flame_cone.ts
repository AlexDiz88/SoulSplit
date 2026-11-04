import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "flame_cone",
  name: "Дыхание дракона",
  aspectId: "fire",
  status: "одобрено",
  icon: "dragon_breath.png",
  hook: "клик ряд 1: 40 в клик, 22 в до 3 клеток выше",
  description: "Выдыхает столб пламени в выбранную клетку, нанося 40 ед. урона огнем. Клетки выше по зоне получают 22 ед. урона огнем.",
  cooldown: 6.5,
  manaCost: 16,
  damage: 40,
  application: "зона",
  zoneLabel: "клик в ближнем ряду, полный урон в клик и сниженный в ряду выше",
  effect: "урон",
  numbers: [
    "клик: 40 урона огня",
    "каждая клетка ряда выше (до трех): 22 урона огня"
  ],
  zone: {
    anchor: "клик",
    damage: "разный",
    rows: [
      [".", ".", ".", "."],
      [".", ".", ".", "."],
      ["A", "B", "C", "."],
      [".", "X", ".", "."]
    ],
    notes: [
      "X - клик, 40 урона, (0, 0)",
      "A - 22 урона, (dcol -1, drow -1)",
      "B - 22 урона, (dcol 0, drow -1)",
      "C - 22 урона, (dcol +1, drow -1)"
    ],
  },
  combat: {
    aspect: "fire",
    glyph: "🌋",
    targetMode: "zone",
    range: "any",
    reach: 1,
    effects: { zoneSecondaryRatio: 0.55 },
  },
};

export default def;
