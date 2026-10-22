import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

/** Контур heater-щита: плоский верх, остриё вниз (как у иконки frost_shield). */
export function heaterShieldOutline(cx: number, cy: number, w: number, h: number): Pt[] {
  return [
    { x: cx - w * 0.92, y: cy - h * 0.52 },
    { x: cx - w * 0.35, y: cy - h * 0.58 },
    { x: cx + w * 0.35, y: cy - h * 0.58 },
    { x: cx + w * 0.92, y: cy - h * 0.52 },
    { x: cx + w * 1.02, y: cy - h * 0.12 },
    { x: cx + w * 0.88, y: cy + h * 0.28 },
    { x: cx + w * 0.42, y: cy + h * 0.55 },
    { x: cx, y: cy + h * 0.72 },
    { x: cx - w * 0.42, y: cy + h * 0.55 },
    { x: cx - w * 0.88, y: cy + h * 0.28 },
    { x: cx - w * 1.02, y: cy - h * 0.12 },
  ];
}

export function traceHeaterShield(g: Graphics, cx: number, cy: number, w: number, h: number): Graphics {
  const pts = heaterShieldOutline(cx, cy, w, h);
  const first = pts[0]!;
  g.moveTo(first.x, first.y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!;
    g.lineTo(p.x, p.y);
  }
  return g.closePath();
}

/** Точки по контуру щита (для кристаллов / снежинок). */
function sampleHeaterRim(cx: number, cy: number, w: number, h: number, count: number): Pt[] {
  const pts = heaterShieldOutline(cx, cy, w, h);
  const out: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < count; i++) {
    const t = (i / count) * n;
    const i0 = Math.floor(t) % n;
    const i1 = (i0 + 1) % n;
    const f = t - Math.floor(t);
    const a = pts[i0]!;
    const b = pts[i1]!;
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  }
  return out;
}

function rimNormal(cx: number, cy: number, p: Pt): Pt {
  const dx = p.x - cx;
  const dy = p.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function drawSnowflake(g: Graphics, size: number, color: number, alpha: number): void {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    g.moveTo(0, 0)
      .lineTo(Math.cos(a) * size, Math.sin(a) * size)
      .stroke({ color, width: Math.max(1.2, size * 0.22), alpha });
    const mx = Math.cos(a) * size * 0.55;
    const my = Math.sin(a) * size * 0.55;
    const px = -Math.sin(a) * size * 0.22;
    const py = Math.cos(a) * size * 0.22;
    g.moveTo(mx - px, my - py)
      .lineTo(mx + px, my + py)
      .stroke({ color, width: Math.max(1, size * 0.16), alpha: alpha * 0.85 });
  }
  g.circle(0, 0, size * 0.14).fill({ color, alpha });
}

function drawCrystalShard(g: Graphics, len: number, halfW: number, color: number, alpha: number): void {
  g.moveTo(len * 0.55, 0)
    .lineTo(len * 0.12, -halfW)
    .lineTo(-len * 0.4, -halfW * 0.45)
    .lineTo(-len * 0.55, 0)
    .lineTo(-len * 0.4, halfW * 0.45)
    .lineTo(len * 0.12, halfW)
    .closePath()
    .fill({ color, alpha });
  g.moveTo(len * 0.4, 0)
    .lineTo(-len * 0.25, 0)
    .stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.55 });
}

/**
 * Премиум ледяной щит: осколки собираются в кристаллический heater-щит
 * (плоский верх, остриё вниз) со снежинками и инеем.
 */
export async function playIceShieldVfx(
  layer: Container,
  tweens: TweenManager,
  x: number,
  y: number,
  radius = 70,
): Promise<void> {
  const root = new Container();
  root.eventMode = "none";
  layer.addChild(root);

  const glow = new Container();
  glow.blendMode = "add";
  glow.filters = [new BlurFilter({ strength: 2.5, quality: 2 })];
  root.addChild(glow);
  const crisp = new Container();
  root.addChild(crisp);

  const R = Math.max(48, radius);
  const W = R * 0.6;
  const H = R * 1.1;

  // ——— 1. Заряд ———
  const chargeGlow = new Sprite(TEX.iceGlow());
  chargeGlow.anchor.set(0.5);
  chargeGlow.position.set(x, y);
  chargeGlow.scale.set(0.2);
  chargeGlow.alpha = 0;
  glow.addChild(chargeGlow);

  const mistA = new Sprite(TEX.frostMist());
  mistA.anchor.set(0.5);
  mistA.position.set(x, y);
  glow.addChild(mistA);
  const mistB = new Sprite(TEX.frostMist());
  mistB.anchor.set(0.5);
  mistB.position.set(x, y);
  glow.addChild(mistB);

  const cores: Sprite[] = [];
  for (let i = 0; i < 10; i++) {
    const s = new Sprite(TEX.iceCore());
    s.anchor.set(0.5);
    s.scale.set(0.1 + Math.random() * 0.08);
    glow.addChild(s);
    cores.push(s);
  }

  await tweens.to(0.32, (t) => {
    const k = easeOutCubic(t);
    chargeGlow.alpha = k * 0.85;
    chargeGlow.scale.set((R / 64) * (0.35 + k * 0.55));
    mistA.scale.set((R / 48) * (0.4 + k * 0.7));
    mistA.alpha = k * 0.55;
    mistA.rotation = t * 0.8;
    mistB.scale.set((R / 48) * (0.3 + k * 0.55));
    mistB.alpha = k * 0.4;
    mistB.rotation = -t * 1.1;
    for (let i = 0; i < cores.length; i++) {
      const a = (Math.PI * 2 * i) / cores.length + t * 4;
      const r = R * (0.28 + t * 0.3);
      cores[i]!.position.set(x + Math.cos(a) * r, y + Math.sin(a) * r);
      cores[i]!.alpha = 0.35 + t * 0.55;
      cores[i]!.rotation = a;
    }
  });

  // ——— 2. Осколки летят к контуру щита ———
  const rimTargets = sampleHeaterRim(x, y, W, H, 18);
  type Shard = { g: Graphics; from: Pt; to: Pt };
  const shards: Shard[] = [];
  for (let i = 0; i < rimTargets.length; i++) {
    const to = rimTargets[i]!;
    const n = rimNormal(x, y, to);
    const from: Pt = {
      x: to.x + n.x * R * (0.55 + Math.random() * 0.45),
      y: to.y + n.y * R * (0.55 + Math.random() * 0.45),
    };
    const g = new Graphics();
    drawCrystalShard(g, 10 + Math.random() * 12, 2.2 + Math.random() * 1.6, i % 2 ? 0xa8e8ff : 0xd8f8ff, 0.95);
    crisp.addChild(g);
    shards.push({ g, from, to });
  }

  await tweens.to(0.4, (t) => {
    const k = easeOutCubic(t);
    for (const s of shards) {
      const px = s.from.x + (s.to.x - s.from.x) * k;
      const py = s.from.y + (s.to.y - s.from.y) * k;
      s.g.position.set(px, py);
      s.g.rotation = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x);
      s.g.alpha = 0.35 + t * 0.65;
      s.g.scale.set(0.55 + t * 0.55);
    }
    chargeGlow.scale.set((R / 64) * (0.9 + t * 0.25));
    chargeGlow.alpha = 0.85 - t * 0.15;
  });
  for (const s of shards) s.g.destroy();
  for (const c of cores) c.destroy();

  // ——— 3. Кристаллический heater-щит ———
  const aura = new Sprite(TEX.iceGlow());
  aura.anchor.set(0.5);
  aura.position.set(x, y);
  glow.addChild(aura);

  const shell = new Graphics();
  crisp.addChild(shell);

  const rimCrystals: Graphics[] = [];
  for (let i = 0; i < 12; i++) {
    const g = new Graphics();
    drawCrystalShard(g, 12 + (i % 3) * 3, 3, 0xc8f0ff, 0.95);
    crisp.addChild(g);
    rimCrystals.push(g);
  }

  const flakes: Graphics[] = [];
  for (let i = 0; i < 9; i++) {
    const f = new Graphics();
    drawSnowflake(f, 4.2 + (i % 4) * 1.3, 0xe8f8ff, 0.95);
    crisp.addChild(f);
    flakes.push(f);
  }

  const frost = new Graphics();
  crisp.addChildAt(frost, 0);

  const sparkles: Sprite[] = [];
  for (let i = 0; i < 8; i++) {
    const s = new Sprite(TEX.iceCore());
    s.anchor.set(0.5);
    s.scale.set(0.08 + Math.random() * 0.06);
    glow.addChild(s);
    sparkles.push(s);
  }

  await tweens.to(1.05, (t) => {
    const pulse = 1 + Math.sin(t * Math.PI * 5) * 0.035;
    const form = Math.min(1, t * 1.4);
    const scale = pulse * (0.78 + form * 0.22);
    const w = W * scale;
    const h = H * scale;

    aura.scale.set((R / 64) * scale * 1.05);
    aura.alpha = 0.3 + (1 - t) * 0.3 + Math.sin(t * 14) * 0.05;

    mistA.scale.set((R / 48) * scale * 1.25);
    mistA.alpha = 0.2 + Math.sin(t * 8) * 0.07;
    mistA.rotation = t * 1.1;
    mistB.scale.set((R / 48) * scale * 1.05);
    mistB.alpha = 0.14;
    mistB.rotation = -t * 0.85;

    shell.clear();

    // заливка щита
    traceHeaterShield(shell, x, y, w * 0.96, h * 0.96).fill({
      color: 0x4a9ec8,
      alpha: 0.14 + (1 - t) * 0.1,
    });
    traceHeaterShield(shell, x, y, w * 0.72, h * 0.72).fill({
      color: 0xd0f0ff,
      alpha: 0.1,
    });
    // яркое ядро
    shell.ellipse(x, y - h * 0.05, w * 0.28, h * 0.32).fill({
      color: 0xffffff,
      alpha: 0.12 + Math.sin(t * 10) * 0.05,
    });

    // внешний контур
    traceHeaterShield(shell, x, y, w, h).stroke({
      color: 0xa8e8ff,
      width: 3.4,
      alpha: 0.65 + Math.sin(t * 12) * 0.2,
    });
    traceHeaterShield(shell, x, y, w * 0.88, h * 0.88).stroke({
      color: 0xffffff,
      width: 1.5,
      alpha: 0.4 + Math.sin(t * 10 + 1) * 0.15,
    });

    // внутренние грани-кристаллы (как на иконке)
    const facets = [
      [
        { x: x, y: y - h * 0.5 },
        { x: x + w * 0.35, y: y - h * 0.15 },
        { x: x, y: y + h * 0.15 },
        { x: x - w * 0.35, y: y - h * 0.15 },
      ],
      [
        { x: x - w * 0.55, y: y - h * 0.35 },
        { x: x - w * 0.15, y: y - h * 0.2 },
        { x: x - w * 0.35, y: y + h * 0.15 },
        { x: x - w * 0.72, y: y - h * 0.05 },
      ],
      [
        { x: x + w * 0.55, y: y - h * 0.35 },
        { x: x + w * 0.72, y: y - h * 0.05 },
        { x: x + w * 0.35, y: y + h * 0.15 },
        { x: x + w * 0.15, y: y - h * 0.2 },
      ],
      [
        { x: x - w * 0.25, y: y + h * 0.05 },
        { x: x + w * 0.25, y: y + h * 0.05 },
        { x: x, y: y + h * 0.58 },
      ],
    ];
    for (let fi = 0; fi < facets.length; fi++) {
      const f = facets[fi]!;
      const p0 = f[0]!;
      shell.moveTo(p0.x, p0.y);
      for (let i = 1; i < f.length; i++) shell.lineTo(f[i]!.x, f[i]!.y);
      shell.closePath().stroke({
        color: fi === 0 ? 0xe8f8ff : 0x7ec8e8,
        width: fi === 0 ? 2 : 1.3,
        alpha: 0.45 + Math.sin(t * 9 + fi) * 0.2,
      });
    }

    // радиальные шипы льда сзади (как лучи на иконке)
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.55 + (Math.PI * 1.1 * i) / 9 + Math.sin(t * 6 + i) * 0.04;
      const r0 = R * 0.35;
      const r1 = R * (0.85 + Math.sin(t * 11 + i) * 0.08);
      shell
        .moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.85)
        .lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.85)
        .stroke({ color: 0xd8f4ff, width: 1.6, alpha: 0.22 + Math.sin(t * 12 + i) * 0.12 });
    }

    const rim = sampleHeaterRim(x, y, w, h, rimCrystals.length);
    rimCrystals.forEach((g, i) => {
      const p = rim[i]!;
      const n = rimNormal(x, y, p);
      g.position.set(p.x + n.x * 2, p.y + n.y * 2);
      g.rotation = Math.atan2(n.y, n.x);
      g.alpha = 0.55 + Math.sin(t * 10 + i) * 0.35;
      g.scale.set(0.7 + Math.sin(t * 8 + i * 0.7) * 0.15);
    });

    const flakeRim = sampleHeaterRim(x, y, w * 0.78, h * 0.78, flakes.length);
    flakes.forEach((f, i) => {
      const p = flakeRim[i]!;
      const drift = Math.sin(t * 8 + i) * 3;
      f.position.set(p.x + drift, p.y - Math.cos(t * 6 + i) * 2);
      f.rotation = t * 2 + i;
      f.alpha = 0.5 + Math.sin(t * 12 + i) * 0.4;
      f.scale.set(0.85 + Math.sin(t * 7 + i) * 0.2);
    });

    frost.clear();
    frost.ellipse(x, y + h * 0.55, w * 0.75, h * 0.18).fill({
      color: 0xa8d8f0,
      alpha: 0.16 + Math.sin(t * 6) * 0.05,
    });
    const sparkRim = sampleHeaterRim(x, y, w * 0.98, h * 0.98, 14);
    for (let i = 0; i < sparkRim.length; i++) {
      const p = sparkRim[i]!;
      frost.circle(p.x, p.y, 1.3 + (i % 3) * 0.5).fill({
        color: 0xffffff,
        alpha: 0.35 + Math.sin(t * 16 + i) * 0.25,
      });
    }

    sparkles.forEach((s, i) => {
      const a = (Math.PI * 2 * i) / sparkles.length - t * 2.2;
      const rr = R * (0.22 + (i % 2) * 0.18);
      s.position.set(x + Math.cos(a) * rr * 0.7, y + Math.sin(a) * rr * 0.9 - h * 0.05);
      s.alpha = 0.3 + Math.sin(t * 15 + i) * 0.35;
      s.scale.set(0.07 + Math.sin(t * 9 + i) * 0.04);
    });
  });

  // ——— 4. Затухание ———
  await tweens.to(0.5, (t) => {
    const fade = 1 - t;
    aura.alpha = fade * 0.35;
    mistA.alpha = fade * 0.2;
    mistB.alpha = fade * 0.12;
    shell.alpha = fade;
    frost.alpha = fade;
    for (const f of flakes) f.alpha = fade * 0.55;
    for (const g of rimCrystals) g.alpha = fade * 0.6;
    for (const s of sparkles) s.alpha = fade * 0.4;
  });

  aura.destroy();
  mistA.destroy();
  mistB.destroy();
  chargeGlow.destroy();
  shell.destroy();
  frost.destroy();
  for (const f of flakes) f.destroy();
  for (const g of rimCrystals) g.destroy();
  for (const s of sparkles) s.destroy();
  glow.filters = null;
  root.destroy({ children: true });
}
