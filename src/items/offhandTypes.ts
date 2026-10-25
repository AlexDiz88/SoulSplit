import type { AffixFamily } from "../stats/statIds";
import type { ItemGrip } from "./grip";

/**
 * Предметы только для левой руки (не оружие).
 * Арт: `assets/art/items/{art}_{rarity}_{n}.png`
 */
export type OffhandTypeId = "shield" | "tome" | "orb" | "relic" | "quiver";

export interface OffhandTypeDef {
  id: OffhandTypeId;
  name: string;
  /** Prefixe файла арта в lowercase. */
  art: string;
  grip: "offhand";
  /** Семьи аффиксов при генерации этого типа. */
  families: readonly AffixFamily[];
}

export const OFFHAND_TYPES: readonly OffhandTypeDef[] = [
  {
    id: "shield",
    name: "Щит",
    art: "shield",
    grip: "offhand",
    families: ["defense", "resource"],
  },
  {
    id: "tome",
    name: "Том",
    art: "tome",
    grip: "offhand",
    families: ["offense", "tempo", "aspect", "resource"],
  },
  {
    id: "orb",
    name: "Сфера",
    art: "orb",
    grip: "offhand",
    families: ["resource", "offense", "aspect"],
  },
  {
    id: "relic",
    name: "Реликвия",
    art: "relic",
    grip: "offhand",
    families: ["offense", "tempo", "aspect", "defense", "resource"],
  },
  {
    id: "quiver",
    name: "Колчан",
    art: "quiver",
    grip: "offhand",
    families: ["offense", "tempo"],
  },
];

export const OFFHAND_TYPE_BY_ID: Record<OffhandTypeId, OffhandTypeDef> = Object.fromEntries(
  OFFHAND_TYPES.map((t) => [t.id, t]),
) as Record<OffhandTypeId, OffhandTypeDef>;

export function isOffhandTypeId(value: string): value is OffhandTypeId {
  return value in OFFHAND_TYPE_BY_ID;
}

export function offhandGrip(_id?: OffhandTypeId): ItemGrip {
  return "offhand";
}
