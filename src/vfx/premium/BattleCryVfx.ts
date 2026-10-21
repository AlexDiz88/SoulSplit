import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

/** Премиум боевой клич: звуковые волны + бафф-ауры на союзниках. */
export async function playBattleCryVfx(
  layer: Container,
  tweens: TweenManager,
  origin: Pt,
  allies: Pt[],
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

  // заряд крика
  const mouth = new Sprite(TEX.goldGlow());
  mouth.anchor.set(0.5);
  mouth.position.set(origin.x, origin.y);
  glow.addChild(mouth);

  await tweens.to(0.25, (t) => {
    mouth.scale.set(0.3 + t * 0.6);
    mouth.alpha = 0.5 + t * 0.5;
  });

  screenShake?.(6, 0.12);

  // звуковые волны (концентрические + «лепестки»)
  const waves = new Graphics();
  crisp.addChild(waves);
  const notes: { g: Graphics; a: number; spd: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const g = new Graphics();
    // стилизованная «нота» / вспышка
    g.moveTo(0, -5)
      .lineTo(3, 0)
      .lineTo(0, 8)
      .lineTo(-3, 0)
      .closePath()
      .fill({ color: 0xffe6a0, alpha: 0.9 });
    g.circle(0, -7, 2.5).fill({ color: 0xfff2c0, alpha: 1 });
    crisp.addChild(g);
    notes.push({ g, a: (Math.PI * 2 * i) / 10, spd: 70 + Math.random() * 50 });
  }

  await tweens.to(0.7, (t) => {
    waves.clear();
    for (let w = 0; w < 4; w++) {
      const local = Math.max(0, Math.min(1, t * 1.4 - w * 0.18));
      if (local <= 0) continue;
      const r = 20 + local * 110;
      waves.circle(origin.x, origin.y, r).stroke({
        color: w % 2 ? 0xffe6a0 : 0xc9b896,
        width: 4 * (1 - local) + 1,
        alpha: (1 - local) * 0.75,
      });
      // зубчатый «звук»
      const teeth = 16;
      for (let i = 0; i < teeth; i++) {
        const a0 = (Math.PI * 2 * i) / teeth;
        const a1 = a0 + Math.PI / teeth;
        const rr = r + Math.sin(local * 20 + i) * 6;
        waves
          .moveTo(origin.x + Math.cos(a0) * r, origin.y + Math.sin(a0) * r)
          .lineTo(origin.x + Math.cos(a1) * rr, origin.y + Math.sin(a1) * rr)
          .stroke({ color: 0xffe6a0, width: 1.5, alpha: (1 - local) * 0.45 });
      }
    }
    mouth.scale.set(0.9 + Math.sin(t * 20) * 0.15);
    mouth.alpha = 0.7 * (1 - t * 0.5);

    for (const n of notes) {
      n.g.x = origin.x + Math.cos(n.a + t) * n.spd * t;
      n.g.y = origin.y + Math.sin(n.a + t) * n.spd * t - 20 * t;
      n.g.alpha = 1 - t;
      n.g.rotation = n.a + t * 3;
      n.g.scale.set(0.8 + t * 0.6);
    }
  });

  // бафф на союзниках
  await Promise.all(
    allies.map(async (p, idx) => {
      await tweens.wait(idx * 0.04);
      const g = new Sprite(TEX.goldGlow());
      g.anchor.set(0.5);
      g.position.set(p.x, p.y);
      glow.addChild(g);

      const aura = new Graphics();
      crisp.addChild(aura);
      const pillars: Graphics[] = [];
      for (let i = 0; i < 4; i++) {
        const pg = new Graphics();
        crisp.addChild(pg);
        pillars.push(pg);
      }

      await tweens.to(
        0.55,
        (t) => {
          g.scale.set(0.35 + t * 0.9);
          g.alpha = (1 - t) * 0.75;
          aura.clear();
          aura.roundRect(p.x - 32, p.y - 32, 64, 64, 8).stroke({
            color: 0xffe6a0,
            width: 2.5,
            alpha: 0.6 * (1 - t * 0.4),
          });
          aura.roundRect(p.x - 28, p.y - 28, 56, 56, 6).fill({
            color: 0xffe6a0,
            alpha: 0.1 * (1 - t),
          });
          // стрелки силы вверх
          pillars.forEach((pg, i) => {
            const ox = p.x + (i - 1.5) * 12;
            const h = 10 + t * 22;
            pg.clear();
            pg.moveTo(ox, p.y + 10 - h)
              .lineTo(ox + 4, p.y + 16 - h * 0.5)
              .lineTo(ox - 4, p.y + 16 - h * 0.5)
              .fill({ color: 0xffe6a0, alpha: 0.8 * (1 - t) });
            pg.moveTo(ox - 2, p.y + 16 - h * 0.5)
              .lineTo(ox + 2, p.y + 20)
              .stroke({ color: 0xffe6a0, width: 2, alpha: 0.7 * (1 - t) });
          });
        },
        { ease: easeOutCubic },
      );

      g.destroy();
      aura.destroy();
      for (const pg of pillars) pg.destroy();
    }),
  );

  mouth.destroy();
  waves.destroy();
  for (const n of notes) n.g.destroy();
  glow.filters = null;
  root.destroy({ children: true });
}
