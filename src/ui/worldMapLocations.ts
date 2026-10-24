import type { ZoneId } from "../meta/gameState";

/** Точки на карте мира. Координаты в долях исходного арта (0..1). */

export type WorldMapSpotId = "town" | ZoneId;

export type WorldMapSpotKind = "town" | "zone";

export interface WorldMapSpotDef {
  id: WorldMapSpotId;
  kind: WorldMapSpotKind;
  label: string;
  /** Центр кнопки по X (доля ширины арта). */
  x: number;
  /** Центр кнопки по Y (доля высоты арта). */
  y: number;
  /** Для kind === "zone". */
  zoneId?: ZoneId;
}

/**
 * Якоря подогнаны под `assets/art/backgrounds/map_01.*` (2580x1440).
 * При смене арта подкрути x/y.
 */
export const WORLD_MAP_SPOTS: readonly WorldMapSpotDef[] = [
  { id: "town", kind: "town", label: "Город", x: 0.5, y: 0.46 },
  {
    id: "outskirts",
    kind: "zone",
    label: "Северная дорога",
    x: 0.69,
    y: 0.36,
    zoneId: "outskirts",
  },
  {
    id: "ruins",
    kind: "zone",
    label: "Руины",
    x: 0.25,
    y: 0.65,
    zoneId: "ruins",
  },
];
