import type { AbilityCatalogDef } from "../types";

const def: AbilityCatalogDef = {
  id: "grave_whisper",
  name: "Шёпот могилы",
  aspectId: "necromancy",
  status: "черновик",
  icon: "grave_whisper.png",
  hook:
    "каст 2.5 с, кд 14 с: 14 урона смерти всем + урон атаки всех врагов -30% на 4 с",
  description:
    "Наклоняется к земле и шепчет имена, которые врагам слышать не положено. Слабый удар смертью бьёт всех сразу, а их руки дрожат: урон атаки падает на время.",
  cooldown: 14,
  manaCost: 52,
  castTime: 2.5,
  damage: 14,
  application: "все враги",
  zoneLabel: "нет",
  effect: "урон, дебафф",
  numbers: [
    "14 урона смерти каждому врагу",
    "время каста 2.5 с",
    "урон атаки всех врагов снижен на 30% на 4 с",
  ],
};

export default def;