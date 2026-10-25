import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { ABILITIES } from "../abilities/definitions";
import { sharpenPortraitTexture } from "../art/portraits";
import type { EquipmentMap } from "../items/equipment";
import { computeHeroSheet, equippedWeapon } from "../items/equipment";
import {
  cloneInventory,
  equipFromInventory,
  equipFromInventoryToSlot,
  swapEquipmentSlots,
  swapInventoryCells,
  unequipToInventory,
  unequipToInventoryAt,
  type InventoryBag,
  type GearChangeResult,
} from "../items/inventory";
import type { EquipSlotId } from "../items/slots";
import type { HeroStatSheet } from "../stats/sheet";
import { createBaseHeroSheet, getStat } from "../stats/sheet";
import {
  autoAttackInterval,
  mitigateIncoming,
  rollEvasion,
  type DamageChannel,
} from "../stats/formulas";
import type { AbilityId, GridPos, Aspect, StatusEffect, Team, UnitStats } from "../types";

export interface UnitCast {
  id: AbilityId;
  elapsed: number;
  duration: number;
}

const CARD = 112;
const PORTRAIT_PAD = 3;
const FRAME_RADIUS = 1;
const FRAME_COLOR = 0xffffff;
const ELITE_FRAME_COLOR = 0xc4a35a;

export interface UnitInit {
  id: string;
  name: string;
  short: string;
  team: Team;
  pos: GridPos;
  aspect: Aspect;
  stats: UnitStats;
  abilities: AbilityId[];
  /** URL портрета (после Assets.load) */
  portraitUrl?: string;
  /** Сторона карточки в пикселях. По умолчанию обычная клетка. */
  cardSize?: number;
  /** Подпись на карточке без портрета, например тип оружия. */
  subtitle?: string;
  /** Лист статов героя. У врагов обычно null. */
  sheet?: HeroStatSheet | null;
  equipment?: EquipmentMap;
  /** Рюкзак 5×5. Только у героя. */
  inventory?: InventoryBag;
  /** Уровень героя (для UI). У врагов не задаётся. */
  level?: number;
  /** Элитный враг - золотая рамка и тег. */
  elite?: boolean;
}

export class Unit {
  readonly id: string;
  readonly name: string;
  readonly short: string;
  readonly team: Team;
  readonly aspect: Aspect;
  readonly abilities: AbilityId[];
  readonly stats: UnitStats;
  readonly portraitUrl: string | null;
  readonly cardSize: number;
  pos: GridPos;
  hp: number;
  mana: number;
  /** Глобальный лист; null у простых врагов. */
  sheet: HeroStatSheet | null;
  /** База листа без экипа (уровень + levelBonuses). Экип накладывается сверху. */
  private sheetBase: HeroStatSheet;
  equipment: EquipmentMap;
  /** Рюкзак 5×5 (один предмет = одна ячейка). */
  inventory: InventoryBag;
  /** Уровень героя; у врагов 0. */
  level: number;
  readonly elite: boolean;
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
    this.aspect = init.aspect;
    this.abilities = init.abilities;
    this.stats = init.stats;
    this.portraitUrl = init.portraitUrl ?? null;
    this.cardSize = init.cardSize ?? CARD;
    this.pos = { ...init.pos };
    this.equipment = init.equipment ?? {};
    this.inventory = cloneInventory(init.inventory);
    this.level = init.level ?? (init.team === "player" ? 1 : 0);
    this.elite = init.elite ?? false;
    this.sheetBase = createBaseHeroSheet();
    this.sheet =
      init.sheet === undefined
        ? init.team === "player"
          ? computeHeroSheet(this.equipment, this.sheetBase)
          : null
        : init.sheet;
    if (this.sheet) {
      this.stats.maxHp = getStat(this.sheet, "maxHp") || this.stats.maxHp;
    }
    this.hp = this.stats.maxHp;
    this.mana = this.sheet ? getStat(this.sheet, "maxMana") : 0;
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
      text: init.elite ? "Элита" : (init.subtitle ?? ""),
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
      .stroke({ color: this.elite ? ELITE_FRAME_COLOR : FRAME_COLOR, width: this.elite ? 3 : 2 });

    if (!this.portrait) {
      this.frame.roundRect(-22, -28, 44, 20, FRAME_RADIUS).fill({ color: 0x3a4534, alpha: 0.85 });
      this.nameText.position.set(0, -18);
      this.nameText.text = this.short;
      this.nameText.visible = true;
      this.subText.visible = this.subText.text.length > 0;
      this.subText.position.set(0, 8);
    } else {
      this.nameText.visible = false;
      this.subText.visible = this.elite;
      if (this.elite) this.subText.position.set(0, -half + 10);
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
        case "poison":
          return "☠";
        case "regen":
          return "💚";
        case "root":
          return "🌱";
        case "atk_buff":
          return "⬆";
        case "atk_debuff":
          return "⬇";
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

  /** Пересчёт листа из экипировки (после смены предмета). */
  rebuildSheetFromEquipment(base?: HeroStatSheet): void {
    if (base) this.sheetBase = base;
    this.sheet = computeHeroSheet(this.equipment, this.sheetBase);
    const maxHp = getStat(this.sheet, "maxHp");
    const ratio = this.stats.maxHp > 0 ? this.hp / this.stats.maxHp : 1;
    this.stats.maxHp = maxHp;
    this.hp = Math.min(maxHp, Math.max(1, Math.round(maxHp * ratio)));
    const maxMana = getStat(this.sheet, "maxMana");
    this.mana = Math.min(maxMana, this.mana);
    this.redraw();
  }

  /** Синхронизация боевых stats оружия + пересчёт листа. */
  applyEquipmentChange(base?: HeroStatSheet): void {
    if (base) this.sheetBase = base;
    const w = equippedWeapon(this.equipment)?.weapon;
    if (w) {
      this.stats.atk = w.damageMax;
      this.stats.autoAttackCd = w.baseCd;
      this.stats.reach = w.reach;
      this.stats.range = w.range;
    }
    this.rebuildSheetFromEquipment();
  }

  equipInventoryItem(invIndex: number): GearChangeResult {
    const result = equipFromInventory(this.equipment, this.inventory, invIndex);
    if (result.ok) this.applyEquipmentChange();
    return result;
  }

  equipInventoryItemToSlot(invIndex: number, slot: EquipSlotId): GearChangeResult {
    const result = equipFromInventoryToSlot(this.equipment, this.inventory, invIndex, slot);
    if (result.ok) this.applyEquipmentChange();
    return result;
  }

  unequipSlot(slot: EquipSlotId): GearChangeResult {
    const result = unequipToInventory(this.equipment, this.inventory, slot);
    if (result.ok) this.applyEquipmentChange();
    return result;
  }

  unequipSlotToIndex(slot: EquipSlotId, invIndex: number): GearChangeResult {
    const result = unequipToInventoryAt(this.equipment, this.inventory, slot, invIndex);
    if (result.ok) this.applyEquipmentChange();
    return result;
  }

  moveInventoryItem(from: number, to: number): GearChangeResult {
    return swapInventoryCells(this.inventory, from, to);
  }

  swapEquipSlots(from: EquipSlotId, to: EquipSlotId): GearChangeResult {
    const result = swapEquipmentSlots(this.equipment, from, to);
    if (result.ok) this.applyEquipmentChange();
    return result;
  }

  /** Базовый CD автоатаки с учётом AS из листа (для героя) или сырого stats. */
  autoAttackNeed(): number {
    const baseCd = this.stats.autoAttackCd;
    if (!this.sheet) return baseCd * this.autoCdMultiplier();
    return autoAttackInterval(baseCd, getStat(this.sheet, "attackSpeed"), this.autoCdMultiplier());
  }

  tickResourceRegen(dt: number): void {
    if (!this.alive || !this.sheet) return;
    const hpR = getStat(this.sheet, "hpRegen");
    const manaR = getStat(this.sheet, "manaRegen");
    if (hpR > 0) this.heal(hpR * dt);
    if (manaR > 0) {
      const maxMana = getStat(this.sheet, "maxMana");
      this.mana = Math.min(maxMana, this.mana + manaR * dt);
    }
  }

  applyDamage(
    raw: number,
    opts?: { channel?: DamageChannel },
  ): { dealt: number; absorbed: number; castBroken: boolean; evaded?: boolean } {
    if (!this.alive) return { dealt: 0, absorbed: 0, castBroken: false };
    if (this.hasStatus("invuln")) return { dealt: 0, absorbed: raw, castBroken: false };
    if (this.sheet && rollEvasion(this.sheet)) {
      this.redraw();
      return { dealt: 0, absorbed: 0, castBroken: false, evaded: true };
    }
    const channel = opts?.channel ?? "physical";
    const wasCasting = this.cast !== null;
    let dmg = Math.round(mitigateIncoming(raw, this.sheet, channel));
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
    let m = 1;
    const buff = this.statuses.find((s) => s.kind === "atk_buff");
    if (buff) m *= 1 + buff.potency;
    const debuff = this.statuses.find((s) => s.kind === "atk_debuff");
    /** potency = множитель урона (0.7 → ×0.7). */
    if (debuff) m *= debuff.potency;
    return m;
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
    let bleedDot = 0;
    let burnDot = 0;
    let poisonDot = 0;
    let regenAmt = 0;
    for (const s of this.statuses) {
      s.remaining -= dt;
      if (s.kind === "bleed") bleedDot += s.potency * dt;
      if (s.kind === "burn") burnDot += s.potency * dt;
      if (s.kind === "poison") poisonDot += s.potency * dt;
      if (s.kind === "regen") regenAmt += s.potency * dt;
    }
    this.statuses = this.statuses.filter((s) => s.remaining > 0 && (s.kind !== "shield" || s.potency > 0));
    let castBroken = false;
    if (bleedDot > 0) {
      castBroken = this.applyDamage(bleedDot, { channel: "physical" }).castBroken || castBroken;
    }
    if (burnDot > 0) {
      castBroken = this.applyDamage(burnDot, { channel: "magical" }).castBroken || castBroken;
    }
    if (poisonDot > 0) {
      castBroken = this.applyDamage(poisonDot, { channel: "magical" }).castBroken || castBroken;
    }
    if (regenAmt > 0) this.heal(regenAmt);
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
