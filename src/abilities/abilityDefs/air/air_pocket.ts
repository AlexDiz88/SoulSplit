import type { AbilityCatalogDef } from "../types";
import { attackSpeedReduceToSlowPotency } from "../../attackSpeed";

const def: AbilityCatalogDef = {
  id: "air_pocket",
  name: "Воздушный карман",
  aspectId: "air",
  status: "под вопросом",
  icon: "air_pocket.png",
  hook: "без урона, скорость атаки -35% на 5 с на клике и 3 соседних",
  description: "Сжимает воздух в карман на клике и соседних клетках. Скорость атаки врагов в зоне снижена на 35% на 5 сек.",
  cooldown: 9,
  manaCost: 38,
  damage: 0,
  application: "зона",
  zoneLabel: "клик и три клетки: влево, вправо и ближе к герою",
  effect: "дебафф, зона-поле",
  numbers: [
    "клик и 3 соседа: скорость атаки снижена на 35% на 5 с"
  ],
  zone: {
    anchor: "клик",
    damage: "нет (только дебафф)",
    rows: [
      [".", ".", ".", "."],
      ["A", "X", "B", "."],
      [".", "C", ".", "."],
      [".", ".", ".", "."]
    ],
    notes: [
      "X - клик, дебафф, (0, 0)",
      "A - дебафф, (dcol -1, drow 0)",
      "B - дебафф, (dcol +1, drow 0)",
      "C - дебафф, (dcol 0, drow +1)"
    ],
  },
  combat: {
    aspect: "air",
    glyph: "🫧",
    targetMode: "zone",
    range: "any",
    reach: 4,
    effects: { slowDuration: 5, slowPotency: attackSpeedReduceToSlowPotency(0.35) },
  },
};

export default def;
