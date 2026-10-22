import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";

type Pt = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Премиум огненный шар: заряд → шар по прямой → взрыв + ожоги. */
export async function playFireballVfx(
  layer: Container,
  tweens: TweenManager,
  from: Pt,
  to: Pt,
  aoeCenters: Pt[],
  onImpact?: () => void,
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

  // заряд
  const charge = new Sprite(TEX.fireGlow());
  charge.anchor.set(0.5);
  charge.position.set(from.x, from.y);
  glow.addChild(charge);
  await tweens.to(0.28, (t) => {
    charge.scale.set(0.2 + t * 0.7);
    charge.alpha = 0.3 + t * 0.7;
  });

  // шар
  const ball = new Container();
  crisp.addChild(ball);
  const ballGlow = new Sprite(TEX.fireGlow());
  ballGlow.anchor.set(0.5);
  glow.addChild(ballGlow);
  const core = new Sprite(TEX.fireCore());
  core.anchor.set(0.5);
  ball.addChild(core);
  const shell = new Graphics();
  ball.addChild(shell);

  type Ember = { s: Sprite; life: number; max: number; vx: number; vy: number };
  const embers: Ember[] = [];
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const dur = Math.max(0.16, dist / 880);

  await tweens.to(
    dur,
    (t) => {
      const x = lerp(from.x, to.x, t);
      const y = lerp(from.y, to.y, t);
      const pulse = 1 + Math.sin(t * 28) * 0.08;
      ball.position.set(x, y);
      ballGlow.position.set(x, y);
      ballGlow.scale.set((0.55 + t * 0.25) * pulse);
      ballGlow.alpha = 0.7;
      core.scale.set(0.55 * pulse);
      core.rotation = t * 8;

      shell.clear();
      // хаотичная "пламенная" оболочка
      const spikes = 10;
      for (let i = 0; i < spikes; i++) {
        const a = (Math.PI * 2 * i) / spikes + t * 6;
        const r = (12 + Math.sin(t * 20 + i * 2) * 5) * pulse;
        const r2 = r * (0.55 + (i % 3) * 0.12);
        shell
          .moveTo(Math.cos(a) * r2 * 0.3, Math.sin(a) * r2 * 0.3)
          .lineTo(Math.cos(a) * r, Math.sin(a) * r)
          .lineTo(Math.cos(a + 0.25) * r2, Math.sin(a + 0.25) * r2)
          .fill({ color: i % 2 ? 0xff6a20 : 0xffa040, alpha: 0.75 });
      }
      shell.circle(0, 0, 8 * pulse).fill({ color: 0xffe080, alpha: 0.9 });
      shell.circle(0, 0, 4 * pulse).fill({ color: 0xffffff, alpha: 0.85 });

      charge.alpha = (1 - t) * 0.4;

      if (Math.random() < 0.65) {
        const s = new Sprite(TEX.ember());
        s.anchor.set(0.5);
        s.blendMode = "add";
        s.position.set(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10);
        s.scale.set(0.15 + Math.random() * 0.2);
        crisp.addChild(s);
        embers.push({
          s,
          life: 0,
          max: 0.35 + Math.random() * 0.25,
          vx: (Math.random() - 0.5) * 60,
          vy: 20 + Math.random() * 40,
        });
      }
      const dt = 1 / 60;
      for (const e of embers) {
        e.life += dt;
        e.s.x += e.vx * dt;
        e.s.y += e.vy * dt;
        e.s.alpha = Math.max(0, 1 - e.life / e.max);
      }
    },
    { ease: (t) => t },
  );

  ball.destroy({ children: true });
  ballGlow.destroy();
  charge.destroy();
  for (const e of embers) e.s.destroy();

  // взрыв
  screenShake?.(14, 0.22);
  onImpact?.();

  const boom = new Sprite(TEX.fireGlow());
  boom.anchor.set(0.5);
  boom.position.set(to.x, to.y);
  glow.addChild(boom);

  const shock = new Graphics();
  crisp.addChild(shock);
  const sparks: { g: Graphics; vx: number; vy: number }[] = [];
  for (let i = 0; i < 32; i++) {
    const g = new Graphics();
    const a = (Math.PI * 2 * i) / 32 + Math.random() * 0.3;
    const len = 8 + Math.random() * 18;
    g.moveTo(0, 0)
      .lineTo(len, -2)
      .lineTo(len * 0.5, 2)
      .fill({ color: Math.random() > 0.4 ? 0xff8a30 : 0xffe080, alpha: 0.95 });
    g.position.set(to.x, to.y);
    g.rotation = a;
    crisp.addChild(g);
    const spd = 120 + Math.random() * 260;
    sparks.push({ g, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd });
  }

  // ожоги AoE
  const scorches: Graphics[] = aoeCenters.map(() => {
    const g = new Graphics();
    crisp.addChildAt(g, 0);
    return g;
  });

  await tweens.to(
    0.55,
    (t) => {
      boom.scale.set(0.5 + t * 2.8);
      boom.alpha = (1 - t) * 0.9;
      shock.clear();
      shock.circle(to.x, to.y, 20 + t * 70).fill({ color: 0xff4a10, alpha: (1 - t) * 0.35 });
      shock.circle(to.x, to.y, 10 + t * 40).fill({ color: 0xffe090, alpha: (1 - t) * 0.55 });
      shock.circle(to.x, to.y, 30 + t * 80).stroke({
        color: 0xffaa44,
        width: 4 * (1 - t),
        alpha: (1 - t) * 0.8,
      });
      for (const s of sparks) {
        s.g.x = to.x + s.vx * t;
        s.g.y = to.y + s.vy * t + 70 * t * t;
        s.g.alpha = 1 - t;
        s.g.rotation += 0.15;
      }
      aoeCenters.forEach((p, i) => {
        const g = scorches[i]!;
        g.clear();
        g.ellipse(p.x, p.y + 4, 18 + t * 12, 10 + t * 5).fill({
          color: 0x1a0804,
          alpha: 0.4 * (1 - t * 0.35),
        });
        g.roundRect(p.x - 26, p.y - 26, 52, 52, 6).stroke({
          color: 0xff6020,
          width: 2,
          alpha: (1 - t) * 0.45,
        });
      });
    },
    { ease: easeOutCubic },
  );

  // вторичные вспышки на соседях
  await Promise.all(
    aoeCenters.map(async (p, i) => {
      if (i === 0) return;
      await tweens.wait(i * 0.03);
      const flash = new Sprite(TEX.fireCore());
      flash.anchor.set(0.5);
      flash.position.set(p.x, p.y);
      flash.blendMode = "add";
      glow.addChild(flash);
      await tweens.to(0.3, (t) => {
        flash.scale.set(0.3 + t * 1.2);
        flash.alpha = 1 - t;
      });
      flash.destroy();
    }),
  );

  boom.destroy();
  shock.destroy();
  for (const s of sparks) s.g.destroy();
  for (const g of scorches) {
    void tweens
      .to(0.9, (t) => {
        g.alpha = 1 - t;
      })
      .then(() => g.destroy());
  }
  glow.filters = null;
  root.destroy({ children: true });
}
