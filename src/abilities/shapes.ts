import type { GridPos } from "../types";

export const GRID_SIZE = 4;

export function inBounds(pos: GridPos): boolean {
  return pos.col >= 0 && pos.col < GRID_SIZE && pos.row >= 0 && pos.row < GRID_SIZE;
}

export function neighbors(pos: GridPos): GridPos[] {
  const out: GridPos[] = [];
  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (dc === 0 && dr === 0) continue;
      const p = { col: pos.col + dc, row: pos.row + dr };
      if (inBounds(p)) out.push(p);
    }
  }
  return out;
}

export function blastCells(center: GridPos): GridPos[] {
  return [center, ...neighbors(center).filter((p) => Math.abs(p.col - center.col) + Math.abs(p.row - center.row) <= 1)];
}

/** Дыхание дракона: клик в ближнем ряду (полный урон) + до 3 клеток рядом в ряду выше (сниженный). За краем сетки - игнор. */
export function dragonBreathCells(origin: GridPos): { pos: GridPos; full: boolean }[] {
  const out: { pos: GridPos; full: boolean }[] = [];
  if (inBounds(origin)) out.push({ pos: { ...origin }, full: true });
  const above = origin.row - 1;
  for (let dc = -1; dc <= 1; dc++) {
    const pos = { col: origin.col + dc, row: above };
    if (inBounds(pos)) out.push({ pos, full: false });
  }
  return out;
}
