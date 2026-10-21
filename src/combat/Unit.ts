import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { SCHOOL_COLOR } from "../abilities/definitions";
import { sharpenPortraitTexture } from "../art/portraits";
import type { AbilityId, GridPos, School, StatusEffect, Team, UnitStats } from "../types";

const CARD = 112;
const PORTRAIT_PAD = 3;

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
  /** 0 — удар только что прошёл, 1 — автоатака готова. */
  attackCharge = 0;
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
  private selectRing: Graphics;
  private flashGfx: Graphics;
  private cdBarBg: Graphics;
  private cdBarFg: Graphics;

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

    for (const a of init.abilities) this.abilityCd[a] = 0;

    this.view.eventMode = "none";

    this.selectRing = new Graphics();
    this.frame = new Graphics();
    this.flashGfx = new Graphics();
    this.cdBarBg = new Graphics();
    this.cdBarFg = new Graphics();
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

    this.view.addChild(
      this.selectRing,
      this.frame,
      this.flashGfx,
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
    this.view.addChild(this.cdBarBg, this.cdBarFg);

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
    const mask = new Graphics().roundRect(-size / 2, -size / 2, size, size, 6).fill(0xffffff);
    sprite.mask = mask;
    mask.eventMode = "none";

    this.portrait = sprite;
    // selectRing, frame, portrait(+mask), flash, bars, texts
    this.view.addChildAt(mask, 2);
    this.view.addChildAt(sprite, 3);
    this.nameText.visible = false;
  }

  get center(): { x: number; y: number } {
    return { x: this.view.x, y: this.view.y };
  }

  private get half(): number {
    return this.cardSize / 2;
  }

  setSelected(on: boolean): void {
    this.selectRing.clear();
    if (on) {
      this.selectRing
        .roundRect(-this.half - 6, -this.half - 6, this.cardSize + 12, this.cardSize + 12, 8)
        .stroke({
          color: 0xc4a35a,
          width: 3,
          alpha: 0.95,
        });
    }
  }

  redraw(): void {
    const color = this.team === "player" ? SCHOOL_COLOR[this.school] : 0x6a3a3a;
    const body = this.team === "player" ? 0x2a3324 : 0x3a2424;
    const half = this.half;
    const barW = this.cardSize - 6;
    const barH = 12;
    const barY = half - barH - 1;
    this.frame.clear();
    this.frame.roundRect(-half, -half, this.cardSize, this.cardSize, 7).fill({ color: body, alpha: 0.95 });
    this.frame.roundRect(-half, -half, this.cardSize, this.cardSize, 7).stroke({ color, width: 3 });

    if (!this.portrait) {
      this.frame.roundRect(-22, -28, 44, 20, 4).fill({ color, alpha: 0.85 });
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
        case "atk_buff":
          return "⬆";
        case "slow":
          return "❄";
        default:
          return "";
      }
    });
    this.statusText.text = icons.join("");
    this.statusText.position.set(0, -this.half - 14);
    this.drawAttackCharge();
    if (!this.alive) this.view.visible = false;
  }

  private drawAttackCharge(): void {
    this.cdBarBg.clear();
    this.cdBarFg.clear();
    if (this.team !== "enemy") return;
    const w = this.cardSize - 18;
    const h = 3;
    const x = -w / 2;
    const y = -this.half + 7;
    this.cdBarBg.roundRect(x, y, w, h, 1).fill({ color: 0x1a2018, alpha: 0.92 });
    const fill = Math.max(0, Math.min(1, this.attackCharge));
    if (fill > 0) {
      this.cdBarFg.roundRect(x, y, Math.max(2, w * fill), h, 1).fill({ color: 0xe8d7a2, alpha: 0.95 });
    }
  }

  applyDamage(raw: number): { dealt: number; absorbed: number } {
    if (!this.alive) return { dealt: 0, absorbed: 0 };
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
    }
    this.redraw();
    return { dealt: dmg, absorbed };
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

  atkMultiplier(): number {
    const buff = this.statuses.find((s) => s.kind === "atk_buff");
    return buff ? 1 + buff.potency : 1;
  }

  autoCdMultiplier(): number {
    const slow = this.statuses.find((s) => s.kind === "slow");
    return slow ? 1 + slow.potency : 1;
  }

  tickStatuses(dt: number): number {
    let bleedDmg = 0;
    for (const s of this.statuses) {
      s.remaining -= dt;
      if (s.kind === "bleed") bleedDmg += s.potency * dt;
    }
    this.statuses = this.statuses.filter((s) => s.remaining > 0 && (s.kind !== "shield" || s.potency > 0));
    if (bleedDmg > 0) {
      this.applyDamage(bleedDmg);
    }
    this.redraw();
    return bleedDmg;
  }

  flash(color: number): void {
    this.flashGfx.clear().roundRect(-this.half, -this.half, this.cardSize, this.cardSize, 7).fill({ color, alpha: 0.55 });
    window.setTimeout(() => this.flashGfx.clear(), 80);
  }

  setHidden(hidden: boolean): void {
    this.view.visible = this.alive && !hidden;
  }
}
