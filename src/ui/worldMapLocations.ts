import { CURRENT_HUB_CITY_NAME } from "../meta/hubCity";
import type { RegionId } from "../meta/gameState";

/** Точки на карте мира. Координаты в долях исходного арта (0..1). */

export type WorldMapSpotId = "town" | RegionId;

export type WorldMapSpotKind = "town" | "region";

export interface WorldMapSpotDef {
  id: WorldMapSpotId;
  kind: WorldMapSpotKind;
  label: string;
  /** Центр кнопки по X (доля ширины арта). */
  x: number;
  /** Центр кнопки по Y (доля высоты арта). */
  y: number;
  /** Для kind === "region". */
  regionId?: RegionId;
}

function regionSpot(
  id: RegionId,
  label: string,
  x: number,
  y: number,
): WorldMapSpotDef {
  return { id, kind: "region", label, x, y, regionId: id };
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
  regionSpot("witch_house", "Ведьмин дом", 0.29, 0.13),
  regionSpot("black_forest", "Черный лес", 0.33, 0.22),
  regionSpot("flooded_barn", "Затопленный амбар", 0.11, 0.23),
  regionSpot("hart_manor", "Поместье Харт", 0.06, 0.43),
  regionSpot("miles_farm", "Ферма Майлза", 0.21, 0.37),
  regionSpot("grey_fang_foothills", "Предгорье Седого клыка", 0.5, 0.19),
  regionSpot("north_road", "Северная дорога", 0.69, 0.36),
  regionSpot("northville", "Нортвилл", 0.74, 0.21),
  regionSpot("oak_grove", "Дубовая роща", 0.61, 0.53),
  regionSpot("crossing", "Переправа", 0.64, 0.65),
  regionSpot("riverholt", "Риверхолт", 0.54, 0.91),
  regionSpot("quarry", "Каменоломня", 0.56, 0.71),
  regionSpot("willheim", "Уиллхейм", 0.77, 0.56),
  regionSpot("moon_lake", "Лунное озеро", 0.84, 0.77),
  regionSpot("cursed_mine", "Проклятая шахта", 0.92, 0.27),
  regionSpot("stone_cliff", "Каменный утёс", 0.92, 0.59),
  regionSpot("outpost", "Аванпост", 0.69, 0.8),
  regionSpot("south_hills", "Южные холмы", 0.88, 0.88),
  regionSpot("aria_hut", "Хижина Арии", 0.4, 0.86),
  regionSpot("mire", "Топь", 0.34, 0.76),
  regionSpot("ruins", "Руины", 0.25, 0.65),
  regionSpot("karos_ruined_temple", "Разрушенный храм Кароса", 0.07, 0.67),
  regionSpot("bog_fangs", "Болотные клыки", 0.12, 0.8),
];
