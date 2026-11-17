import { BlurFilter, Container, Graphics } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";

type Pt = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const ARCANE = 0xc45ad4;
const ARCANE_HOT = 0xe8c0ff;
const ARCANE_CORE = 0xf4e8ff;

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

  const mote = new Graphics();
  glow.addChild(mote);
  const bolt = new Graphics();
  crisp.addChild(bolt);

  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const dur = Math.max(0.14, dist / 920);

  type Trail = { g: Graphics; max: number };
  const trails: Trail[] = [];

  await tweens.to(
    dur,
  (t) => {
      const e = easeOutCubic(t);
      const x = lerp(from.x, to.x, e);
      const y = lerp(from.y, to.y, e);
      const pulse = 1 + Math.sin(t * 42) * 0.12;

      mote.clear();
      mote.circle(x, y, 10 * pulse).fill({ color: ARCANE, alpha: 0.35 });
      mote.circle(x, y, 5 * pulse).fill({ color: ARCANE_HOT, alpha: 0.55 });

      bolt.clear();
      const len = 22 * pulse;
      const ang = Math.atan2(to.y - from.y, to.x - from.x);
      bolt
        .roundRect(-len * 0.45, -4, len, 8, 3)
        .fill({ color: ARCANE_CORE, alpha: 0.95 });
      bolt.rotation = ang;
      bolt.position.set(x, y);

      if (Math.random() < 0.5) {
        const g = new Graphics();
        g.circle(0, 0, 3 + Math.random() * 2).fill({ color: ARCANE_HOT, alpha: 0.8 });
        g.position.set(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8);
        glow.addChild(g);
        trails.push({ g, max: 0.22 + Math.random() * 0.12 });
      }

      for (let i = trails.length - 1; i >= 0; i--) {
        const tr = trails[i]!;
        tr.g.alpha -= 0.08;
        tr.g.scale.set(tr.g.scale.x * 0.96);
        if (tr.g.alpha <= 0) {
          tr.g.destroy();
          trails.splice(i, 1);
        }
      }
    },
    {
      complete: () => {
        screenShake?.(3.5, 0.12);
        onImpact?.();
        const burst = new Graphics();
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8;
          burst
            .moveTo(0, 0)
            .lineTo(Math.cos(a) * 16, Math.sin(a) * 16)
            .stroke({ color: ARCANE_HOT, width: 2.5, alpha: 0.9 });
        }
        burst.circle(0, 0, 9).fill({ color: ARCANE_CORE, alpha: 0.85 });
        burst.position.set(to.x, to.y);
        crisp.addChild(burst);
        void tweens.to(0.2, (bt) => {
          burst.alpha = 1 - bt;
          burst.scale.set(1 + bt * 0.8);
        });
      },
    },
  );

  for (const tr of trails) tr.g.destroy();
  mote.destroy();
  bolt.destroy();
  root.destroy({ children: true });
}