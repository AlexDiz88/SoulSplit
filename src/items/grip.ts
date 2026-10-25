/** Куда предмет можно надеть на руки. */
export type ItemGrip = "mainhand" | "offhand" | "either" | "twoHand";

export const GRIP_LABEL: Record<ItemGrip, string> = {
  mainhand: "Основная рука",
  offhand: "Левая рука",
  either: "Любая рука",
  twoHand: "Обе руки",
};

/** Множитель урона автоатак оружием в левой руке. */
export const OFFHAND_WEAPON_DAMAGE_MULT = 0.75;
