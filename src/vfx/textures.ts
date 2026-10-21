import { Texture } from "pixi.js";

/** Кэш процедурных soft-glow текстур (радиальный градиент). */
const cache = new Map<string, Texture>();

function makeRadialCanvas(
  size: number,
  stops: { t: number; color: string }[],
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const s of stops) g.addColorStop(s.t, s.color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export function glowTexture(key: string, size: number, stops: { t: number; color: string }[]): Texture {
  const id = `${key}_${size}`;
  let tex = cache.get(id);
  if (tex) return tex;
  tex = Texture.from(makeRadialCanvas(size, stops));
  cache.set(id, tex);
  return tex;
}

export const TEX = {
  iceGlow: () =>
    glowTexture("iceGlow", 128, [
      { t: 0, color: "rgba(230, 250, 255, 1)" },
      { t: 0.25, color: "rgba(140, 220, 255, 0.85)" },
      { t: 0.55, color: "rgba(80, 170, 230, 0.35)" },
      { t: 1, color: "rgba(40, 100, 180, 0)" },
    ]),
  iceCore: () =>
    glowTexture("iceCore", 64, [
      { t: 0, color: "rgba(255, 255, 255, 1)" },
      { t: 0.35, color: "rgba(200, 240, 255, 0.9)" },
      { t: 1, color: "rgba(120, 200, 255, 0)" },
    ]),
  fireGlow: () =>
    glowTexture("fireGlow", 128, [
      { t: 0, color: "rgba(255, 250, 220, 1)" },
      { t: 0.2, color: "rgba(255, 180, 60, 0.95)" },
      { t: 0.5, color: "rgba(255, 80, 20, 0.55)" },
      { t: 0.8, color: "rgba(180, 20, 0, 0.2)" },
      { t: 1, color: "rgba(40, 0, 0, 0)" },
    ]),
  fireCore: () =>
    glowTexture("fireCore", 64, [
      { t: 0, color: "rgba(255, 255, 255, 1)" },
      { t: 0.3, color: "rgba(255, 230, 140, 0.95)" },
      { t: 0.7, color: "rgba(255, 100, 30, 0.4)" },
      { t: 1, color: "rgba(255, 40, 0, 0)" },
    ]),
  ember: () =>
    glowTexture("ember", 32, [
      { t: 0, color: "rgba(255, 220, 120, 1)" },
      { t: 0.4, color: "rgba(255, 100, 30, 0.8)" },
      { t: 1, color: "rgba(80, 10, 0, 0)" },
    ]),
  smoke: () =>
    glowTexture("smoke", 96, [
      { t: 0, color: "rgba(40, 30, 28, 0.55)" },
      { t: 0.45, color: "rgba(30, 25, 22, 0.25)" },
      { t: 1, color: "rgba(10, 8, 8, 0)" },
    ]),
  frostMist: () =>
    glowTexture("frostMist", 96, [
      { t: 0, color: "rgba(200, 235, 255, 0.55)" },
      { t: 0.5, color: "rgba(140, 200, 240, 0.22)" },
      { t: 1, color: "rgba(80, 140, 200, 0)" },
    ]),
  metalGlow: () =>
    glowTexture("metalGlow", 128, [
      { t: 0, color: "rgba(255, 245, 210, 1)" },
      { t: 0.3, color: "rgba(220, 190, 130, 0.75)" },
      { t: 0.65, color: "rgba(140, 120, 80, 0.3)" },
      { t: 1, color: "rgba(60, 50, 30, 0)" },
    ]),
  bloodGlow: () =>
    glowTexture("bloodGlow", 96, [
      { t: 0, color: "rgba(255, 80, 90, 0.95)" },
      { t: 0.35, color: "rgba(180, 20, 40, 0.7)" },
      { t: 0.7, color: "rgba(90, 10, 20, 0.3)" },
      { t: 1, color: "rgba(30, 0, 5, 0)" },
    ]),
  shadowGlow: () =>
    glowTexture("shadowGlow", 128, [
      { t: 0, color: "rgba(180, 140, 220, 0.9)" },
      { t: 0.35, color: "rgba(90, 50, 130, 0.55)" },
      { t: 0.7, color: "rgba(30, 10, 50, 0.25)" },
      { t: 1, color: "rgba(0, 0, 0, 0)" },
    ]),
  goldGlow: () =>
    glowTexture("goldGlow", 128, [
      { t: 0, color: "rgba(255, 240, 180, 1)" },
      { t: 0.3, color: "rgba(255, 200, 80, 0.75)" },
      { t: 0.65, color: "rgba(180, 120, 40, 0.3)" },
      { t: 1, color: "rgba(80, 40, 10, 0)" },
    ]),
};
