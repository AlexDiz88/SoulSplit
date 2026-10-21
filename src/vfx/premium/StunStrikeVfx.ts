import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutBack, easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

/** Премиум оглушающий удар: рывок → металлический удар → стан-звёзды. */
export async function playStunStrikeVfx(
  layer: Container,
  tweens: TweenManager,
  from: Pt,
  to: Pt,
  onCasterLunge?: (t: number) => void,
  onImpact?: () => void,
  screenShake?: (amp: number, dur: number) => void,
): Promise<void> {
  const root = new Container();
  root.eventMode = "none";
  layer.addChild(root);

  const glow = new Container();
  glow.blendMode = "add";
  glow.filters = [new BlurFilter({ strength: 2, quality: 2 })];
  root.addChild(glow);
  const crisp = new Container();
  root.addChild(crisp);

  // заряд оружия
  const charge = new Sprite(TEX.metalGlow());
  charge.anchor.set(0.5);
  charge.position.set(from.x, from.y);
  glow.addChild(charge);

  const sparkRing = new Graphics();
  crisp.addChild(sparkRing);

  await tweens.to(0.22, (t) => {
    charge.scale.set(0.25 + t * 0.45);
    charge.alpha = 0.4 + t * 0.5;
    sparkRing.clear();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + t * 4;
      sparkRing
        .moveTo(from.x + Math.cos(a) * 12, from.y + Math.sin(a) * 12)
        .lineTo(from.x + Math.cos(a) * (18 + t * 10), from.y + Math.sin(a) * (18 + t * 10))
        .stroke({ color: 0xffe6a0, width: 2, alpha: 0.7 * t });
    }
  });

  // рывок / afterimage
  const ghosts: Graphics[] = [];
  for (let i = 0; i < 4; i++) {
    const g = new Graphics();
    g.roundRect(-22, -22, 44, 44, 6).stroke({ color: 0xc9b896, width: 2, alpha: 0.5 });
    g.position.set(from.x, from.y);
    crisp.addChild(g);
    ghosts.push(g);
  }

  await tweens.to(0.14, (t) => {
    onCasterLunge?.(t);
    ghosts.forEach((g, i) => {
      const k = Math.max(0, t - i * 0.08);
      g.x = from.x + (to.x - from.x) * 0.35 * k;
      g.y = from.y + (to.y - from.y) * 0.35 * k;
      g.alpha = 0.45 * (1 - t);
    });
    charge.position.set(
      from.x + (to.x - from.x) * 0.4 * t,
      from.y + (to.y - from.y) * 0.4 * t,
    );
  });
  for (const g of ghosts) g.destroy();
  onCasterLunge?.(0);

  // удар
  screenShake?.(12, 0.2);
  onImpact?.();
  charge.position.set(to.x, to.y);

  const impact = new Sprite(TEX.metalGlow());
  impact.anchor.set(0.5);
  impact.position.set(to.x, to.y);
  glow.addChild(impact);

  const rays = new Graphics();
  crisp.addChild(rays);
  const shards: { g: Graphics; vx: number; vy: number; vr: number }[] = [];
  for (let i = 0; i < 18; i++) {
    const g = new Graphics();
    const a = (Math.PI * 2 * i) / 18;
    g.moveTo(0, 0)
      .lineTo(10 + Math.random() * 14, -1.5)
      .lineTo(6, 2)
      .fill({ color: Math.random() > 0.5 ? 0xe8dcc0 : 0xffe6a0, alpha: 0.95 });
    g.position.set(to.x, to.y);
    g.rotation = a;
    crisp.addChild(g);
    const spd = 100 + Math.random() * 180;
    shards.push({ g, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, vr: (Math.random() - 0.5) * 10 });
  }

  // стан-звёзды над целью
  const stars: Graphics[] = [];
  for (let i = 0; i < 3; i++) {
    const g = new Graphics();
    // 4-конечная звезда
    const drawStar = (size: number) => {
      g.moveTo(0, -size)
        .lineTo(size * 0.25, -size * 0.25)
        .lineTo(size, 0)
        .lineTo(size * 0.25, size * 0.25)
        .lineTo(0, size)
        .lineTo(-size * 0.25, size * 0.25)
        .lineTo(-size, 0)
        .lineTo(-size * 0.25, -size * 0.25)
        .closePath()
        .fill({ color: 0xffe6a0, alpha: 0.95 });
    };
    drawStar(6 + i);
    g.position.set(to.x + (i - 1) * 14, to.y - 36);
    crisp.addChild(g);
    stars.push(g);
  }

  await tweens.to(
    0.55,
    (t) => {
      impact.scale.set(0.4 + t * 1.8);
      impact.alpha = (1 - t) * 0.85;
      charge.alpha = (1 - t) * 0.5;

      rays.clear();
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n;
        const len = 18 + t * 55 + (i % 2) * 10;
        rays
          .moveTo(to.x + Math.cos(a) * 8, to.y + Math.sin(a) * 8)
          .lineTo(to.x + Math.cos(a) * len, to.y + Math.sin(a) * len)
          .stroke({ color: 0xe8dcc0, width: 3 * (1 - t) + 0.5, alpha: 1 - t });
      }
      rays.circle(to.x, to.y, 10 + t * 28).fill({ color: 0xffffff, alpha: (1 - t) * 0.45 });
      // ударная волна
      rays.circle(to.x, to.y, 25 + t * 50).stroke({
        color: 0xc9b896,
        width: 3 * (1 - t),
        alpha: (1 - t) * 0.7,
      });

      for (const s of shards) {
        s.g.x = to.x + s.vx * t;
        s.g.y = to.y + s.vy * t + 60 * t * t;
        s.g.rotation += s.vr * 0.05;
        s.g.alpha = 1 - t;
      }

      stars.forEach((s, i) => {
        const bob = Math.sin(t * 12 + i) * 4;
        s.y = to.y - 36 + bob - t * 8;
        s.rotation = t * 2 + i;
        s.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        s.scale.set(0.8 + Math.sin(t * 10 + i) * 0.15);
      });
    },
    { ease: easeOutBack },
  );

  // короткое «звон»-кольцо
  const ring = new Graphics();
  crisp.addChild(ring);
  await tweens.to(
    0.35,
    (t) => {
      ring.clear();
      ring.circle(to.x, to.y, 20 + t * 45).stroke({
        color: 0xffe6a0,
        width: 2.5 * (1 - t),
        alpha: 1 - t,
      });
    },
    { ease: easeOutCubic },
  );

  charge.destroy();
  impact.destroy();
  rays.destroy();
  ring.destroy();
  sparkRing.destroy();
  for (const s of shards) s.g.destroy();
  for (const s of stars) s.destroy();
  glow.filters = null;
  root.destroy({ children: true });
}
