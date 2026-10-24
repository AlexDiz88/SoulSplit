/** Точки зданий на карте города. Координаты в долях исходного арта (0..1). */

export type HubLocationId =
  | "market"
  | "town_hall"
  | "forge"
  | "tavern"
  | "city_gate";

export interface HubLocationDef {
  id: HubLocationId;
  label: string;
  /** Центр кнопки по X (доля ширины арта). */
  x: number;
  /** Центр кнопки по Y (доля высоты арта). */
  y: number;
}

/**
 * Якоря подогнаны под `assets/art/backgrounds/town.*` (2595x1440).
 * При смене арта подкрути x/y.
 */
export const HUB_LOCATIONS: readonly HubLocationDef[] = [
  { id: "tavern", label: "Таверна", x: 0.46, y: 0.5 },
  { id: "city_gate", label: "Врата", x: 0.2, y: 0.38 },
  { id: "town_hall", label: "Ратуша", x: 0.83, y: 0.47 },
  { id: "forge", label: "Кузница", x: 0.62, y: 0.78 },
  { id: "market", label: "Рынок", x: 0.44, y: 0.78 },
];

export interface CoverLayout {
  /** Левый край видимого арта в контейнере (px). */
  offsetX: number;
  offsetY: number;
  /** Размер отрисованного арта (px). */
  drawW: number;
  drawH: number;
}

/** Та же математика, что у CSS `object-fit: cover` + `object-position: center center`. */
export function coverLayout(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): CoverLayout {
  const scale = Math.max(containerW / imageW, containerH / imageH);
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  return {
    offsetX: (containerW - drawW) / 2,
    offsetY: (containerH - drawH) / 2,
    drawW,
    drawH,
  };
}

export function projectLocation(
  loc: HubLocationDef,
  layout: CoverLayout,
): { left: number; top: number } {
  return {
    left: layout.offsetX + loc.x * layout.drawW,
    top: layout.offsetY + loc.y * layout.drawH,
  };
}
