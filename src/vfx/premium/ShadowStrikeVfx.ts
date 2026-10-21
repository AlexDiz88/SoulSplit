import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeInOutQuad, easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Премиум теневой удар: dissolve → теневой рывок → удар из тьмы. */
export async function playShadowStrikeVfx(
  layer: Container,
  tweens: TweenManager,
  from: Pt,
  to: Pt,
  onArrive?: () => void,
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

  // dissolve at caster
  const pool = new Sprite(TEX.shadowGlow());
  pool.anchor.set(0.5);
  pool.position.set(from.x, from.y);
  glow.addChild(pool);

  const wisps: { g: Graphics; a: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const g = new Graphics();
    g.ellipse(0, 0, 4 + Math.random() * 5, 8 + Math.random() * 8).fill({
      color: 0x2a1838,
      alpha: 0.7,
    });
    crisp.addChild(g);
    wisps.push({ g, a: (Math.PI * 2 * i) / 12 });
  }

  const dissolveCard = new Graphics();
  crisp.addChild(dissolveCard);

  await tweens.to(0.35, (t) => {
    pool.scale.set(0.3 + t * 0.7);
    pool.alpha = 0.5 + t * 0.3;
    dissolveCard.clear();
    dissolveCard.roundRect(from.x - 28, from.y - 28, 56, 56, 7).fill({
      color: 0x1a1028,
      alpha: 0.55 * (1 - t),
    });
    dissolveCard.roundRect(from.x - 28, from.y - 28, 56, 56, 7).stroke({
      color: 0x9b7bb8,
      width: 2,
      alpha: 1 - t,
    });
    // частицы уходят внутрь
    for (const w of wisps) {
      const r = 30 * (1 - t);
      w.g.position.set(from.x + Math.cos(w.a + t * 3) * r, from.y + Math.sin(w.a + t * 3) * r);
      w.g.alpha = 0.8 * (1 - t * 0.5);
      w.g.scale.set(1 - t * 0.4);
    }
  });
  dissolveCard.destroy();

  // dash clones along path
  const clones: Graphics[] = [];
  for (let i = 0; i < 7; i++) {
    const g = new Graphics();
    g.roundRect(-24, -24, 48, 48, 7).fill({ color: 0x1a1028, alpha: 0.65 });
    g.roundRect(-24, -24, 48, 48, 7).stroke({ color: 0x9b7bb8, width: 2, alpha: 0.8 });
    // «глаза» тени
    g.circle(-8, -4, 2).fill({ color: 0xc8a0e8, alpha: 0.9 });
    g.circle(8, -4, 2).fill({ color: 0xc8a0e8, alpha: 0.9 });
    crisp.addChild(g);
    clones.push(g);
  }

  const dashGlow = new Sprite(TEX.shadowGlow());
  dashGlow.anchor.set(0.5);
  glow.addChild(dashGlow);

  const ribbon = new Graphics();
  ribbon.blendMode = "add";
  glow.addChild(ribbon);

  await tweens.to(
    0.4,
    (t) => {
      const ease = easeInOutQuad(t);
      const x = lerp(from.x, to.x, ease);
      const y = lerp(from.y, to.y, ease);
      dashGlow.position.set(x, y);
      dashGlow.scale.set(0.5 + Math.sin(t * 20) * 0.1);
      dashGlow.alpha = 0.6;

      clones.forEach((c, i) => {
        const tt = Math.max(0, ease - i * 0.06);
        c.x = lerp(from.x, to.x, tt);
        c.y = lerp(from.y, to.y, tt);
        c.alpha = 0.55 * (1 - t) * (1 - i * 0.08);
        c.scale.set(1 - t * 0.25 - i * 0.03);
        c.rotation = Math.sin(t * 8 + i) * 0.08;
      });

      // лента тени
      ribbon.clear();
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const u0 = Math.max(0, ease - i * 0.04);
        const u1 = Math.max(0, ease - (i + 1) * 0.04);
        const x0 = lerp(from.x, to.x, u0);
        const y0 = lerp(from.y, to.y, u0);
        const x1 = lerp(from.x, to.x, u1);
        const y1 = lerp(from.y, to.y, u1);
        ribbon
          .moveTo(x0, y0)
          .lineTo(x1, y1)
          .stroke({
            color: 0x9b7bb8,
            width: 10 * (1 - i / steps),
            alpha: 0.35 * (1 - i / steps),
          });
      }

      pool.alpha = (1 - t) * 0.4;
      for (const w of wisps) {
        w.g.x = lerp(w.g.x, x, 0.2);
        w.g.y = lerp(w.g.y, y, 0.2);
        w.g.alpha = (1 - t) * 0.5;
      }
    },
    { ease: (t) => t },
  );

  for (const c of clones) c.destroy();
  ribbon.destroy();
  for (const w of wisps) w.g.destroy();
  pool.destroy();

  // impact from shadow
  screenShake?.(10, 0.16);
  onArrive?.();

  const burst = new Sprite(TEX.shadowGlow());
  burst.anchor.set(0.5);
  burst.position.set(to.x, to.y);
  glow.addChild(burst);

  const slash = new Graphics();
  crisp.addChild(slash);
  const petals: { g: Graphics; a: number; spd: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const g = new Graphics();
    g.moveTo(0, 0)
      .lineTo(12 + Math.random() * 10, -3)
      .lineTo(8, 3)
      .fill({ color: 0x6a3a8a, alpha: 0.9 });
    g.position.set(to.x, to.y);
    crisp.addChild(g);
    petals.push({ g, a: (Math.PI * 2 * i) / 14, spd: 80 + Math.random() * 120 });
  }

  // фиолетовый slash поверх
  await tweens.to(
    0.45,
    (t) => {
      burst.scale.set(0.4 + t * 1.6);
      burst.alpha = (1 - t) * 0.85;
      dashGlow.position.set(to.x, to.y);
      dashGlow.alpha = (1 - t) * 0.5;

      slash.clear();
      const a = -0.6 + t * 1.4;
      const r = 38;
      slash
        .moveTo(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r - 8)
        .lineTo(to.x + Math.cos(a + 0.9) * r, to.y + Math.sin(a + 0.9) * r + 8)
        .stroke({ color: 0xc8a0e8, width: 5, alpha: 1 - t * 0.3 });
      slash
        .moveTo(to.x + Math.cos(a) * (r - 6), to.y + Math.sin(a) * (r - 6))
        .lineTo(to.x + Math.cos(a + 0.85) * (r - 6), to.y + Math.sin(a + 0.85) * (r - 6))
        .stroke({ color: 0xffffff, width: 2, alpha: 0.7 * (1 - t) });

      // тьма-кольцо
      slash.circle(to.x, to.y, 15 + t * 40).stroke({
        color: 0x9b7bb8,
        width: 3 * (1 - t),
        alpha: (1 - t) * 0.7,
      });

      for (const p of petals) {
        p.g.x = to.x + Math.cos(p.a) * p.spd * t;
        p.g.y = to.y + Math.sin(p.a) * p.spd * t;
        p.g.alpha = 1 - t;
        p.g.rotation = p.a + t * 4;
      }
    },
    { ease: easeOutCubic },
  );

  // reappear flicker at home
  const homeFlash = new Sprite(TEX.shadowGlow());
  homeFlash.anchor.set(0.5);
  homeFlash.position.set(from.x, from.y);
  glow.addChild(homeFlash);
  await tweens.to(0.3, (t) => {
    homeFlash.scale.set(0.3 + (1 - t) * 0.5);
    homeFlash.alpha = (1 - t) * 0.7;
  });

  burst.destroy();
  slash.destroy();
  dashGlow.destroy();
  homeFlash.destroy();
  for (const p of petals) p.g.destroy();
  glow.filters = null;
  root.destroy({ children: true });
}
