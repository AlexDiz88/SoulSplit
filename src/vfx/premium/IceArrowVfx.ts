import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function crystalPath(g: Graphics, len: number, halfW: number): void {
  // Остриё → грани → хвост (не круг!)
  g.moveTo(len * 0.55, 0)
    .lineTo(len * 0.15, -halfW)
    .lineTo(-len * 0.35, -halfW * 0.55)
    .lineTo(-len * 0.5, 0)
    .lineTo(-len * 0.35, halfW * 0.55)
    .lineTo(len * 0.15, halfW)
    .closePath();
}

function drawSnowflake(g: Graphics, size: number, color: number, alpha: number): void {
  const arms = 6;
  for (let i = 0; i < arms; i++) {
    const a = (Math.PI * 2 * i) / arms;
    const x2 = Math.cos(a) * size;
    const y2 = Math.sin(a) * size;
    g.moveTo(0, 0).lineTo(x2, y2).stroke({ color, width: 1.4, alpha });
    const mx = Math.cos(a) * size * 0.55;
    const my = Math.sin(a) * size * 0.55;
    const px = -Math.sin(a) * size * 0.22;
    const py = Math.cos(a) * size * 0.22;
    g.moveTo(mx - px, my - py)
      .lineTo(mx + px, my + py)
      .stroke({ color, width: 1.1, alpha: alpha * 0.85 });
  }
  g.circle(0, 0, size * 0.12).fill({ color, alpha });
}

/**
 * Премиум «Ледяная стрела»: заряд → кристалл-снаряд → иней → shatter.
 */
export async function playIceArrowVfx(
  layer: Container,
  tweens: TweenManager,
  from: Pt,
  to: Pt,
  onImpact?: () => void,
  screenShake?: (amp: number, dur: number) => void,
): Promise<void> {
  const root = new Container();
  root.eventMode = "none";
  layer.addChild(root);

  const glowLayer = new Container();
  glowLayer.blendMode = "add";
  // Лёгкий blur только на glow — кристалл остаётся в crisp-слое без размытия
  glowLayer.filters = [new BlurFilter({ strength: 2, quality: 2 })];
  root.addChild(glowLayer);

  const crisp = new Container();
  root.addChild(crisp);

  // ——— 1. Заряд у кастера ———
  const chargeGlow = new Sprite(TEX.iceGlow());
  chargeGlow.anchor.set(0.5);
  chargeGlow.position.set(from.x, from.y);
  chargeGlow.scale.set(0.15);
  chargeGlow.alpha = 0;
  glowLayer.addChild(chargeGlow);

  const orbit: Sprite[] = [];
  for (let i = 0; i < 8; i++) {
    const s = new Sprite(TEX.iceCore());
    s.anchor.set(0.5);
    s.scale.set(0.12 + Math.random() * 0.08);
    glowLayer.addChild(s);
    orbit.push(s);
  }

  const frostRing = new Graphics();
  crisp.addChild(frostRing);

  await tweens.to(0.38, (t) => {
    chargeGlow.alpha = t * 0.9;
    chargeGlow.scale.set(0.2 + t * 0.55);
    for (let i = 0; i < orbit.length; i++) {
      const a = (Math.PI * 2 * i) / orbit.length + t * 5;
      const r = 18 + t * 14;
      orbit[i]!.position.set(from.x + Math.cos(a) * r, from.y + Math.sin(a) * r);
      orbit[i]!.alpha = 0.4 + t * 0.5;
      orbit[i]!.rotation = a;
    }
    frostRing.clear();
    frostRing.circle(from.x, from.y, 12 + t * 22).stroke({
      color: 0xa8e8ff,
      width: 2,
      alpha: (1 - t) * 0.7,
    });
  });

  for (const s of orbit) s.destroy();
  frostRing.destroy();

  // ——— 2. Полёт кристалла ———
  const bolt = new Container();
  crisp.addChild(bolt);

  const boltGlow = new Sprite(TEX.iceGlow());
  boltGlow.anchor.set(0.5);
  boltGlow.scale.set(0.55, 0.28);
  boltGlow.alpha = 0.55;
  glowLayer.addChild(boltGlow);

  // вторичный soft-glow без сильного размытия силуэта
  const boltHalo = new Sprite(TEX.iceCore());
  boltHalo.anchor.set(0.5);
  boltHalo.scale.set(0.9, 0.35);
  boltHalo.alpha = 0.45;
  boltHalo.blendMode = "add";
  crisp.addChild(boltHalo);

  const body = new Graphics();
  // Крупный гранёный кристалл (читается на сетке)
  crystalPath(body, 58, 14);
  body.stroke({ color: 0x2a6a98, width: 3, alpha: 1 });
  crystalPath(body, 54, 12);
  body.fill({ color: 0x3a90c8, alpha: 0.85 });
  crystalPath(body, 46, 8);
  body.fill({ color: 0x7ecfff, alpha: 0.95 });
  crystalPath(body, 34, 4);
  body.fill({ color: 0xe8f8ff, alpha: 1 });
  // грани / фаски
  body.moveTo(-14, 0).lineTo(22, -6).stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
  body.moveTo(-14, 0).lineTo(22, 6).stroke({ color: 0x5ab8e8, width: 1.6, alpha: 0.85 });
  body.moveTo(10, -7).lineTo(26, 0).lineTo(10, 7).stroke({ color: 0xffffff, width: 1.8, alpha: 0.95 });
  body.moveTo(-6, -4).lineTo(-6, 4).stroke({ color: 0xb8e8ff, width: 1.2, alpha: 0.7 });
  bolt.addChild(body);
  bolt.scale.set(1.15);

  const tipSpark = new Sprite(TEX.iceCore());
  tipSpark.anchor.set(0.5);
  tipSpark.position.set(20, 0);
  tipSpark.scale.set(0.35);
  bolt.addChild(tipSpark);

  type TrailBit = {
    s: Sprite | Graphics;
    life: number;
    max: number;
    vx: number;
    vy: number;
  };
  const trail: TrailBit[] = [];
  const flakes: { g: Graphics; life: number; max: number; rot: number; vr: number }[] = [];

  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const duration = Math.max(0.16, dist / 920);

  await tweens.to(
    duration,
    (t) => {
      const x = lerp(from.x, to.x, t);
      const y = lerp(from.y, to.y, t);
      const dir = ang;

      bolt.position.set(x, y);
      bolt.rotation = dir;
      boltHalo.position.set(x, y);
      boltHalo.rotation = dir;
      boltHalo.alpha = 0.35 + Math.sin(t * 30) * 0.1;
      boltGlow.position.set(x, y);
      boltGlow.rotation = dir;
      boltGlow.alpha = 0.4 + Math.sin(t * 40) * 0.1;
      boltGlow.scale.set(0.5 + Math.sin(t * 20) * 0.06, 0.24);

      chargeGlow.alpha = (1 - t) * 0.35;
      chargeGlow.scale.set(0.75 * (1 - t * 0.5));

      // иней-след
      if (Math.random() < 0.85) {
        const mist = new Sprite(TEX.frostMist());
        mist.anchor.set(0.5);
        mist.position.set(x - Math.cos(dir) * 10 + (Math.random() - 0.5) * 8, y - Math.sin(dir) * 10);
        mist.scale.set(0.25 + Math.random() * 0.2);
        mist.alpha = 0.55;
        mist.blendMode = "add";
        crisp.addChild(mist);
        trail.push({
          s: mist,
          life: 0,
          max: 0.35 + Math.random() * 0.2,
          vx: (Math.random() - 0.5) * 20,
          vy: 15 + Math.random() * 25,
        });
      }

      // снежинки
      if (Math.random() < 0.35) {
        const fg = new Graphics();
        drawSnowflake(fg, 4 + Math.random() * 5, 0xd8f4ff, 0.9);
        fg.position.set(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 16);
        crisp.addChild(fg);
        flakes.push({
          g: fg,
          life: 0,
          max: 0.45 + Math.random() * 0.25,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 6,
        });
      }

      // осколки-искры вдоль пути
      if (Math.random() < 0.5) {
        const shard = new Graphics();
        const sl = 3 + Math.random() * 6;
        shard
          .moveTo(0, 0)
          .lineTo(sl, Math.random() * 2 - 1)
          .lineTo(sl * 0.4, 2)
          .fill({ color: 0xb8e8ff, alpha: 0.9 });
        shard.position.set(x, y);
        shard.rotation = dir + Math.PI + (Math.random() - 0.5) * 0.8;
        crisp.addChild(shard);
        trail.push({
          s: shard,
          life: 0,
          max: 0.25,
          vx: -Math.cos(dir) * 40 + (Math.random() - 0.5) * 30,
          vy: -Math.sin(dir) * 40 + (Math.random() - 0.5) * 30,
        });
      }

      for (const bit of trail) {
        bit.life += 1 / 60;
        const k = bit.life / bit.max;
        bit.s.x += bit.vx * (1 / 60);
        bit.s.y += bit.vy * (1 / 60);
        bit.s.alpha = Math.max(0, 1 - k);
        if (bit.s instanceof Sprite) bit.s.scale.set(0.2 + (1 - k) * 0.15);
      }
      for (const f of flakes) {
        f.life += 1 / 60;
        f.g.rotation = f.rot + f.vr * f.life;
        f.g.y += 20 * (1 / 60);
        f.g.alpha = Math.max(0, 1 - f.life / f.max);
      }
    },
    { ease: (t) => t },
  );
  bolt.destroy({ children: true });
  boltGlow.destroy();
  boltHalo.destroy();
  chargeGlow.destroy();
  for (const bit of trail) bit.s.destroy();
  for (const f of flakes) f.g.destroy();

  // ——— 3. Удар / shatter ———
  screenShake?.(9, 0.16);
  onImpact?.();

  const impactGlow = new Sprite(TEX.iceGlow());
  impactGlow.anchor.set(0.5);
  impactGlow.position.set(to.x, to.y);
  impactGlow.scale.set(0.3);
  glowLayer.addChild(impactGlow);

  const bloom = new Graphics();
  crisp.addChild(bloom);

  type Shard = {
    g: Graphics;
    vx: number;
    vy: number;
    rot: number;
    vr: number;
    spin: number;
  };
  const shards: Shard[] = [];
  for (let i = 0; i < 28; i++) {
    const g = new Graphics();
    const a = (Math.PI * 2 * i) / 28 + Math.random() * 0.4;
    const len = 10 + Math.random() * 22;
    const w = 2 + Math.random() * 4;
    // многогранный осколок
    g.moveTo(0, 0)
      .lineTo(len, -w * 0.3)
      .lineTo(len * 0.7, w)
      .lineTo(len * 0.15, w * 0.5)
      .fill({ color: Math.random() > 0.5 ? 0xc8f4ff : 0x8ed0f0, alpha: 0.95 });
    g.moveTo(2, 0)
      .lineTo(len * 0.75, -w * 0.1)
      .stroke({ color: 0xffffff, width: 1, alpha: 0.55 });
    g.position.set(to.x, to.y);
    g.rotation = a;
    crisp.addChild(g);
    const spd = 90 + Math.random() * 220;
    shards.push({
      g,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      rot: a,
      vr: (Math.random() - 0.5) * 12,
      spin: Math.random() * Math.PI,
    });
  }

  // снежинки взрыва
  const burstFlakes: Graphics[] = [];
  for (let i = 0; i < 12; i++) {
    const g = new Graphics();
    drawSnowflake(g, 5 + Math.random() * 7, 0xe8f8ff, 1);
    g.position.set(to.x, to.y);
    crisp.addChild(g);
    burstFlakes.push(g);
  }

  // земляной иней
  const frostPatch = new Graphics();
  crisp.addChildAt(frostPatch, 0);

  await tweens.to(
    0.65,
    (t) => {
      impactGlow.scale.set(0.4 + t * 14);
      impactGlow.alpha = (1 - t) * 0.85;

      bloom.clear();
      // ледяная вспышка-звезда
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 + t * 0.4;
        const len = 20 + t * 55;
        bloom
          .moveTo(to.x, to.y)
          .lineTo(to.x + Math.cos(a) * len, to.y + Math.sin(a) * len)
          .stroke({ color: 0xd0f0ff, width: 3 * (1 - t), alpha: (1 - t) * 0.8 });
      }
      bloom.circle(to.x, to.y, 8 + t * 28).fill({ color: 0xffffff, alpha: (1 - t) * 0.45 });
      bloom.circle(to.x, to.y, 40 + t * 50).stroke({
        color: 0x7ec8e8,
        width: 3 * (1 - t) + 0.5,
        alpha: (1 - t) * 0.7,
      });

      frostPatch.clear();
      const pr = 18 + t * 42;
      frostPatch.ellipse(to.x, to.y + 8, pr * 1.15, pr * 0.55).fill({
        color: 0xa8d8f0,
        alpha: (1 - t * 0.55) * 0.22,
      });
      // трещины инея
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 + 0.3;
        frostPatch
          .moveTo(to.x, to.y + 6)
          .lineTo(to.x + Math.cos(a) * pr * 0.9, to.y + 6 + Math.sin(a) * pr * 0.45)
          .stroke({ color: 0xd0eefc, width: 1.2, alpha: (1 - t) * 0.5 });
      }

      for (const s of shards) {
        s.g.x = to.x + s.vx * t;
        s.g.y = to.y + s.vy * t + 90 * t * t;
        s.g.rotation = s.spin + s.vr * t;
        s.g.alpha = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
        s.g.scale.set(1 - t * 0.35);
      }
      burstFlakes.forEach((f, i) => {
        const a = (Math.PI * 2 * i) / burstFlakes.length;
        f.x = to.x + Math.cos(a) * (30 + t * 70);
        f.y = to.y + Math.sin(a) * (30 + t * 70) + 20 * t;
        f.rotation = t * 4 + i;
        f.alpha = 1 - t;
        f.scale.set(1 + t * 0.4);
      });
    },
    { ease: easeOutCubic },
  );

  // остаточный иней (короткий)
  frostPatch.clear();
  frostPatch.ellipse(to.x, to.y + 8, 48, 22).fill({ color: 0xa8d8f0, alpha: 0.18 });
  void tweens
    .to(0.9, (t) => {
      frostPatch.alpha = 1 - t;
    })
    .then(() => frostPatch.destroy());

  impactGlow.destroy();
  bloom.destroy();
  for (const s of shards) s.g.destroy();
  for (const f of burstFlakes) f.destroy();
  glowLayer.filters = null;
  root.destroy({ children: true });
}
