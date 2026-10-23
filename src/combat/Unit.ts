import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { ABILITIES } from "../abilities/definitions";
import { sharpenPortraitTexture } from "../art/portraits";
import type { AbilityId, GridPos, School, StatusEffect, Team, UnitStats } from "../types";

export interface UnitCast {
  id: AbilityId;
  elapsed: number;
  duration: number;
}

const CARD = 112;
const PORTRAIT_PAD = 3;
const FRAME_RADIUS = 1;
const FRAME_COLOR = 0xffffff;

export interface UnitInit {
  id: string;
  name: string;
  short: string;
  team: Team;
  pos: GridPos;
  school: School;
  stats: UnitStats;
  abilities: AbilityId[];
  /** URL портрета (после Assets.load) */
  portraitUrl?: string;
  /** Сторона карточки в пикселях. По умолчанию обычная клетка. */
  cardSize?: number;
  /** Подпись на карточке без портрета, например тип оружия. */
  subtitle?: string;
}

export class Unit {
  readonly id: string;
  readonly name: string;
  readonly short: string;
  readonly team: Team;
  readonly school: School;
  readonly abilities: AbilityId[];
  readonly stats: UnitStats;
  readonly portraitUrl: string | null;
  readonly cardSize: number;
  pos: GridPos;
  hp: number;
  autoTimer: number;
  abilityCd: Record<string, number> = {};
  statuses: StatusEffect[] = [];
  preferredTargetId: string | null = null;
  /** 0 — удар только что прошёл, 1 — автоатака готова. Во время каста - прогресс подготовки. */
  attackCharge = 0;
  /** Активная подготовка способности. null - не кастует. */
  cast: UnitCast | null = null;
  alive = true;

  readonly view = new Container();
  private frame: Graphics;
  private portrait: Sprite | null = null;
  private hpBarBg: Graphics;
  private hpBarFg: Graphics;
  private hpText: Text;
  private nameText: Text;
  private statusText: Text;
  private subText: Text;
  private flashGfx: Graphics;
  private shieldGfx: Graphics;
  private cdBarGlow: Graphics;
  private cdBarBg: Graphics;
  private cdBarFg: Graphics;
  private castLabel: Text;

  constructor(init: UnitInit) {
    this.id = init.id;
    this.name = init.name;
    this.short = init.short;
    this.team = init.team;
    this.school = init.school;
    this.abilities = init.abilities;
    this.stats = init.stats;
    this.portraitUrl = init.portraitUrl ?? null;
    this.cardSize = init.cardSize ?? CARD;
    this.pos = { ...init.pos };
    this.hp = init.stats.maxHp;
    this.autoTimer = Math.random() * init.stats.autoAttackCd * 0.5;
    this.attackCharge = init.stats.autoAttackCd > 0 ? this.autoTimer / init.stats.autoAttackCd : 0;

    for (const a of init.abilities) {
      if (init.team === "player") {
        this.abilityCd[a] = 0;
        continue;
      }
      const cd = ABILITIES[a]?.cooldown ?? 8;
      // В начале боя у монстров 70-100% кулдауна, чтобы не били скиллом сразу.
      this.abilityCd[a] = cd * (0.7 + Math.random() * 0.3);
    }

    this.view.eventMode = "none";

    this.frame = new Graphics();
    this.flashGfx = new Graphics();
    this.shieldGfx = new Graphics();
    this.shieldGfx.eventMode = "none";
    this.cdBarGlow = new Graphics();
    this.cdBarBg = new Graphics();
    this.cdBarFg = new Graphics();
    this.cdBarGlow.eventMode = "none";
    this.cdBarBg.eventMode = "none";
    this.cdBarFg.eventMode = "none";
    this.hpBarBg = new Graphics();
    this.hpBarFg = new Graphics();
    this.hpText = new Text({
      text: "",
      style: {
        fontFamily: "Exo 2, sans-serif",
        fontSize: 11,
        fontWeight: "800",
        fill: 0xe8e2d4,
        stroke: { color: 0x0c0f0c, width: 3 },
      },
    });
    this.hpText.anchor.set(0.5);
    this.nameText = new Text({
      text: init.short,
      style: {
        fontFamily: "Exo 2, sans-serif",
        fontSize: 13,
        fontWeight: "800",
        fill: 0x111111,
      },
    });
    this.nameText.anchor.set(0.5);
    this.statusText = new Text({
      text: "",
      style: {
        fontFamily: "Exo 2, sans-serif",
        fontSize: 10,
        fontWeight: "700",
        fill: 0xe8e2d4,
      },
    });
    this.statusText.anchor.set(0.5, 0);
    this.subText = new Text({
      text: init.subtitle ?? "",
      style: {
        fontFamily: "Exo 2, sans-serif",
        fontSize: 12,
        fontWeight: "700",
        fill: 0xc4a35a,
      },
    });
    this.subText.anchor.set(0.5);
    this.castLabel = new Text({
      text: "",
      style: {
        fontFamily: "Exo 2, sans-serif",
        fontSize: 9,
        fontWeight: "800",
        fill: 0xf8ffff,
        stroke: { color: 0x041820, width: 2 },
      },
    });
    this.castLabel.anchor.set(0.5);
    this.castLabel.visible = false;
    this.castLabel.eventMode = "none";

    this.view.addChild(
      this.frame,
      this.flashGfx,
      this.shieldGfx,
      this.hpBarBg,
      this.hpBarFg,
      this.hpText,
      this.nameText,
      this.subText,
      this.statusText,
    );

    if (this.portraitUrl) {
      this.mountPortrait(this.portraitUrl);
    }
    this.view.addChild(this.cdBarGlow, this.cdBarBg, this.cdBarFg, this.castLabel);

    this.redraw();
  }

  private mountPortrait(url: string): void {
    const texture = Assets.get<Texture>(url);
    if (!texture || texture === Texture.EMPTY) return;
    sharpenPortraitTexture(texture);

    const size = this.cardSize - PORTRAIT_PAD * 2;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.width = size;
    sprite.height = size;
    sprite.roundPixels = true;

    // Скругление без stencil-mask: маска через alpha часто мылит края
    const mask = new Graphics()
      .roundRect(-size / 2, -size / 2, size, size, FRAME_RADIUS)
      .fill(0xffffff);
    sprite.mask = mask;
    mask.eventMode = "none";

    this.portrait = sprite;
    // frame, portrait(+mask), flash, bars, texts
    this.view.addChildAt(mask, 1);
    this.view.addChildAt(sprite, 2);
    this.nameText.visible = false;
  }

  get center(): { x: number; y: number } {
    return { x: this.view.x, y: this.view.y };
  }

  private get half(): number {
    return this.cardSize / 2;
  }

  redraw(): void {
    const half = this.half;
    const barW = this.cardSize - 6;
    const barH = 12;
    const barY = half - barH - 1;
    this.frame.clear();
    this.frame
      .roundRect(-half, -half, this.cardSize, this.cardSize, FRAME_RADIUS)
      .fill({ color: 0x1a2018, alpha: 0.95 });
    this.frame
      .roundRect(-half, -half, this.cardSize, this.cardSize, FRAME_RADIUS)
      .stroke({ color: FRAME_COLOR, width: 2 });

    if (!this.portrait) {
      this.frame.roundRect(-22, -28, 44, 20, FRAME_RADIUS).fill({ color: 0x3a4534, alpha: 0.85 });
      this.nameText.position.set(0, -18);
      this.nameText.text = this.short;
      this.nameText.visible = true;
      this.subText.visible = this.subText.text.length > 0;
      this.subText.position.set(0, 8);
    } else {
      this.nameText.visible = false;
      this.subText.visible = false;
    }

    this.hpBarBg.clear().roundRect(-barW / 2, barY, barW, barH, 2).fill({ color: 0x1a2018, alpha: 0.9 });
    const ratio = Math.max(0, this.hp / this.stats.maxHp);
    this.hpBarFg.clear().roundRect(-barW / 2, barY, Math.max(0, barW * ratio), barH, 2).fill({
      color: ratio > 0.35 ? 0x5a9e5a : 0xc45a4a,
    });
    this.hpText.text = `${Math.ceil(this.hp)}/${this.stats.maxHp}`;
    this.hpText.position.set(0, barY + barH / 2);

    const icons = this.statuses.map((s) => {
      switch (s.kind) {
        case "stun":
          return "💫";
        case "shield":
          return "🛡";
        case "bleed":
          return "🩸";
        case "burn":
          return "🔥";
        case "atk_buff":
          return "⬆";
        case "slow":
          return "❄";
        case "haste":
          return "💨";
        case "invuln":
          return "◈";
        default:
          return "";
      }
    });
    this.statusText.text = icons.join("");
    this.statusText.position.set(0, -this.half - 14);
    this.drawShieldAura();
    this.drawAttackCharge();
    if (!this.alive) this.view.visible = false;
  }

  private drawShieldAura(): void {
    this.shieldGfx.clear();
    if (!this.hasStatus("shield")) return;
    const half = this.half;
    const w = half * 0.56;
    const h = half * 1.0;
    // heater-щит: плоский верх, остриё вниз
    const outline = [
      { x: -w * 0.92, y: -h * 0.52 },
      { x: -w * 0.35, y: -h * 0.58 },
      { x: w * 0.35, y: -h * 0.58 },
      { x: w * 0.92, y: -h * 0.52 },
      { x: w * 1.02, y: -h * 0.12 },
      { x: w * 0.88, y: h * 0.28 },
      { x: w * 0.42, y: h * 0.55 },
      { x: 0, y: h * 0.72 },
      { x: -w * 0.42, y: h * 0.55 },
      { x: -w * 0.88, y: h * 0.28 },
      { x: -w * 1.02, y: -h * 0.12 },
    ];
    const trace = (scale: number) => {
      const p0 = outline[0]!;
      this.shieldGfx.moveTo(p0.x * scale, p0.y * scale);
      for (let i = 1; i < outline.length; i++) {
        const p = outline[i]!;
        this.shieldGfx.lineTo(p.x * scale, p.y * scale);
      }
      return this.shieldGfx.closePath();
    };
    trace(1).fill({ color: 0x7ec8e8, alpha: 0.12 });
    trace(0.78).fill({ color: 0xd0f0ff, alpha: 0.08 });
    trace(1).stroke({ color: 0xa8e8ff, width: 2.6, alpha: 0.6 });
    trace(0.88).stroke({ color: 0xffffff, width: 1.2, alpha: 0.3 });
    // грани
    this.shieldGfx
      .moveTo(0, -h * 0.5)
      .lineTo(w * 0.32, -h * 0.12)
      .lineTo(0, h * 0.12)
      .lineTo(-w * 0.32, -h * 0.12)
      .closePath()
      .stroke({ color: 0xe8f8ff, width: 1.4, alpha: 0.45 });
    this.shieldGfx
      .moveTo(-w * 0.22, h * 0.02)
      .lineTo(w * 0.22, h * 0.02)
      .lineTo(0, h * 0.55)
      .closePath()
      .stroke({ color: 0x7ec8e8, width: 1.2, alpha: 0.4 });
    // кристаллики по контуру
    for (let i = 0; i < outline.length; i++) {
      if (i % 2 !== 0) continue;
      const p = outline[i]!;
      const len = Math.hypot(p.x, p.y) || 1;
      const nx = p.x / len;
      const ny = p.y / len;
      this.shieldGfx
        .moveTo(p.x + nx * 6, p.y + ny * 6)
        .lineTo(p.x - ny * 3.2, p.y + nx * 3.2)
        .lineTo(p.x + ny * 3.2, p.y - nx * 3.2)
        .closePath()
        .fill({ color: 0xd0f0ff, alpha: 0.7 });
    }
    // снежинки-точки внутри
    for (let i = 0; i < 5; i++) {
      const a = -0.6 + i * 0.35;
      this.shieldGfx.circle(Math.sin(a) * w * 0.35, -h * 0.05 + Math.cos(a) * h * 0.15, 1.5).fill({
        color: 0xffffff,
        alpha: 0.55,
      });
    }
    this.shieldGfx.ellipse(0, h * 0.48, w * 0.55, h * 0.12).fill({
      color: 0xa8d8f0,
      alpha: 0.14,
    });
  }

  private drawAttackCharge(): void {
    this.cdBarGlow.clear();
    this.cdBarBg.clear();
    this.cdBarFg.clear();
    this.castLabel.visible = false;
    if (this.team !== "enemy") return;

    const fill = Math.max(0, Math.min(1, this.attackCharge));
    if (this.cast) {
      const w = this.cardSize - 8;
      const h = 12;
      const x = -w / 2;
      const y = -this.half + 4;
      const pulse = 0.55 + 0.45 * Math.sin(performance.now() * 0.012);
      const neon = 0x1cf0ff;
      const neonHot = 0xa8ffff;
      // Внешнее неоновое свечение
      this.cdBarGlow
        .roundRect(x - 3, y - 3, w + 6, h + 6, 4)
        .fill({ color: neon, alpha: 0.18 + 0.14 * pulse });
      this.cdBarGlow
        .roundRect(x - 1, y - 1, w + 2, h + 2, 3)
        .stroke({ color: neon, width: 2, alpha: 0.55 + 0.35 * pulse });
      this.cdBarBg.roundRect(x, y, w, h, 2).fill({ color: 0x041820, alpha: 0.92 });
      if (fill > 0) {
        const fw = Math.max(4, w * fill);
        this.cdBarFg.roundRect(x, y, fw, h, 2).fill({ color: neon, alpha: 0.88 + 0.12 * pulse });
        this.cdBarFg.roundRect(x, y, fw, Math.max(2, h * 0.38), 2).fill({
          color: neonHot,
          alpha: 0.35 + 0.25 * pulse,
        });
      }
      const name = ABILITIES[this.cast.id]?.name ?? this.cast.id;
      this.castLabel.text = name;
      this.castLabel.position.set(0, y + h / 2);
      this.castLabel.alpha = 0.85 + 0.15 * pulse;
      this.castLabel.visible = true;
      return;
    }

    const w = this.cardSize - 18;
    const h = 3;
    const x = -w / 2;
    const y = -this.half + 7;
    this.cdBarBg.roundRect(x, y, w, h, 1).fill({ color: 0x1a2018, alpha: 0.92 });
    if (fill > 0) {
      this.cdBarFg.roundRect(x, y, Math.max(2, w * fill), h, 1).fill({ color: 0xe8d7a2, alpha: 0.95 });
    }
  }

  isCasting(): boolean {
    return this.cast !== null;
  }

  beginCast(id: AbilityId, duration: number): void {
    this.cast = { id, elapsed: 0, duration };
    this.attackCharge = 0;
    this.redraw();
  }

  /** Срывает подготовку. true - каст был. */
  interruptCast(): boolean {
    if (!this.cast) return false;
    this.cast = null;
    this.redraw();
    return true;
  }

  applyDamage(raw: number): { dealt: number; absorbed: number; castBroken: boolean } {
    if (!this.alive) return { dealt: 0, absorbed: 0, castBroken: false };
    if (this.hasStatus("invuln")) return { dealt: 0, absorbed: raw, castBroken: false };
    const wasCasting = this.cast !== null;
    let dmg = raw;
    let absorbed = 0;
    const shield = this.statuses.find((s) => s.kind === "shield");
    if (shield) {
      absorbed = Math.min(shield.potency, dmg);
      shield.potency -= absorbed;
      dmg -= absorbed;
      if (shield.potency <= 0) {
        this.statuses = this.statuses.filter((s) => s !== shield);
      }
    }
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
      this.cast = null;
    }
    this.redraw();
    return { dealt: dmg, absorbed, castBroken: wasCasting && !this.alive };
  }

  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
    this.redraw();
  }

  addStatus(status: StatusEffect): void {
    const existing = this.statuses.find((s) => s.kind === status.kind);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, status.remaining);
      existing.potency = Math.max(existing.potency, status.potency);
    } else {
      this.statuses.push({ ...status });
    }
    this.redraw();
  }

  hasStatus(kind: StatusEffect["kind"]): boolean {
    return this.statuses.some((s) => s.kind === kind);
  }

  clearStatus(kind: StatusEffect["kind"]): void {
    const next = this.statuses.filter((s) => s.kind !== kind);
    if (next.length === this.statuses.length) return;
    this.statuses = next;
    this.redraw();
  }

  atkMultiplier(): number {
    const buff = this.statuses.find((s) => s.kind === "atk_buff");
    return buff ? 1 + buff.potency : 1;
  }

  autoCdMultiplier(): number {
    let m = 1;
    const slow = this.statuses.find((s) => s.kind === "slow");
    if (slow) m *= 1 + slow.potency;
    const haste = this.statuses.find((s) => s.kind === "haste");
    if (haste) m *= haste.potency;
    return m;
  }

  /** true - каст сорван смертью от DoT. */
  tickStatuses(dt: number): boolean {
    let dotDmg = 0;
    for (const s of this.statuses) {
      s.remaining -= dt;
      if (s.kind === "bleed" || s.kind === "burn") dotDmg += s.potency * dt;
    }
    this.statuses = this.statuses.filter((s) => s.remaining > 0 && (s.kind !== "shield" || s.potency > 0));
    let castBroken = false;
    if (dotDmg > 0) {
      castBroken = this.applyDamage(dotDmg).castBroken;
    }
    this.redraw();
    return castBroken;
  }

  flash(color: number): void {
    this.flashGfx
      .clear()
      .roundRect(-this.half, -this.half, this.cardSize, this.cardSize, FRAME_RADIUS)
      .fill({ color, alpha: 0.55 });
    window.setTimeout(() => this.flashGfx.clear(), 80);
  }

  setHidden(hidden: boolean): void {
    this.view.visible = this.alive && !hidden;
  }
}
