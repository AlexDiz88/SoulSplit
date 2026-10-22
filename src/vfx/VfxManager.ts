import { Container, Graphics, Text } from "pixi.js";
import type { TweenManager } from "../util/tween";
import { easeOutCubic } from "../util/tween";
import { playBattleCryVfx } from "./premium/BattleCryVfx";
import { playFireballVfx } from "./premium/FireballVfx";
import { playFlameConeVfx } from "./premium/FlameConeVfx";
import { playIceArrowVfx } from "./premium/IceArrowVfx";
import { playIceShieldVfx } from "./premium/IceShieldVfx";
import { playShadowStrikeVfx } from "./premium/ShadowStrikeVfx";
import { playSeverArteryVfx } from "./premium/SeverArteryVfx";
import { playStunStrikeVfx } from "./premium/StunStrikeVfx";

export class VfxManager {
  readonly layer = new Container();
  private shakeTarget: Container | null = null;
  private shakeTime = 0;
  private shakeAmp = 0;
  private tweens: TweenManager;

  constructor(tweens: TweenManager) {
    this.tweens = tweens;
    this.layer.eventMode = "none";
  }

  setShakeTarget(container: Container): void {
    this.shakeTarget = container;
  }

  update(dt: number): void {
    if (!this.shakeTarget) return;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const a = this.shakeAmp * (this.shakeTime > 0 ? 1 : 0);
      this.shakeTarget.x += (Math.random() - 0.5) * a;
      this.shakeTarget.y += (Math.random() - 0.5) * a;
    }
  }

  screenShake(amp = 6, duration = 0.12): void {
    this.shakeAmp = amp;
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  async flashCircle(x: number, y: number, color: number, radius: number, duration = 0.35): Promise<void> {
    const g = new Graphics();
    this.layer.addChild(g);
    await this.tweens.to(duration, (t) => {
      const r = radius * (0.4 + t * 0.8);
      const alpha = 1 - t;
      g.clear();
      g.circle(x, y, r).fill({ color, alpha: alpha * 0.55 });
      g.circle(x, y, r * 0.55).stroke({ color: 0xffffff, width: 2, alpha: alpha });
    });
    g.destroy();
  }

  async ring(x: number, y: number, color: number, maxR: number, duration = 0.45): Promise<void> {
    const g = new Graphics();
    this.layer.addChild(g);
    await this.tweens.to(
      duration,
      (t) => {
        g.clear();
        g.circle(x, y, maxR * t).stroke({ color, width: 4 * (1 - t) + 1, alpha: 1 - t });
      },
      { ease: easeOutCubic },
    );
    g.destroy();
  }

  async projectile(
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: number,
    opts?: { size?: number; trail?: boolean; arc?: number; duration?: number },
  ): Promise<void> {
    const size = opts?.size ?? 10;
    const duration = opts?.duration ?? 0.35;
    const arc = opts?.arc ?? 0;
    const g = new Graphics();
    this.layer.addChild(g);
    const trail: Graphics[] = [];

    await this.tweens.to(duration, (t) => {
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * arc;
      g.clear();
      g.circle(x, y, size).fill({ color, alpha: 0.95 });
      g.circle(x, y, size * 0.45).fill({ color: 0xffffff, alpha: 0.7 });

      if (opts?.trail && t > 0.05) {
        const tg = new Graphics();
        tg.circle(x, y, size * 0.55).fill({ color, alpha: 0.35 });
        this.layer.addChild(tg);
        trail.push(tg);
        if (trail.length > 8) {
          const old = trail.shift();
          old?.destroy();
        }
      }
    });

    g.destroy();
    for (const t of trail) t.destroy();
  }

  /** Премиум: заряд → кристалл → иней → shatter */
  async iceArrow(
    from: { x: number; y: number },
    to: { x: number; y: number },
    onImpact?: () => void,
  ): Promise<void> {
    await playIceArrowVfx(
      this.layer,
      this.tweens,
      from,
      to,
      onImpact,
      (amp, dur) => this.screenShake(amp, dur),
    );
  }

  async iceShatter(x: number, y: number): Promise<void> {
    // fallback / legacy — упрощённый shatter
    const shards: { g: Graphics; vx: number; vy: number; rot: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const g = new Graphics();
      const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
      const len = 8 + Math.random() * 14;
      g.moveTo(0, 0)
        .lineTo(Math.cos(ang) * len, Math.sin(ang) * len)
        .lineTo(Math.cos(ang + 0.2) * (len * 0.4), Math.sin(ang + 0.2) * (len * 0.4))
        .fill({ color: 0xa8e6ff, alpha: 0.95 });
      g.position.set(x, y);
      this.layer.addChild(g);
      shards.push({
        g,
        vx: Math.cos(ang) * (80 + Math.random() * 120),
        vy: Math.sin(ang) * (80 + Math.random() * 120),
        rot: (Math.random() - 0.5) * 8,
      });
    }
    await this.tweens.to(0.45, (t) => {
      for (const s of shards) {
        s.g.x = x + s.vx * t;
        s.g.y = y + s.vy * t + 40 * t * t;
        s.g.rotation = s.rot * t;
        s.g.alpha = 1 - t;
      }
    });
    for (const s of shards) s.g.destroy();
  }

  /** Премиум: огненный шар по прямой + взрыв */
  async fireball(
    from: { x: number; y: number },
    to: { x: number; y: number },
    aoeCenters: { x: number; y: number }[],
    onImpact?: () => void,
  ): Promise<void> {
    await playFireballVfx(
      this.layer,
      this.tweens,
      from,
      to,
      aoeCenters,
      onImpact,
      (amp, dur) => this.screenShake(amp, dur),
    );
  }

  /** Премиум: telegraph → турбулентный конус → угли/дым → ожоги */
  async flameCone(
    origin: { x: number; y: number },
    targets: { x: number; y: number }[],
    cellSize = 124,
  ): Promise<void> {
    await playFlameConeVfx(
      this.layer,
      this.tweens,
      origin,
      targets,
      (amp, dur) => this.screenShake(amp, dur),
      cellSize,
    );
  }

  async stunStrike(
    from: { x: number; y: number },
    to: { x: number; y: number },
    onCasterLunge?: (t: number) => void,
    onImpact?: () => void,
  ): Promise<void> {
    await playStunStrikeVfx(
      this.layer,
      this.tweens,
      from,
      to,
      onCasterLunge,
      onImpact,
      (amp, dur) => this.screenShake(amp, dur),
    );
  }

  async battleCry(origin: { x: number; y: number }, allies: { x: number; y: number }[]): Promise<void> {
    await playBattleCryVfx(this.layer, this.tweens, origin, allies, (amp, dur) =>
      this.screenShake(amp, dur),
    );
  }

  async severArtery(
    x: number,
    y: number,
    onHit?: () => void,
  ): Promise<void> {
    await playSeverArteryVfx(this.layer, this.tweens, x, y, onHit, (amp, dur) => this.screenShake(amp, dur));
  }

  async shadowDash(
    from: { x: number; y: number },
    to: { x: number; y: number },
    onArrive?: () => void,
  ): Promise<void> {
    await playShadowStrikeVfx(
      this.layer,
      this.tweens,
      from,
      to,
      onArrive,
      (amp, dur) => this.screenShake(amp, dur),
    );
  }

  async iceShieldAura(x: number, y: number, radius?: number): Promise<void> {
    await playIceShieldVfx(this.layer, this.tweens, x, y, radius);
  }

  async autoAttackBolt(
    from: { x: number; y: number },
    to: { x: number; y: number },
    melee: boolean,
  ): Promise<void> {
    if (melee) {
      const g = new Graphics();
      this.layer.addChild(g);
      await this.tweens.to(0.18, (t) => {
        g.clear();
        const x = from.x + (to.x - from.x) * Math.min(1, t * 1.4);
        const y = from.y + (to.y - from.y) * Math.min(1, t * 1.4);
        g.circle(x, y, 6).fill({ color: 0xe8e2d4, alpha: 1 - t });
      });
      g.destroy();
      await this.flashCircle(to.x, to.y, 0xe8e2d4, 16, 0.2);
    } else {
      await this.projectile(from, to, 0xd4c4a0, { size: 5, duration: 0.28, trail: true });
      await this.flashCircle(to.x, to.y, 0xd4c4a0, 14, 0.18);
    }
  }

  floatingText(x: number, y: number, text: string, color: number): void {
    const label = new Text({
      text,
      style: {
        fontFamily: "Exo 2, sans-serif",
        fontSize: 18,
        fontWeight: "800",
        fill: color,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    label.anchor.set(0.5);
    label.position.set(x, y);
    this.layer.addChild(label);
    void this.tweens
      .to(0.8, (t) => {
        label.y = y - 40 * t;
        label.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        label.scale.set(1 + (1 - t) * 0.15);
      })
      .then(() => label.destroy());
  }

  highlightCells(
    cells: { x: number; y: number; size: number }[],
    color: number,
    opts?: { fillAlpha?: number; strokeAlpha?: number; strokeWidth?: number },
  ): Graphics {
    const fillAlpha = opts?.fillAlpha ?? 0.28;
    const strokeAlpha = opts?.strokeAlpha ?? 0.85;
    const strokeWidth = opts?.strokeWidth ?? 2;
    const g = new Graphics();
    g.eventMode = "none";
    for (const c of cells) {
      g.roundRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size, 6).fill({
        color,
        alpha: fillAlpha,
      });
      g.roundRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size, 6).stroke({
        color,
        width: strokeWidth,
        alpha: strokeAlpha,
      });
    }
    return g;
  }

  /** Раскалённый пол клеток (превью зоны урона, напр. Дыхание дракона). */
  highlightHeatCells(cells: { x: number; y: number; size: number }[]): Graphics {
    const g = new Graphics();
    g.eventMode = "none";
    for (const c of cells) {
      const half = c.size / 2;
      g.roundRect(c.x - half, c.y - half, c.size, c.size, 10).fill({
        color: 0x3a0a04,
        alpha: 0.28,
      });
      g.roundRect(c.x - half + 3, c.y - half + 3, c.size - 6, c.size - 6, 8).fill({
        color: 0xff4010,
        alpha: 0.22,
      });
      g.ellipse(c.x, c.y + half * 0.18, half * 0.78, half * 0.52).fill({
        color: 0xffaa40,
        alpha: 0.2,
      });
      g.roundRect(c.x - half, c.y - half, c.size, c.size, 10).stroke({
        color: 0xffb048,
        width: 2.2,
        alpha: 0.75,
      });
      g.roundRect(c.x - half + 5, c.y - half + 5, c.size - 10, c.size - 10, 7).stroke({
        color: 0xff6020,
        width: 1.2,
        alpha: 0.35,
      });
      const inset = half * 0.78;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        g.circle(c.x + sx * inset, c.y + sy * inset, 2.5).fill({
          color: 0xffcc66,
          alpha: 0.4,
        });
      }
    }
    return g;
  }
}
