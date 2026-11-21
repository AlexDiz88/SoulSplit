import { BlurFilter, Container, Graphics } from "pixi.js";
import type { TweenManager } from "../../util/tween";

type Pt = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const ARCANE = 0xc45ad4;
const ARCANE_HOT = 0xe8c0ff;
const ARCANE_CORE = 0xf4e8ff;

/** Линейный полёт - вылет совпадает с тиком канала, без замедления в конце. */
const linear = (t: number): number => t;

/** Премиум: фиолетовый снаряд аркана с хвостом и вспышкой удара. */
export async function playArcaneMissileVfx(
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

  const glow = new Container();
  glow.blendMode = "add";
  glow.filters = [new BlurFilter({ strength: 2, quality: 2 })];
  root.addChild(glow);
  const crisp = new Container();
  root.addChild(crisp);

  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  // Быстрый вылет: тик канала = момент старта снаряда, без длинного хвоста после полосы.
  const dur = Math.max(0.08, dist / 2000);

  // Дуло сразу в кадре тика (tween обновится только на следующем кадре).
  const muzzle = new Graphics();
  muzzle.circle(0, 0, 16).fill({ color: ARCANE, alpha: 0.45 });
  muzzle.circle(0, 0, 7).fill({ color: ARCANE_CORE, alpha: 0.95 });
  muzzle.position.set(from.x, from.y);
  crisp.addChild(muzzle);
  void tweens.to(
    0.1,
    (mt) => {
      if (muzzle.destroyed) return;
      muzzle.alpha = 1 - mt;
      muzzle.scale.set(1 + mt * 0.6);
    },
    { ease: linear },
  );

  const mote = new Graphics();
  glow.addChild(mote);
  const bolt = new Graphics();
  crisp.addChild(bolt);
  bolt
    .roundRect(-10, -4, 20, 8, 3)
    .fill({ color: ARCANE_CORE, alpha: 0.95 });
  bolt.rotation = ang;
  bolt.position.set(from.x, from.y);

  type Trail = { g: Graphics };
  const trails: Trail[] = [];

  await tweens.to(
    dur,
    (t) => {
      const x = lerp(from.x, to.x, t);
      const y = lerp(from.y, to.y, t);
      const pulse = 1 + Math.sin(t * 42) * 0.1;

      mote.clear();
      mote.circle(x, y, 9 * pulse).fill({ color: ARCANE, alpha: 0.35 });
      mote.circle(x, y, 4.5 * pulse).fill({ color: ARCANE_HOT, alpha: 0.55 });

      bolt.clear();
      const len = 20 * pulse;
      bolt
        .roundRect(-len * 0.45, -3.5, len, 7, 3)
        .fill({ color: ARCANE_CORE, alpha: 0.95 });
      bolt.rotation = ang;
      bolt.position.set(x, y);

      if (Math.random() < 0.45) {
        const g = new Graphics();
        g.circle(0, 0, 2.5 + Math.random() * 2).fill({ color: ARCANE_HOT, alpha: 0.8 });
        g.position.set(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6);
        glow.addChild(g);
        trails.push({ g });
      }

      for (let i = trails.length - 1; i >= 0; i--) {
        const tr = trails[i]!;
        tr.g.alpha -= 0.1;
        tr.g.scale.set(tr.g.scale.x * 0.95);
        if (tr.g.alpha <= 0) {
          tr.g.destroy();
          trails.splice(i, 1);
        }
      }
    },
    {
      ease: linear,
      complete: () => {
        screenShake?.(3.5, 0.1);
        onImpact?.();
      },
    },
  );

  const burst = new Graphics();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    burst
      .moveTo(0, 0)
      .lineTo(Math.cos(a) * 14, Math.sin(a) * 14)
      .stroke({ color: ARCANE_HOT, width: 2.2, alpha: 0.9 });
  }
  burst.circle(0, 0, 8).fill({ color: ARCANE_CORE, alpha: 0.85 });
  burst.position.set(to.x, to.y);
  crisp.addChild(burst);
  await tweens.to(
    0.12,
    (bt) => {
      if (burst.destroyed) return;
      burst.alpha = 1 - bt;
      burst.scale.set(1 + bt * 0.7);
    },
    { ease: linear },
  );

  for (const tr of trails) {
    if (!tr.g.destroyed) tr.g.destroy();
  }
  if (!muzzle.destroyed) muzzle.destroy();
  if (!mote.destroyed) mote.destroy();
  if (!bolt.destroyed) bolt.destroy();
  if (!root.destroyed) root.destroy({ children: true });
}
