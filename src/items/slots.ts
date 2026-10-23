export type EquipSlotId =
  | "head"
  | "chest"
  | "neck"
  | "shoulders"
  | "hands"
  | "ring1"
  | "ring2"
  | "waist"
  | "legs"
  | "feet"
  | "trinket"
  | "mainhand"
  | "offhand";

export const SLOT_LABEL: Record<EquipSlotId, string> = {
  head: "Голова",
  chest: "Туловище",
  neck: "Шея",
  shoulders: "Плечи",
  hands: "Перчатки",
  ring1: "Палец (1)",
  ring2: "Палец (2)",
  waist: "Пояс",
  legs: "Ноги",
  feet: "Обувь",
  trinket: "Аксессуар",
  mainhand: "Основная рука",
  offhand: "Левая рука",
};

export const ALL_EQUIP_SLOTS: EquipSlotId[] = [
  "head",
  "chest",
  "neck",
  "shoulders",
  "hands",
  "ring1",
  "ring2",
  "waist",
  "legs",
  "feet",
  "trinket",
  "mainhand",
  "offhand",
];

/** Слоты, на которых может быть schoolTag. */
export const SCHOOL_ITEM_SLOTS: ReadonlySet<EquipSlotId> = new Set(["mainhand", "offhand", "trinket"]);

export function isWeaponSlot(slot: EquipSlotId): boolean {
  return slot === "mainhand" || slot === "offhand";
}

export function isSchoolItemSlot(slot: EquipSlotId): boolean {
  return SCHOOL_ITEM_SLOTS.has(slot);
}
