import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

function drawSnowflake(g: Graphics, size: number, color: number, alpha: number): void {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    g.moveTo(0, 0)
      .lineTo(Math.cos(a) * size, Math.sin(a) * size)
      .stroke({ color, width: 1.5, alpha });
    const mx = Math.cos(a) * size * 0.55;
    const my = Math.sin(a) * size * 0.55;
    const px = -Math.sin(a) * size * 0.2;
    const py = Math.cos(a) * size * 0.2;
    g.moveTo(mx - px, my - py)
      .lineTo(mx + px, my + py)
      .stroke({ color, width: 1.1, alpha: alpha * 0.85 });
  }
}

/** Премиум ледяной щит: сборка кристаллической оболочки вокруг карточки. */
export async function playIceShieldVfx(
  layer: Container,
  tweens: TweenManager,
  x: number,
  y: number,
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

  // летящие осколки к цели
  type Shard = { g: Graphics; fromA: number; fromR: number };
  const shards: Shard[] = [];
  for (let i = 0; i < 16; i++) {
    const g = new Graphics();
    const len = 8 + Math.random() * 12;
    g.moveTo(0, 0)
      .lineTo(len, -2)
      .lineTo(len * 0.6, 3)
      .fill({ color: 0xa8e8ff, alpha: 0.95 });
    g.moveTo(1, 0)
      .lineTo(len * 0.7, -1)
      .stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
    crisp.addChild(g);
    shards.push({ g, fromA: (Math.PI * 2 * i) / 16 + Math.random() * 0.2, fromR: 70 + Math.random() * 40 });
  }

  await tweens.to(0.4, (t) => {
    const k = easeOutCubic(t);
    for (const s of shards) {
      const r = s.fromR * (1 - k);
      s.g.position.set(x + Math.cos(s.fromA) * r, y + Math.sin(s.fromA) * r);
      s.g.rotation = s.fromA + Math.PI;
      s.g.alpha = 0.4 + t * 0.6;
      s.g.scale.set(0.6 + t * 0.5);
    }
  });
  for (const s of shards) s.g.destroy();

  // оболочка
  const aura = new Sprite(TEX.iceGlow());
  aura.anchor.set(0.5);
  aura.position.set(x, y);
  glow.addChild(aura);

  const shell = new Graphics();
  crisp.addChild(shell);
  const flakes: Graphics[] = [];
  for (let i = 0; i < 8; i++) {
    const f = new Graphics();
    drawSnowflake(f, 5 + (i % 3), 0xd8f4ff, 0.9);
    crisp.addChild(f);
    flakes.push(f);
  }

  const frost = new Graphics();
  crisp.addChildAt(frost, 0);

  await tweens.to(0.85, (t) => {
    const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.05;
    aura.scale.set((0.55 + t * 0.35) * pulse);
    aura.alpha = 0.35 + (1 - t) * 0.35;

    shell.clear();
    // кристаллическая рамка вокруг карточки
    const hw = 34 * pulse;
    const hh = 34 * pulse;
    // внешнее свечение-рамка
    shell.roundRect(x - hw, y - hh, hw * 2, hh * 2, 8).stroke({
      color: 0x7ec8e8,
      width: 3.5,
      alpha: 0.55 + Math.sin(t * 12) * 0.2,
    });
    shell.roundRect(x - hw + 4, y - hh + 4, hw * 2 - 8, hh * 2 - 8, 6).fill({
      color: 0x7ec8e8,
      alpha: 0.12 + (1 - t) * 0.08,
    });
    // грани-кристаллы по углам
    const corners = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ] as const;
    for (const [cx, cy] of corners) {
      const px = x + cx;
      const py = y + cy;
      shell
        .moveTo(px, py)
        .lineTo(px + Math.sign(cx) * 10, py)
        .lineTo(px, py + Math.sign(cy) * 10)
        .fill({ color: 0xc8f0ff, alpha: 0.85 });
    }
    // вращающиеся грани
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + t * 2.5;
      const r = 38 * pulse;
      shell
        .moveTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4))
        .lineTo(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6))
        .stroke({ color: 0xd0f0ff, width: 2, alpha: 0.7 });
    }

    flakes.forEach((f, i) => {
      const a = (Math.PI * 2 * i) / flakes.length + t * 2;
      f.position.set(x + Math.cos(a) * 40, y + Math.sin(a) * 40);
      f.rotation = a + t * 3;
      f.alpha = 0.5 + Math.sin(t * 10 + i) * 0.4;
    });

    frost.clear();
    frost.ellipse(x, y + 22, 36 * pulse, 14).fill({ color: 0xa8d8f0, alpha: 0.2 });
  });

  // остаточная пульсация коротко
  await tweens.to(0.45, (t) => {
    aura.alpha = (1 - t) * 0.4;
    shell.alpha = 1 - t * 0.5;
    for (const f of flakes) f.alpha = (1 - t) * 0.6;
  });

  aura.destroy();
  shell.destroy();
  frost.destroy();
  for (const f of flakes) f.destroy();
  glow.filters = null;
  root.destroy({ children: true });
}
