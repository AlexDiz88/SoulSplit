import { CURRENT_HUB_CITY_NAME } from "../meta/hubCity";
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
 * Якоря регионов на карте провинции. Плюс хаб (id `town`, имя CURRENT_HUB_CITY_NAME).
 * Координаты можно править вручную.
 */
export const WORLD_MAP_SPOTS: readonly WorldMapSpotDef[] = [
  { id: "town", kind: "town", label: CURRENT_HUB_CITY_NAME, x: 0.495, y: 0.46 },
  zoneSpot("witch_house", "Ведьмин дом", 0.29, 0.13),
  zoneSpot("black_forest", "Черный лес", 0.33, 0.22),
  zoneSpot("flooded_barn", "Затопленный амбар", 0.11, 0.23),
  zoneSpot("hart_manor", "Поместье Харт", 0.06, 0.43),
  zoneSpot("miles_farm", "Ферма Майлза", 0.21, 0.37),
  zoneSpot("grey_fang_foothills", "Предгорье Седого клыка", 0.5, 0.19),
  zoneSpot("north_road", "Северная дорога", 0.69, 0.36),
  zoneSpot("northville", "Нортвилл", 0.74, 0.21),
  zoneSpot("oak_grove", "Дубовая роща", 0.61, 0.53),
  zoneSpot("crossing", "Переправа", 0.64, 0.65),
  zoneSpot("riverholt", "Риверхолт", 0.54, 0.91),
  zoneSpot("quarry", "Каменоломня", 0.56, 0.71),
  zoneSpot("willheim", "Уиллхейм", 0.77, 0.56),
  zoneSpot("moon_lake", "Лунное озеро", 0.84, 0.77),
  zoneSpot("cursed_mine", "Проклятая шахта", 0.92, 0.27),
  zoneSpot("stone_cliff", "Каменный утёс", 0.92, 0.59),
  zoneSpot("outpost", "Аванпост", 0.69, 0.8),
  zoneSpot("south_hills", "Южные холмы", 0.88, 0.88),
  zoneSpot("aria_hut", "Хижина Арии", 0.4, 0.86),
  zoneSpot("mire", "Топь", 0.34, 0.76),
  zoneSpot("ruins", "Руины", 0.25, 0.65),
  zoneSpot("karos_ruined_temple", "Разрушенный храм Кароса", 0.07, 0.67),
  zoneSpot("bog_fangs", "Болотные клыки", 0.12, 0.8),
];
