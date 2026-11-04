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

function zoneSpot(
  id: ZoneId,
  label: string,
  x: number,
  y: number,
): WorldMapSpotDef {
  return { id, kind: "zone", label, x, y, zoneId: id };
}

/**
 * Якоря подогнаны под `assets/art/backgrounds/map_01.*` (2580x1440).
 * При смене арта / ручной правке подкрути x/y.
 *
 * Нумерация якорей = красные метки на референсе карты:
 * 1 ведьмин дом … 18 алтарь Уны. Плюс хаб "Город" и регион "Северная дорога".
 */
export const WORLD_MAP_SPOTS: readonly WorldMapSpotDef[] = [
  { id: "town", kind: "town", label: "Город", x: 0.5, y: 0.46 },
  zoneSpot("north_road", "Северная дорога", 0.69, 0.36),
  // 1
  zoneSpot("witch_house", "Ведьмин дом", 0.11, 0.16),
  // 2
  zoneSpot("crossing", "Переправа", 0.6, 0.44),
  // 3
  zoneSpot("grey_fang_foothills", "Предгорье Седого клыка", 0.48, 0.14),
  // 4
  zoneSpot("oak_grove", "Дубовая роща", 0.7, 0.5),
  // 5
  zoneSpot("black_forest", "Черный лес", 0.24, 0.24),
  // 6
  zoneSpot("miles_farm", "Ферма Майлза", 0.36, 0.46),
  // 7
  zoneSpot("mire", "Топь", 0.44, 0.84),
  // 8
  zoneSpot("flooded_barn", "Затопленный амбар", 0.54, 0.72),
  // 9
  zoneSpot("willheim", "Уиллхейм", 0.82, 0.64),
  // 10
  zoneSpot("stone_cliff", "Каменный утёс", 0.88, 0.48),
  // 11
  zoneSpot("cursed_mine", "Проклятая шахта", 0.92, 0.24),
  // 12
  zoneSpot("south_meadow", "Южная поляна", 0.88, 0.88),
  // 13
  zoneSpot("bog_fangs", "Болотные клыки", 0.14, 0.88),
  // 14
  zoneSpot("skull_stone", "Череп-камень", 0.32, 0.9),
  // 15
  zoneSpot("ruined_temple", "Разрушенный храм", 0.18, 0.62),
  // 16
  zoneSpot("abandoned_house", "Брошенный дом", 0.42, 0.32),
  // 17
  zoneSpot("aria_hut", "Хижина Арии", 0.2, 0.78),
  // 18
  zoneSpot("una_altar", "Алтарь Уны", 0.3, 0.76),
];
