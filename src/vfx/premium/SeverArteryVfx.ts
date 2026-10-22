import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

/** Премиум "Вскрыть артерию": серии клинковых дуг + кровь + bleed-метка. */
export async function playSeverArteryVfx(
  layer: Container,
  tweens: TweenManager,
  x: number,
  y: number,
  onHit?: () => void,
  screenShake?: (amp: number, dur: number) => void,
): Promise<void> {
  const root = new Container();
  root.eventMode = "none";
  layer.addChild(root);

  const glow = new Container();
  glow.blendMode = "add";
  glow.filters = [new BlurFilter({ strength: 1.5, quality: 2 })];
  root.addChild(glow);
  const crisp = new Container();
  root.addChild(crisp);

  // prep flash
  const prep = new Sprite(TEX.bloodGlow());
  prep.anchor.set(0.5);
  prep.position.set(x, y);
  prep.scale.set(0.2);
  glow.addChild(prep);
  await tweens.to(0.12, (t) => {
    prep.scale.set(0.2 + t * 0.4);
    prep.alpha = t * 0.6;
  });

  const arcs = [
    { start: -0.9, sweep: 1.5, delay: 0, width: 5, r: 36 },
    { start: 0.4, sweep: -1.4, delay: 0.08, width: 4, r: 32 },
    { start: -0.3, sweep: 1.2, delay: 0.16, width: 3, r: 28 },
  ];

  const slashG = new Graphics();
  crisp.addChild(slashG);
  const trailG = new Graphics();
  trailG.blendMode = "add";
  glow.addChild(trailG);

  let hitDone = false;
  await tweens.to(0.42, (t) => {
    slashG.clear();
    trailG.clear();
    for (const arc of arcs) {
      const local = Math.max(0, Math.min(1, (t - arc.delay) / 0.22));
      if (local <= 0) continue;
      const a0 = arc.start;
      const a1 = arc.start + arc.sweep * local;
      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const u0 = i / steps;
        const u1 = (i + 1) / steps;
        const ang0 = a0 + (a1 - a0) * u0;
        const ang1 = a0 + (a1 - a0) * u1;
        const fade = 1 - u0 * 0.5;
        slashG
          .moveTo(x + Math.cos(ang0) * arc.r, y + Math.sin(ang0) * arc.r)
          .lineTo(x + Math.cos(ang1) * arc.r, y + Math.sin(ang1) * arc.r)
          .stroke({
            color: 0xff3a4a,
            width: arc.width * (1 - local * 0.3),
            alpha: fade * (1 - local * 0.2),
          });
        trailG
          .moveTo(x + Math.cos(ang0) * (arc.r - 3), y + Math.sin(ang0) * (arc.r - 3))
          .lineTo(x + Math.cos(ang1) * (arc.r - 3), y + Math.sin(ang1) * (arc.r - 3))
          .stroke({
            color: 0xffa0a8,
            width: arc.width * 0.5,
            alpha: fade * 0.5 * (1 - local),
          });
      }
      // белая кромка лезвия
      slashG
        .moveTo(x + Math.cos(a1) * (arc.r - 2), y + Math.sin(a1) * (arc.r - 2))
        .lineTo(x + Math.cos(a1) * (arc.r + 2), y + Math.sin(a1) * (arc.r + 2))
        .stroke({ color: 0xffffff, width: 2, alpha: (1 - local) * 0.9 });
    }
    prep.alpha = (1 - t) * 0.4;

    if (!hitDone && t > 0.18) {
      hitDone = true;
      onHit?.();
      screenShake?.(7, 0.1);
    }
  });

  // брызги крови
  type Drop = { g: Graphics; vx: number; vy: number; spin: number };
  const drops: Drop[] = [];
  for (let i = 0; i < 16; i++) {
    const g = new Graphics();
    const len = 3 + Math.random() * 8;
    if (Math.random() > 0.4) {
      g.ellipse(0, 0, 2 + Math.random() * 2, 3 + Math.random() * 3).fill({
        color: Math.random() > 0.5 ? 0xa01828 : 0xc02030,
        alpha: 0.95,
      });
    } else {
      g.moveTo(0, 0)
        .lineTo(len, -1)
        .lineTo(len * 0.4, 2)
        .fill({ color: 0x8a1020, alpha: 0.9 });
    }
    g.position.set(x, y);
    crisp.addChild(g);
    const a = -1.2 + Math.random() * 2.4;
    const spd = 50 + Math.random() * 140;
    drops.push({
      g,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd - 40,
      spin: (Math.random() - 0.5) * 8,
    });
  }

  // крест-порез на карточке
  const scar = new Graphics();
  crisp.addChild(scar);

  await tweens.to(
    0.5,
    (t) => {
      for (const d of drops) {
        d.g.x = x + d.vx * t;
        d.g.y = y + d.vy * t + 90 * t * t;
        d.g.rotation = d.spin * t;
        d.g.alpha = 1 - t;
        d.g.scale.set(1 - t * 0.3);
      }
      scar.clear();
      const len = 18 + t * 8;
      scar
        .moveTo(x - len, y - len * 0.3)
        .lineTo(x + len, y + len * 0.3)
        .stroke({ color: 0x8a1020, width: 2.5, alpha: 0.7 * (1 - t * 0.5) });
      scar
        .moveTo(x - len * 0.5, y + len * 0.5)
        .lineTo(x + len * 0.6, y - len * 0.4)
        .stroke({ color: 0xc02030, width: 1.8, alpha: 0.55 * (1 - t * 0.5) });
    },
    { ease: easeOutCubic },
  );

  // bleed pulse
  const bleed = new Sprite(TEX.bloodGlow());
  bleed.anchor.set(0.5);
  bleed.position.set(x, y - 20);
  glow.addChild(bleed);
  await tweens.to(0.4, (t) => {
    bleed.scale.set(0.25 + t * 0.35);
    bleed.alpha = (1 - t) * 0.7;
    scar.alpha = 1 - t;
  });

  prep.destroy();
  slashG.destroy();
  trailG.destroy();
  scar.destroy();
  bleed.destroy();
  for (const d of drops) d.g.destroy();
  glow.filters = null;
  root.destroy({ children: true });
}
