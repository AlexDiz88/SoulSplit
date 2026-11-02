import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeInOutQuad, easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Автоатака ближнего боя: короткий рывок кастера к цели + слэш/искры в момент удара.
 * onCasterLunge(t): 0 = дома, 1 = пик смещения к цели.
 */
export async function playMeleeStrikeVfx(
  layer: Container,
  tweens: TweenManager,
  from: Pt,
  to: Pt,
  onCasterLunge?: (t: number) => void,
  onHit?: () => void,
  screenShake?: (amp: number, dur: number) => void,
): Promise<void> {
  const root = new Container();
  root.eventMode = "none";
  layer.addChild(root);

  const glow = new Container();
  glow.blendMode = "add";
  glow.filters = [new BlurFilter({ strength: 1.6, quality: 2 })];
  root.addChild(glow);
  const crisp = new Container();
  root.addChild(crisp);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  // Точка удара чуть перед центром цели.
  const hitInset = Math.min(20, dist * 0.12);
  const hitX = to.x - Math.cos(ang) * hitInset;
  const hitY = to.y - Math.sin(ang) * hitInset;

  // Смещение рывка: доля дистанции, но не больше ~карточки.
  let lungeX = dx * 0.28;
  let lungeY = dy * 0.28;
  const lungeLen = Math.hypot(lungeX, lungeY) || 1;
  if (lungeLen > 38) {
    const s = 38 / lungeLen;
    lungeX *= s;
    lungeY *= s;
  }

  // Лёгкий afterimage во время рывка.
  const ghosts: Graphics[] = [];
  for (let i = 0; i < 3; i++) {
    const g = new Graphics();
    g.roundRect(-26, -26, 52, 52, 4).stroke({ color: 0xe8e2d4, width: 1.5, alpha: 0.35 });
    g.position.set(from.x, from.y);
    g.alpha = 0;
    crisp.addChild(g);
    ghosts.push(g);
  }

  // 1) Рывок вперёд.
  await tweens.to(
    0.11,
    (t) => {
      onCasterLunge?.(t);
      const cx = from.x + lungeX * t;
      const cy = from.y + lungeY * t;
      ghosts.forEach((g, i) => {
        const k = Math.max(0, t - i * 0.12);
        g.position.set(lerp(from.x, cx, k), lerp(from.y, cy, k));
        g.alpha = 0.4 * (1 - t) * (1 - i * 0.25);
        g.scale.set(1 - i * 0.06);
      });
    },
    { ease: easeOutCubic },
  );
  onCasterLunge?.(1);

  // 2) Удар.
  onHit?.();
  screenShake?.(5, 0.09);

  for (const g of ghosts) g.destroy();
  ghosts.length = 0;

  const flash = new Sprite(TEX.metalGlow());
  flash.anchor.set(0.5);
  flash.position.set(hitX, hitY);
  flash.scale.set(0.15);
  glow.addChild(flash);

  const slashG = new Graphics();
  crisp.addChild(slashG);
  const trailG = new Graphics();
  trailG.blendMode = "add";
  glow.addChild(trailG);

  const sparks: { g: Graphics; vx: number; vy: number; spin: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const g = new Graphics();
    const len = 4 + Math.random() * 9;
    g.moveTo(0, 0)
      .lineTo(len, -1.2)
      .lineTo(len * 0.45, 1.5)
      .fill({ color: Math.random() > 0.45 ? 0xfff6d8 : 0xe8e2d4, alpha: 0.95 });
    g.position.set(hitX, hitY);
    const spread = ang + (Math.random() - 0.5) * 1.4;
    const spd = 90 + Math.random() * 160;
    crisp.addChild(g);
    sparks.push({
      g,
      vx: Math.cos(spread) * spd,
      vy: Math.sin(spread) * spd,
      spin: (Math.random() - 0.5) * 10,
    });
  }

  // Слэш поперёк направления удара.
  const arcs = [
    { start: ang + Math.PI * 0.55, sweep: -Math.PI * 1.05, r: 30, width: 4.5, delay: 0 },
    { start: ang + Math.PI * 0.35, sweep: -Math.PI * 0.85, r: 22, width: 2.8, delay: 0.04 },
  ];

  // 3) Возврат кастера + роспуск удара параллельно.
  const returnP = tweens.to(
    0.17,
    (t) => {
      onCasterLunge?.(1 - t);
    },
    { ease: easeInOutQuad },
  );

  const impactP = tweens.to(0.28, (t) => {
    flash.scale.set(0.18 + t * 0.55);
    flash.alpha = (1 - t) * 0.85;

    slashG.clear();
    trailG.clear();
    for (const arc of arcs) {
      const local = Math.max(0, Math.min(1, (t - arc.delay) / 0.16));
      if (local <= 0) continue;
      const a0 = arc.start;
      const a1 = arc.start + arc.sweep * local;
      const steps = 12;
      for (let i = 0; i < steps; i++) {
        const u0 = i / steps;
        const ang0 = a0 + (a1 - a0) * u0;
        const ang1 = a0 + (a1 - a0) * ((i + 1) / steps);
        const fade = (1 - u0 * 0.45) * (1 - local * 0.35);
        slashG
          .moveTo(hitX + Math.cos(ang0) * arc.r, hitY + Math.sin(ang0) * arc.r)
          .lineTo(hitX + Math.cos(ang1) * arc.r, hitY + Math.sin(ang1) * arc.r)
          .stroke({
            color: 0xf2ebe0,
            width: arc.width * (1 - local * 0.35),
            alpha: fade,
          });
        trailG
          .moveTo(hitX + Math.cos(ang0) * (arc.r - 2), hitY + Math.sin(ang0) * (arc.r - 2))
          .lineTo(hitX + Math.cos(ang1) * (arc.r - 2), hitY + Math.sin(ang1) * (arc.r - 2))
          .stroke({
            color: 0xffe6a0,
            width: arc.width * 0.45,
            alpha: fade * 0.55,
          });
      }
      // Белая кромка на острие.
      slashG
        .moveTo(hitX + Math.cos(a1) * (arc.r - 3), hitY + Math.sin(a1) * (arc.r - 3))
        .lineTo(hitX + Math.cos(a1) * (arc.r + 3), hitY + Math.sin(a1) * (arc.r + 3))
        .stroke({ color: 0xffffff, width: 2, alpha: (1 - local) * 0.9 });
    }

    for (const s of sparks) {
      s.g.x = hitX + s.vx * t;
      s.g.y = hitY + s.vy * t + 40 * t * t;
      s.g.rotation = s.spin * t;
      s.g.alpha = 1 - t;
      s.g.scale.set(1 - t * 0.35);
    }
  });

  await Promise.all([returnP, impactP]);
  onCasterLunge?.(0);

  flash.destroy();
  slashG.destroy();
  trailG.destroy();
  for (const s of sparks) s.g.destroy();
  glow.filters = null;
  root.destroy({ children: true });
}
