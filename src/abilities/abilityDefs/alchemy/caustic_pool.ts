import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "caustic_pool",
  name: "Едкая лужа",
  aspectId: "alchemy",
  status: "черновик",
  icon: "caustic_pool.png",
  hook: "лужа на клике: 30 при появлении + 8/с 4 с на клетке",
  description: "На выбранную клетку выливается реагент: лужа кипит и жжёт каждого врага, который на ней стоит.",
  cooldown: 7,
  manaCost: 30,
  damage: 30,
  application: "зона",
  zoneLabel: "1–4",
  effect: "урон, зона-поле",
  numbers: [
    "30 урона кислотой при входе эффекта (враг на клетке в момент появления лужи)",
    "8 урона кислотой в секунду в течение 4 с, пока враг стоит на этой клетке"
  ],
  zone: {
    anchor: "клик",
    damage: "одинаковый",
    rows: [
      [".", ".", ".", "."],
      [".", ".", "X", "."],
      [".", ".", ".", "."],
      [".", ".", ".", "."]
    ],
    notes: [
      "`X` — точка клика, лужа, (dcol 0, drow 0)"
    ],
  },
};

export default def;
