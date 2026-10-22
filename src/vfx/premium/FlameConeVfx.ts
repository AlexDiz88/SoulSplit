import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

function noise1(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Турбулентный язык пламени (полигон с волнистыми краями). */
function drawFlameTongue(
  g: Graphics,
  ox: number,
  oy: number,
  dir: number,
  length: number,
  width: number,
  time: number,
  color: number,
  alpha: number,
): void {
  const steps = 10;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const dist = length * t;
    const taper = Math.sin(t * Math.PI) * (1 - t * 0.15);
    const wobble =
      Math.sin(t * 9 + time * 14 + dir * 3) * width * 0.22 +
      Math.sin(t * 17 + time * 21) * width * 0.1;
    const half = width * taper + wobble;
    const px = ox + Math.cos(dir) * dist;
    const py = oy + Math.sin(dir) * dist;
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir);
    left.push({ x: px + nx * half, y: py + ny * half });
    right.push({ x: px - nx * half, y: py - ny * half });
  }
  g.moveTo(left[0]!.x, left[0]!.y);
  for (const p of left) g.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i]!.x, right[i]!.y);
  g.closePath().fill({ color, alpha });
}

/**
 * Раскалённый пол клетки: заливка плитки + кайма + угольки по углам.
 * Вместо маленьких "UI-квадратов" внутри ячейки.
 */
function drawHeatFloor(
  g: Graphics,
  x: number,
  y: number,
  cellSize: number,
  intensity: number,
  pulse: number,
): void {
  if (intensity <= 0.01) return;
  const half = cellSize * 0.5 - 3;
  const a = Math.min(1, intensity);

  // тёмный жар по всей плите
  g.roundRect(x - half, y - half, half * 2, half * 2, 10).fill({
    color: 0x3a0a04,
    alpha: (0.22 + pulse * 0.08) * a,
  });
  // оранжевая заливка пола
  g.roundRect(x - half + 3, y - half + 3, half * 2 - 6, half * 2 - 6, 8).fill({
    color: 0xff4010,
    alpha: (0.16 + pulse * 0.14) * a,
  });
  // пятно жара ближе к земле
  g.ellipse(x, y + half * 0.18, half * 0.78, half * 0.52).fill({
    color: 0xffaa40,
    alpha: (0.12 + pulse * 0.18) * a,
  });
  // кайма по краю клетки
  g.roundRect(x - half, y - half, half * 2, half * 2, 10).stroke({
    color: 0xffb048,
    width: 2.2,
    alpha: (0.45 + pulse * 0.4) * a,
  });
  // внутренний тонкий контур
  g.roundRect(x - half + 5, y - half + 5, half * 2 - 10, half * 2 - 10, 7).stroke({
    color: 0xff6020,
    width: 1.2,
    alpha: (0.25 + pulse * 0.2) * a,
  });
  // угольки в углах
  const inset = half * 0.78;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    g.circle(x + sx * inset, y + sy * inset, 2 + pulse * 1.5).fill({
      color: 0xffcc66,
      alpha: 0.35 * a * (0.5 + pulse * 0.5),
    });
  }
}

/**
 * Премиум «Конус огня»: telegraph → дыхание пламени → угли/дым → ожоги клеток.
 */
export async function playFlameConeVfx(
  layer: Container,
  tweens: TweenManager,
  origin: Pt,
  targets: Pt[],
  screenShake?: (amp: number, dur: number) => void,
  cellSize = 124,
): Promise<void> {
  if (!targets.length) return;

  const root = new Container();
  root.eventMode = "none";
  layer.addChild(root);

  const glowLayer = new Container();
  glowLayer.blendMode = "add";
  glowLayer.filters = [new BlurFilter({ strength: 4, quality: 4 })];
  root.addChild(glowLayer);

  const mid = new Container();
  root.addChild(mid);
  const crisp = new Container();
  root.addChild(crisp);

  // центр конуса и угол охвата
  let cx = 0;
  let cy = 0;
  for (const p of targets) {
    cx += p.x;
    cy += p.y;
  }
  cx /= targets.length;
  cy /= targets.length;
  const baseDir = Math.atan2(cy - origin.y, cx - origin.x);

  let minA = Infinity;
  let maxA = -Infinity;
  let maxDist = 0;
  for (const p of targets) {
    const a = Math.atan2(p.y - origin.y, p.x - origin.x);
    let da = a - baseDir;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    minA = Math.min(minA, da);
    maxA = Math.max(maxA, da);
    maxDist = Math.max(maxDist, Math.hypot(p.x - origin.x, p.y - origin.y));
  }
  minA -= 0.12;
  maxA += 0.12;
  maxDist += 36;

  // ——— Telegraph: раскалённый пол задетых клеток + веер ———
  const telegraph = new Graphics();
  crisp.addChild(telegraph);
  const floorLayer = new Container();
  // под языками пламени, чтобы жар читался как пол клетки
  root.addChildAt(floorLayer, 0);
  const cellMarks: Graphics[] = [];
  for (let i = 0; i < targets.length; i++) {
    const m = new Graphics();
    floorLayer.addChild(m);
    cellMarks.push(m);
  }

  await tweens.to(0.32, (t) => {
    telegraph.clear();
    // веер предупреждения
    const spread = lerp(0.15, 1, t);
    const a0 = baseDir + minA * spread;
    const a1 = baseDir + maxA * spread;
    const r = maxDist * (0.35 + t * 0.65);
    telegraph.moveTo(origin.x, origin.y);
    telegraph.arc(origin.x, origin.y, r, a0, a1);
    telegraph.closePath().fill({ color: 0xff4020, alpha: 0.1 * t });
    telegraph.moveTo(origin.x, origin.y);
    telegraph.arc(origin.x, origin.y, r, a0, a1);
    telegraph.stroke({ color: 0xffaa44, width: 2, alpha: 0.5 * t });

    targets.forEach((p, i) => {
      const m = cellMarks[i]!;
      m.clear();
      const pulse = 0.55 + Math.sin(t * 14 + i * 1.7) * 0.45;
      drawHeatFloor(m, p.x, p.y, cellSize, t, pulse);
    });
  });

  // ——— Заряд у рта ———
  const mouthGlow = new Sprite(TEX.fireGlow());
  mouthGlow.anchor.set(0.5);
  mouthGlow.position.set(origin.x, origin.y);
  glowLayer.addChild(mouthGlow);

  await tweens.to(0.22, (t) => {
    mouthGlow.scale.set(0.25 + t * 0.7);
    mouthGlow.alpha = 0.4 + t * 0.6;
  });

  screenShake?.(5, 0.08);

  // ——— Основной выдох пламени ———
  const flameGfx = new Graphics();
  mid.addChild(flameGfx);
  const coreGfx = new Graphics();
  coreGfx.blendMode = "add";
  mid.addChild(coreGfx);

  type Ember = {
    s: Sprite;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
    spin: number;
  };
  const embers: Ember[] = [];
  type Smoke = { s: Sprite; x: number; y: number; vx: number; vy: number; life: number; max: number };
  const smokes: Smoke[] = [];

  const coneGlow = new Sprite(TEX.fireGlow());
  coneGlow.anchor.set(0.2, 0.5);
  coneGlow.position.set(origin.x, origin.y);
  coneGlow.rotation = baseDir;
  glowLayer.addChild(coneGlow);

  const breathDur = 0.75;
  await tweens.to(breathDur, (rawT) => {
    // ease-out затем удержание
    const t = rawT < 0.55 ? easeOutCubic(rawT / 0.55) : 1 - (rawT - 0.55) * 0.35;
    const reach = maxDist * Math.min(1, rawT / 0.45);
    const time = rawT * 3.2;

    flameGfx.clear();
    coreGfx.clear();

    // внешний тёмный жар
    const outerW = 38 + reach * 0.08;
    drawFlameTongue(
      flameGfx,
      origin.x,
      origin.y,
      baseDir,
      reach,
      outerW * (maxA - minA + 0.4) * 1.8,
      time,
      0x8a1208,
      0.35 * t,
    );

    // средний оранжевый слой — плотные турбулентные языки
    const tongues = 9;
    for (let i = 0; i < tongues; i++) {
      const u = i / (tongues - 1);
      const ang = baseDir + lerp(minA, maxA, u) + Math.sin(time * 2 + i) * 0.03;
      const len = reach * (0.78 + noise1(i * 3.1 + rawT) * 0.3);
      const w = 22 + (1 - Math.abs(u - 0.5) * 2) * 28;
      drawFlameTongue(flameGfx, origin.x, origin.y, ang, len, w, time + i, 0xe83810, 0.5 * t);
      drawFlameTongue(
        flameGfx,
        origin.x,
        origin.y,
        ang + Math.sin(time + i) * 0.05,
        len * 0.94,
        w * 0.72,
        time * 1.3 + i,
        0xff6a18,
        0.55 * t,
      );
      drawFlameTongue(
        flameGfx,
        origin.x,
        origin.y,
        ang - Math.sin(time * 1.4 + i) * 0.04,
        len * 0.85,
        w * 0.45,
        time * 1.7 + i * 2,
        0xffa040,
        0.45 * t,
      );
    }

    // яркое ядро
    for (let i = 0; i < 6; i++) {
      const u = 0.1 + (i / 5) * 0.8;
      const ang = baseDir + lerp(minA, maxA, u);
      const len = reach * (0.58 + noise1(i + 9) * 0.22);
      drawFlameTongue(coreGfx, origin.x, origin.y, ang, len, 14 + i * 2, time * 1.5, 0xffd060, 0.6 * t);
      drawFlameTongue(coreGfx, origin.x, origin.y, ang, len * 0.72, 7, time * 2, 0xfff2c0, 0.45 * t);
      drawFlameTongue(coreGfx, origin.x, origin.y, ang, len * 0.45, 3.5, time * 2.4, 0xffffff, 0.4 * t);
    }

    // веер-заливка между крайними лучами
    const a0 = baseDir + minA;
    const a1 = baseDir + maxA;
    flameGfx.moveTo(origin.x, origin.y);
    flameGfx.arc(origin.x, origin.y, reach * 0.95, a0, a1);
    flameGfx.closePath().fill({ color: 0xff6020, alpha: 0.1 * t });

    coneGlow.rotation = baseDir;
    coneGlow.scale.set(reach / 40, (maxA - minA) * 2.2 + 0.8);
    coneGlow.alpha = 0.35 * t;

    mouthGlow.scale.set(0.5 + Math.sin(rawT * 30) * 0.1);
    mouthGlow.alpha = 0.7 * t;

    // угли
    if (rawT < 0.85 && Math.random() < 0.7) {
      const u = Math.random();
      const ang = baseDir + lerp(minA, maxA, u) + (Math.random() - 0.5) * 0.15;
      const dist = reach * (0.3 + Math.random() * 0.7);
      const s = new Sprite(TEX.ember());
      s.anchor.set(0.5);
      s.blendMode = "add";
      s.scale.set(0.15 + Math.random() * 0.25);
      crisp.addChild(s);
      embers.push({
        s,
        x: origin.x + Math.cos(ang) * dist,
        y: origin.y + Math.sin(ang) * dist,
        vx: Math.cos(ang) * (40 + Math.random() * 80) + (Math.random() - 0.5) * 40,
        vy: Math.sin(ang) * (40 + Math.random() * 80) - 40 - Math.random() * 60,
        life: 0,
        max: 0.4 + Math.random() * 0.5,
        spin: (Math.random() - 0.5) * 8,
      });
    }

    // дым
    if (rawT > 0.2 && Math.random() < 0.35) {
      const u = Math.random();
      const ang = baseDir + lerp(minA, maxA, u);
      const dist = reach * (0.5 + Math.random() * 0.5);
      const s = new Sprite(TEX.smoke());
      s.anchor.set(0.5);
      s.scale.set(0.3 + Math.random() * 0.35);
      crisp.addChild(s);
      smokes.push({
        s,
        x: origin.x + Math.cos(ang) * dist,
        y: origin.y + Math.sin(ang) * dist,
        vx: (Math.random() - 0.5) * 25,
        vy: -30 - Math.random() * 40,
        life: 0,
        max: 0.7 + Math.random() * 0.4,
      });
    }

    const dt = 1 / 60;
    for (const e of embers) {
      e.life += dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy -= 50 * dt;
      e.s.position.set(e.x, e.y);
      e.s.rotation += e.spin * dt;
      e.s.alpha = Math.max(0, 1 - e.life / e.max);
      e.s.scale.set(0.12 + (1 - e.life / e.max) * 0.2);
    }
    for (const s of smokes) {
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.s.position.set(s.x, s.y);
      s.s.alpha = Math.max(0, 0.45 * (1 - s.life / s.max));
      s.s.scale.set(0.35 + (s.life / s.max) * 0.5);
    }

    // жар пола нарастает, когда фронт пламени доходит до клетки
    targets.forEach((p, i) => {
      const m = cellMarks[i]!;
      const dist = Math.hypot(p.x - origin.x, p.y - origin.y);
      const wave = Math.max(0, 1 - Math.abs(dist - reach) / 90);
      const engulfed = reach >= dist - cellSize * 0.35 ? 1 : 0;
      const heat = Math.max(wave, engulfed * 0.85) * t;
      const pulse = 0.5 + Math.sin(rawT * 18 + i) * 0.5;
      m.clear();
      drawHeatFloor(m, p.x, p.y, cellSize, 0.35 + heat * 0.75, pulse);
    });
  });

  screenShake?.(12, 0.2);

  // убираем предупреждающий жар: дальше остаётся выжженный пол
  for (const m of cellMarks) {
    m.clear();
    m.alpha = 0;
  }

  // ——— Вспышки попаданий + выжженный пол клетки ———
  const halfCell = cellSize * 0.5 - 3;
  const impacts: Promise<void>[] = targets.map(async (p, idx) => {
    await tweens.wait(idx * 0.02);
    const flash = new Sprite(TEX.fireCore());
    flash.anchor.set(0.5);
    flash.position.set(p.x, p.y);
    flash.blendMode = "add";
    glowLayer.addChild(flash);

    const ring = new Graphics();
    crisp.addChild(ring);

    const scorch = new Graphics();
    floorLayer.addChildAt(scorch, 0);

    await tweens.to(0.45, (t) => {
      flash.scale.set(0.55 + t * 1.6);
      flash.alpha = (1 - t) * 0.85;
      ring.clear();
      ring.roundRect(
        p.x - halfCell * (0.7 + t * 0.35),
        p.y - halfCell * (0.7 + t * 0.35),
        halfCell * 2 * (0.7 + t * 0.35),
        halfCell * 2 * (0.7 + t * 0.35),
        10,
      ).stroke({
        color: 0xffcc66,
        width: 3.5 * (1 - t),
        alpha: (1 - t) * 0.85,
      });
      scorch.clear();
      // выжженная плитка
      scorch.roundRect(p.x - halfCell, p.y - halfCell, halfCell * 2, halfCell * 2, 10).fill({
        color: 0x140804,
        alpha: 0.4 * (1 - t * 0.25),
      });
      scorch.ellipse(p.x, p.y + halfCell * 0.12, halfCell * 0.7, halfCell * 0.42).fill({
        color: 0x2a1008,
        alpha: 0.45 * (1 - t * 0.3),
      });
      // угольные крапины по плите
      for (let i = 0; i < 7; i++) {
        const a = noise1(idx * 10 + i) * Math.PI * 2;
        const rr = (0.25 + noise1(idx + i * 3) * 0.55) * halfCell * t;
        scorch.circle(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.85, 1.5 + noise1(i) * 1.2).fill({
          color: 0x1a0c06,
          alpha: 0.55 * (1 - t * 0.4),
        });
      }
    });

    flash.destroy();
    ring.destroy();
    void tweens
      .to(1.1, (t) => {
        scorch.alpha = 1 - t;
      })
      .then(() => scorch.destroy());
  });

  // финальная волна жара
  const shock = new Graphics();
  shock.blendMode = "add";
  crisp.addChild(shock);
  await tweens.to(0.4, (t) => {
    shock.clear();
    const a0 = baseDir + minA;
    const a1 = baseDir + maxA;
    shock.moveTo(origin.x, origin.y);
    shock.arc(origin.x, origin.y, maxDist * (0.6 + t * 0.5), a0, a1);
    shock.stroke({ color: 0xffaa44, width: 4 * (1 - t), alpha: (1 - t) * 0.65 });
  });
  shock.destroy();

  await Promise.all(impacts);

  // cleanup
  flameGfx.destroy();
  coreGfx.destroy();
  mouthGlow.destroy();
  coneGlow.destroy();
  telegraph.destroy();
  for (const m of cellMarks) m.destroy();
  floorLayer.destroy({ children: true });
  for (const e of embers) e.s.destroy();
  for (const s of smokes) s.s.destroy();
  glowLayer.filters = null;
  root.destroy({ children: true });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
