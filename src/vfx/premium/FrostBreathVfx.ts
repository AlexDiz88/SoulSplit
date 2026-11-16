import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

/**
 * Морозное дыхание: поток инея по клеткам буквы Т + ударная изморозь.
 */
export async function playFrostBreathVfx(
  layer: Container,
  tweens: TweenManager,
  from: Pt,
  cells: Pt[],
  cellSize: number,
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

  const stream = new Graphics();
  glow.addChild(stream);
  const floor = new Graphics();
  crisp.addChild(floor);

  const flakes: Sprite[] = [];
  for (let i = 0; i < 18; i++) {
    const s = new Sprite(TEX.iceCore());
    s.anchor.set(0.5);
    s.scale.set(0.08 + Math.random() * 0.1);
    glow.addChild(s);
    flakes.push(s);
  }

  const ordered = [...cells].sort((a, b) => b.y - a.y);
  const tip = ordered[ordered.length - 1] ?? from;

  await tweens.to(0.48, (t) => {
    const e = easeOutCubic(t);
    stream.clear();
    const midX = from.x + (tip.x - from.x) * e;
    const midY = from.y + (tip.y - from.y) * e;
    stream.moveTo(from.x, from.y - 8);
    stream.lineTo(midX, midY);
    stream.stroke({ color: 0xb8e8ff, width: 18 * (1 - e * 0.35), alpha: 0.35 + e * 0.35 });
    stream.moveTo(from.x, from.y - 8);
    stream.lineTo(midX, midY);
    stream.stroke({ color: 0xffffff, width: 6, alpha: 0.45 + e * 0.35 });

    floor.clear();
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]!;
      const appear = Math.max(0, Math.min(1, (e * cells.length - i * 0.35) / 0.7));
      if (appear <= 0) continue;
      const half = cellSize * 0.42;
      floor.roundRect(c.x - half, c.y - half, half * 2, half * 2, 8).fill({
        color: 0x6ab8e0,
        alpha: 0.12 + appear * 0.22,
      });
      floor.roundRect(c.x - half, c.y - half, half * 2, half * 2, 8).stroke({
        color: 0xe8f7ff,
        width: 2,
        alpha: appear * 0.75,
      });
      floor.ellipse(c.x, c.y + half * 0.2, half * 0.7, half * 0.35).fill({
        color: 0xa8e6ff,
        alpha: appear * 0.2,
      });
    }

    for (let i = 0; i < flakes.length; i++) {
      const s = flakes[i]!;
      const cell = cells[i % Math.max(1, cells.length)] ?? tip;
      const prog = Math.min(1, e * 1.2 + (i % 5) * 0.05);
      s.position.set(
        from.x + (cell.x - from.x) * prog + Math.sin(i + e * 10) * 10,
        from.y + (cell.y - from.y) * prog + Math.cos(i * 1.3) * 8,
      );
      s.alpha = 0.25 + prog * 0.6;
      s.rotation = e * 4 + i;
    }
  });

  screenShake?.(7, 0.14);

  const burst = new Graphics();
  crisp.addChild(burst);
  await tweens.to(0.35, (t) => {
    const e = easeOutCubic(t);
    burst.clear();
    for (const c of cells) {
      burst.circle(c.x, c.y, 12 + e * 28).stroke({
        color: 0xffffff,
        width: 2.5 * (1 - e) + 1,
        alpha: (1 - e) * 0.85,
      });
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 + e;
        burst
          .moveTo(c.x, c.y)
          .lineTo(c.x + Math.cos(a) * (16 + e * 24), c.y + Math.sin(a) * (16 + e * 24))
          .stroke({ color: 0xc8efff, width: 1.3, alpha: 1 - e });
      }
    }
    floor.alpha = 1 - e * 0.7;
    stream.alpha = 1 - e;
    for (const s of flakes) s.alpha *= 1 - e * 0.8;
  });

  root.destroy({ children: true });
}
