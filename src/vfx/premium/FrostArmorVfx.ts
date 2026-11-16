import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";
import type { TweenManager } from "../../util/tween";
import { easeOutCubic } from "../../util/tween";
import { TEX } from "../textures";
import { traceHeaterShield } from "./IceShieldVfx";

/**
 * Морозная броня: формирование ледяного панциря вокруг героя.
 */
export async function playFrostArmorVfx(
  layer: Container,
  tweens: TweenManager,
  x: number,
  y: number,
  radius = 70,
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

  const aura = new Sprite(TEX.frostMist());
  aura.anchor.set(0.5);
  aura.position.set(x, y);
  aura.scale.set(0.4);
  aura.alpha = 0;
  glow.addChild(aura);

  const plate = new Graphics();
  crisp.addChild(plate);
  const rim = new Graphics();
  crisp.addChild(rim);

  const crystals: Sprite[] = [];
  for (let i = 0; i < 8; i++) {
    const s = new Sprite(TEX.iceCore());
    s.anchor.set(0.5);
    s.scale.set(0.14);
    glow.addChild(s);
    crystals.push(s);
  }

  const w = radius * 0.95;
  const h = radius * 1.15;

  await tweens.to(0.7, (t) => {
    const e = easeOutCubic(t);
    aura.alpha = e * 0.75;
    aura.scale.set(0.45 + e * 0.7);
    plate.clear();
    traceHeaterShield(plate, x, y, w * (0.55 + e * 0.45), h * (0.55 + e * 0.45)).fill({
      color: 0x7ec8e8,
      alpha: 0.12 + e * 0.22,
    });
    rim.clear();
    traceHeaterShield(rim, x, y, w * (0.55 + e * 0.45), h * (0.55 + e * 0.45)).stroke({
      color: 0xe8f7ff,
      width: 2.4,
      alpha: 0.4 + e * 0.55,
    });
    for (let i = 0; i < crystals.length; i++) {
      const s = crystals[i]!;
      const a = (Math.PI * 2 * i) / crystals.length + e * 1.5;
      const r = radius * (0.55 + e * 0.35);
      s.position.set(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85);
      s.alpha = 0.3 + e * 0.6;
      s.rotation = a;
    }
  });

  await tweens.to(0.35, (t) => {
    const fade = 1 - t;
    aura.alpha = 0.55 * fade;
    plate.alpha = fade;
    rim.alpha = fade;
    for (const s of crystals) s.alpha *= fade;
  });

  root.destroy({ children: true });
}

/** Короткий вспышка инея на атакующем при срабатывании брони. */
export async function playFrostArmorProcVfx(
  layer: Container,
  tweens: TweenManager,
  x: number,
  y: number,
): Promise<void> {
  const root = new Container();
  root.eventMode = "none";
  layer.addChild(root);
  const g = new Graphics();
  root.addChild(g);
  const mist = new Sprite(TEX.frostMist());
  mist.anchor.set(0.5);
  mist.position.set(x, y);
  mist.blendMode = "add";
  mist.scale.set(0.25);
  root.addChild(mist);

  await tweens.to(0.35, (t) => {
    const e = easeOutCubic(t);
    g.clear();
    g.circle(x, y, 8 + e * 28).stroke({ color: 0xa8e6ff, width: 3 * (1 - e) + 1, alpha: 1 - e });
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + e;
      g.moveTo(x, y)
        .lineTo(x + Math.cos(a) * (12 + e * 22), y + Math.sin(a) * (12 + e * 22))
        .stroke({ color: 0xe8f7ff, width: 1.4, alpha: 1 - e });
    }
    mist.alpha = (1 - e) * 0.7;
    mist.scale.set(0.25 + e * 0.55);
  });

  root.destroy({ children: true });
}
