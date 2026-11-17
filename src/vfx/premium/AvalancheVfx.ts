import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeInOutQuad, easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

function drawSnowflake(g: Graphics, size: number, color: number, alpha: number): void {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    g.moveTo(0, 0)
      .lineTo(Math.cos(a) * size, Math.sin(a) * size)
      .stroke({ color, width: 1.5, alpha });
  }
  g.circle(0, 0, size * 0.14).fill({ color, alpha });
}

/**
 * Лавина: долгий заряд у героя → волна инея по полю → удар и хрупкие блики.
 */
export async function playAvalancheVfx(
  layer: Container,
  tweens: TweenManager,
  from: Pt,
  targets: Pt[],
  castTime: number,
  onImpact?: () => void,
  screenShake?: (amp: number, dur: number) => void,
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

  const charge = new Sprite(TEX.iceGlow());
  charge.anchor.set(0.5);
  charge.position.set(from.x, from.y);
  charge.scale.set(0.2);
  charge.alpha = 0;
  glow.addChild(charge);

  const orbit: Sprite[] = [];
  for (let i = 0; i < 10; i++) {
    const s = new Sprite(TEX.iceCore());
    s.anchor.set(0.5);
    s.scale.set(0.1 + Math.random() * 0.1);
    glow.addChild(s);
    orbit.push(s);
  }

  const chargeG = new Graphics();
  crisp.addChild(chargeG);

  const windup = castTime > 0 ? Math.max(0.4, castTime) : 0;
  if (windup > 0) await tweens.to(windup, (t) => {
    charge.alpha = 0.25 + t * 0.7;
    charge.scale.set(0.25 + t * 0.85);
    charge.rotation = t * 1.2;
    chargeG.clear();
    drawSnowflake(chargeG, 10 + t * 22, 0xe8f7ff, 0.35 + t * 0.55);
    chargeG.position.set(from.x, from.y);
    chargeG.rotation = -t * 0.8;
    for (let i = 0; i < orbit.length; i++) {
      const s = orbit[i]!;
      const a = (Math.PI * 2 * i) / orbit.length + t * 4;
      const r = 28 + t * 42 + Math.sin(t * 8 + i) * 6;
      s.position.set(from.x + Math.cos(a) * r, from.y + Math.sin(a) * r);
      s.alpha = 0.35 + t * 0.55;
    }
  }, { ease: easeInOutQuad });

  charge.destroy();
  for (const s of orbit) s.destroy();
  chargeG.destroy();

  const wave = new Graphics();
  glow.addChild(wave);
  const crest = new Graphics();
  crisp.addChild(crest);

  const shards: { g: Graphics; x: number; y: number; vx: number; vy: number; rot: number }[] = [];
  for (const tgt of targets) {
    for (let i = 0; i < 5; i++) {
      const g = new Graphics();
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const len = 10 + Math.random() * 16;
      g.moveTo(0, 0)
        .lineTo(Math.cos(ang) * len, Math.sin(ang) * len)
        .lineTo(Math.cos(ang + 0.25) * len * 0.45, Math.sin(ang + 0.25) * len * 0.45)
        .fill({ color: 0xc8efff, alpha: 0.95 });
      g.position.set(tgt.x + (Math.random() - 0.5) * 20, tgt.y - 40 - Math.random() * 30);
      crisp.addChild(g);
      shards.push({
        g,
        x: g.x,
        y: g.y,
        vx: (Math.random() - 0.5) * 60,
        vy: 180 + Math.random() * 140,
        rot: (Math.random() - 0.5) * 6,
      });
    }
  }

  let impactFired = false;
  await tweens.to(0.55, (t) => {
    const boom = easeOutCubic(t);
    wave.clear();
    for (let ring = 0; ring < 3; ring++) {
      const r = 40 + boom * (160 + ring * 55);
      wave.circle(from.x, from.y - 20, r).stroke({
        color: ring === 0 ? 0xffffff : 0x7ec8e8,
        width: 10 - ring * 2.5,
        alpha: (1 - boom) * (0.55 - ring * 0.12),
      });
    }
    crest.clear();
    for (const tgt of targets) {
      const lift = (1 - boom) * 18;
      crest.ellipse(tgt.x, tgt.y + 18, 36 + boom * 22, 14 + boom * 8).fill({
        color: 0xa8e6ff,
        alpha: (1 - boom) * 0.45,
      });
      crest.circle(tgt.x, tgt.y - lift, 8 + boom * 16).stroke({
        color: 0xffffff,
        width: 2,
        alpha: (1 - boom) * 0.8,
      });
    }
    for (const s of shards) {
      s.g.x = s.x + s.vx * boom;
      s.g.y = s.y + s.vy * boom;
      s.g.rotation = s.rot * boom;
      s.g.alpha = 1 - boom * 0.85;
    }
    if (!impactFired && t >= 0.42) {
      impactFired = true;
      screenShake?.(10, 0.18);
      onImpact?.();
    }
  }, { ease: easeOutCubic });

  if (!impactFired) {
    screenShake?.(10, 0.18);
    onImpact?.();
  }

  root.destroy({ children: true });
}
