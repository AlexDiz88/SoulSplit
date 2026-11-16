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

function paintFormedShield(
  shell: Graphics,
  frost: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  R: number,
  t: number,
): void {
  shell.clear();
  traceHeaterShield(shell, x, y, w * 0.96, h * 0.96).fill({
    color: 0x4a9ec8,
    alpha: 0.18 + (1 - t) * 0.12,
  });
  traceHeaterShield(shell, x, y, w * 0.72, h * 0.72).fill({
    color: 0xd0f0ff,
    alpha: 0.12,
  });
  shell.ellipse(x, y - h * 0.05, w * 0.28, h * 0.32).fill({
    color: 0xffffff,
    alpha: 0.14 + Math.sin(t * 10) * 0.05,
  });
  traceHeaterShield(shell, x, y, w, h).stroke({
    color: 0xa8e8ff,
    width: 3.4,
    alpha: 0.7 + Math.sin(t * 12) * 0.15,
  });
  traceHeaterShield(shell, x, y, w * 0.88, h * 0.88).stroke({
    color: 0xffffff,
    width: 1.5,
    alpha: 0.45,
  });

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
      alpha: 0.5,
    });
  }

  for (let i = 0; i < 10; i++) {
    const a = -Math.PI * 0.55 + (Math.PI * 1.1 * i) / 9;
    const r0 = R * 0.35;
    const r1 = R * 0.9;
    shell
      .moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.85)
      .lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.85)
      .stroke({ color: 0xd8f4ff, width: 1.6, alpha: 0.28 });
  }

  frost.clear();
  frost.ellipse(x, y + h * 0.55, w * 0.75, h * 0.18).fill({
    color: 0xa8d8f0,
    alpha: 0.18,
  });
  const sparkRim = sampleHeaterRim(x, y, w * 0.98, h * 0.98, 14);
  for (let i = 0; i < sparkRim.length; i++) {
    const p = sparkRim[i]!;
    frost.circle(p.x, p.y, 1.3 + (i % 3) * 0.5).fill({
      color: 0xffffff,
      alpha: 0.4,
    });
  }
}

/**
 * Премиум ледяной щит: короткий каст (~0.45 с до готовности),
 * затем затухание VFX в фоне. Постоянный контур держит Unit.shieldGfx.
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
  for (let i = 0; i < 8; i++) {
    const s = new Sprite(TEX.iceCore());
    s.anchor.set(0.5);
    s.scale.set(0.1 + Math.random() * 0.08);
    glow.addChild(s);
    cores.push(s);
  }

  await tweens.to(0.16, (t) => {
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

  // ——— 2. Осколки летят к контуру ———
  const rimTargets = sampleHeaterRim(x, y, W, H, 16);
  type Shard = { g: Graphics; from: Pt; to: Pt };
  const shards: Shard[] = [];
  for (let i = 0; i < rimTargets.length; i++) {
    const to = rimTargets[i]!;
    const n = rimNormal(x, y, to);
    const from: Pt = {
      x: to.x + n.x * R * (0.45 + Math.random() * 0.35),
      y: to.y + n.y * R * (0.45 + Math.random() * 0.35),
    };
    const g = new Graphics();
    drawCrystalShard(g, 10 + Math.random() * 12, 2.2 + Math.random() * 1.6, i % 2 ? 0xa8e8ff : 0xd8f8ff, 0.95);
    crisp.addChild(g);
    shards.push({ g, from, to });
  }

  await tweens.to(0.22, (t) => {
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

  // ——— 3. Вспышка собранного щита (каст отпускается после этого) ———
  const aura = new Sprite(TEX.iceGlow());
  aura.anchor.set(0.5);
  aura.position.set(x, y);
  glow.addChild(aura);

  const shell = new Graphics();
  crisp.addChild(shell);

  const rimCrystals: Graphics[] = [];
  for (let i = 0; i < 10; i++) {
    const g = new Graphics();
    drawCrystalShard(g, 12 + (i % 3) * 3, 3, 0xc8f0ff, 0.95);
    crisp.addChild(g);
    rimCrystals.push(g);
  }

  const flakes: Graphics[] = [];
  for (let i = 0; i < 7; i++) {
    const f = new Graphics();
    drawSnowflake(f, 4.2 + (i % 4) * 1.3, 0xe8f8ff, 0.95);
    crisp.addChild(f);
    flakes.push(f);
  }

  const frost = new Graphics();
  crisp.addChildAt(frost, 0);

  await tweens.to(0.12, (t) => {
    const form = easeOutCubic(t);
    const scale = 0.82 + form * 0.18;
    const w = W * scale;
    const h = H * scale;
    aura.scale.set((R / 64) * scale * 1.05);
    aura.alpha = 0.45 + form * 0.2;
    mistA.scale.set((R / 48) * scale * 1.2);
    mistA.alpha = 0.28;
    mistB.scale.set((R / 48) * scale);
    mistB.alpha = 0.16;
    paintFormedShield(shell, frost, x, y, w, h, R, t);
    const rim = sampleHeaterRim(x, y, w, h, rimCrystals.length);
    rimCrystals.forEach((g, i) => {
      const p = rim[i]!;
      const n = rimNormal(x, y, p);
      g.position.set(p.x + n.x * 2, p.y + n.y * 2);
      g.rotation = Math.atan2(n.y, n.x);
      g.alpha = 0.55 + form * 0.35;
      g.scale.set(0.75);
    });
    const flakeRim = sampleHeaterRim(x, y, w * 0.78, h * 0.78, flakes.length);
    flakes.forEach((f, i) => {
      const p = flakeRim[i]!;
      f.position.set(p.x, p.y);
      f.alpha = 0.55 + form * 0.35;
      f.scale.set(0.9);
    });
  });

  // Каст завершён (~0.5 с). Затухание VFX не блокирует автоатаку.
  void (async () => {
    try {
      await tweens.to(0.35, (t) => {
        const fade = 1 - t;
        aura.alpha = fade * 0.5;
        mistA.alpha = fade * 0.22;
        mistB.alpha = fade * 0.14;
        shell.alpha = fade;
        frost.alpha = fade;
        for (const f of flakes) f.alpha = fade * 0.55;
        for (const g of rimCrystals) g.alpha = fade * 0.6;
      });
    } finally {
      if (!root.destroyed) {
        aura.destroy();
        mistA.destroy();
        mistB.destroy();
        chargeGlow.destroy();
        shell.destroy();
        frost.destroy();
        for (const f of flakes) f.destroy();
        for (const g of rimCrystals) g.destroy();
        glow.filters = null;
        root.destroy({ children: true });
      }
    }
  })();
}
