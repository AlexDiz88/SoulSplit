import type { WeaponKind } from "../types";

export const WEAPON_REACH: Record<WeaponKind, number> = {
  melee: 1,
  spear: 2,
  bow: 3,
  staff: 4,
};

export const WEAPON_LABEL: Record<WeaponKind, string> = {
  melee: "Меч",
  spear: "Копьё",
  bow: "Лук",
  staff: "Жезл",
};

export const WEAPON_ORDER: WeaponKind[] = ["melee", "spear", "bow", "staff"];
