import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutBack, easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

function crystalFacet(g: Graphics, cx: number, cy: number, scale: number, rot: number, alpha: number): void {
  const pts: Pt[] = [
    { x: 0, y: -28 },
    { x: 16, y: -8 },
    { x: 12, y: 22 },
    { x: 0, y: 30 },
    { x: -12, y: 22 },
    { x: -16, y: -8 },
  ];
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const mapped = pts.map((p) => ({
    x: cx + (p.x * cos - p.y * sin) * scale,
    y: cy + (p.x * sin + p.y * cos) * scale,
  }));
  g.moveTo(mapped[0]!.x, mapped[0]!.y);
  for (let i = 1; i < mapped.length; i++) g.lineTo(mapped[i]!.x, mapped[i]!.y);
  g.closePath().fill({ color: 0x9ad8f0, alpha: alpha * 0.35 });
  g.moveTo(mapped[0]!.x, mapped[0]!.y);
  for (let i = 1; i < mapped.length; i++) g.lineTo(mapped[i]!.x, mapped[i]!.y);
  g.closePath().stroke({ color: 0xe8f7ff, width: 1.8, alpha });
}

/**
 * Кристальная клетка: рост граней вокруг цели → смыкание → вспышка.
 */
export async function playCrystalCageVfx(
  layer: Container,
  tweens: TweenManager,
  x: number,
  y: number,
  onSeal?: () => void,
  screenShake?: (amp: number, dur: number) => void,
): Promise<void> {
  const root = new Container();
  root.eventMode = "none";
  layer.addChild(root);

  const glow = new Container();
  glow.blendMode = "add";
  glow.filters = [new BlurFilter({ strength: 2.2, quality: 2 })];
  root.addChild(glow);
  const crisp = new Container();
  root.addChild(crisp);

  const mist = new Sprite(TEX.frostMist());
  mist.anchor.set(0.5);
  mist.position.set(x, y);
  mist.scale.set(0.3);
  mist.alpha = 0;
  glow.addChild(mist);

  const core = new Sprite(TEX.iceGlow());
  core.anchor.set(0.5);
  core.position.set(x, y);
  core.scale.set(0.2);
  core.alpha = 0;
  glow.addChild(core);

  const cage = new Graphics();
  crisp.addChild(cage);
  const shards = new Graphics();
  crisp.addChild(shards);

  let sealed = false;
  await tweens.to(0.55, (t) => {
    const e = easeOutBack(Math.min(1, t * 1.05));
    mist.alpha = e * 0.7;
    mist.scale.set(0.35 + e * 0.55);
    core.alpha = e * 0.85;
    core.scale.set(0.25 + e * 0.55);
    cage.clear();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + e * 0.4;
      const dist = 38 * (1.35 - e * 0.55);
      crystalFacet(cage, x + Math.cos(a) * dist, y + Math.sin(a) * dist * 0.9, 0.55 + e * 0.55, a + Math.PI / 2, 0.45 + e * 0.5);
    }
    cage.circle(x, y, 10 + e * 18).stroke({ color: 0xffffff, width: 2, alpha: e * 0.7 });
    if (!sealed && t >= 0.72) {
      sealed = true;
      screenShake?.(6, 0.12);
      onSeal?.();
    }
  });

  if (!sealed) {
    screenShake?.(6, 0.12);
    onSeal?.();
  }

  await tweens.to(0.4, (t) => {
    const e = easeOutCubic(t);
    shards.clear();
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12 + e;
      const r = 20 + e * 40;
      shards
        .moveTo(x, y)
        .lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
        .stroke({ color: 0xc8efff, width: 1.6, alpha: (1 - e) * 0.85 });
    }
    mist.alpha = (1 - e) * 0.5;
    core.alpha = (1 - e) * 0.5;
    cage.alpha = 1 - e * 0.35;
  });

  await tweens.to(0.25, (t) => {
    root.alpha = 1 - t;
  });

  root.destroy({ children: true });
}
