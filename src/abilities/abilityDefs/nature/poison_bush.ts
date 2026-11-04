import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "poison_bush",
  name: "Ядовитый куст",
  aspectId: "nature",
  status: "одобрено",
  icon: "poison_bush.png",
  hook: "клик пустой, яд 8/с на 4 с на 4 диагоналях",
  description: "Отмечает клетку. На четырёх диагоналях всходит ядовитый куст: враги там получают 8 ед. урона ядом в секунду в течение 4 сек. Клетка клика без эффекта.",
  cooldown: 7.5,
  manaCost: 36,
  damage: 0,
  application: "зона",
  zoneLabel: "клик без эффекта, яд на четырёх диагональных клетках",
  effect: "урон, дебафф, зона-поле",
  numbers: [
    "каждая диагональ: яд 8 в секунду, 4 с"
  ],
  zone: {
    anchor: "клик",
    damage: "одинаковый",
    rows: [
      [".", ".", ".", "."],
      [".", "A", ".", "B"],
      [".", ".", "+", "."],
      [".", "C", ".", "D"]
    ],
    notes: [
      "`+` — точка клика, без эффекта",
      "A — яд 8/с на 4 с, (dcol −1, drow −1)",
      "B — яд 8/с на 4 с, (dcol +1, drow −1)",
      "C — яд 8/с на 4 с, (dcol −1, drow +1)",
      "D — яд 8/с на 4 с, (dcol +1, drow +1)"
    ],
  },
  combat: {
    aspect: "nature",
    glyph: "🥀",
    targetMode: "zone",
    range: "any",
    reach: 4,
    effects: { poisonPerSec: 8, poisonDuration: 4 },
  },
};

export default def;
