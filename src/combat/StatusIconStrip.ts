import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import {
  STATUS_ICON_MAX_VISIBLE,
  formatStatusTimer,
  frameColorForPolarity,
  groupStatusesForDisplay,
  resolveStatusIconUrl,
  type StatusDisplayPackage,
} from "../effects/combatStatusMeta";
import type { StatusEffect } from "../types";

export type StatusStripLayout = "unit" | "hero";

interface IconSlot {
  root: Container;
  bg: Graphics;
  sprite: Sprite;
  /** Круглая маска под арт способности (как на панели скиллов). */
  maskGfx: Graphics;
  frame: Graphics;
  timer: Text;
  package: StatusDisplayPackage | null;
  /** URL, под который ждём Assets.load. */
  pendingUrl: string | null;
}

const loadingUrls = new Set<string>();

function textureReady(url: string): Texture | null {
  const tex = Assets.get<Texture>(url);
  if (!tex || tex === Texture.EMPTY) return null;
  if (tex.width <= 0 || tex.height <= 0) return null;
  return tex;
}

function requestTexture(url: string, onReady: (tex: Texture) => void): void {
  const ready = textureReady(url);
  if (ready) {
    onReady(ready);
    return;
  }
  if (loadingUrls.has(url)) {
    void Assets.load<Texture>(url).then((tex) => {
      if (tex && tex !== Texture.EMPTY) onReady(tex);
    });
    return;
  }
  loadingUrls.add(url);
  void Assets.load<Texture>(url)
    .then((tex) => {
      loadingUrls.delete(url);
      if (tex && tex !== Texture.EMPTY) onReady(tex);
    })
    .catch(() => {
      loadingUrls.delete(url);
    });
}

function fitSprite(sprite: Sprite, tex: Texture, box: number): void {
  sprite.texture = tex;
  sprite.visible = true;
  // Явный scale от реальных размеров - иначе width при tex.width=0 ломает масштаб навсегда.
  const tw = Math.max(1, tex.width);
  const th = Math.max(1, tex.height);
  sprite.scale.set(box / tw, box / th);
}

function paintIconArt(slot: IconSlot, url: string, size: number): void {
  const pad = size * 0.08;
  const box = size - pad * 2;

  const apply = (tex: Texture): void => {
    if (slot.pendingUrl !== url) return;
    fitSprite(slot.sprite, tex, box);
  };

  const ready = textureReady(url);
  if (ready) {
    slot.pendingUrl = url;
    apply(ready);
    return;
  }
  // Уже ждём этот URL - не плодим колбэки на каждый sync.
  if (slot.pendingUrl === url) return;
  slot.pendingUrl = url;
  slot.sprite.visible = false;
  requestTexture(url, apply);
}

function makeSlot(fontSize: number): IconSlot {
  const root = new Container();
  root.eventMode = "none";

  const bg = new Graphics();
  const sprite = new Sprite();
  sprite.anchor.set(0.5);
  sprite.eventMode = "none";

  const maskGfx = new Graphics();
  maskGfx.eventMode = "none";
  sprite.mask = maskGfx;

  const frame = new Graphics();
  frame.eventMode = "none";

  const timer = new Text({
    text: "",
    style: {
      fontFamily: "Exo 2, sans-serif",
      fontSize,
      fontWeight: "800",
      fill: 0xffffff,
      stroke: { color: 0x0c0f0c, width: Math.max(2, Math.round(fontSize * 0.28)) },
    },
  });
  timer.anchor.set(1, 1);
  timer.eventMode = "none";

  root.addChild(bg, sprite, maskGfx, frame, timer);
  return { root, bg, sprite, maskGfx, frame, timer, package: null, pendingUrl: null };
}

function paintPackage(slot: IconSlot, pkg: StatusDisplayPackage, size: number): void {
  slot.package = pkg;
  const half = size / 2;
  const stroke = frameColorForPolarity(pkg.polarity);
  const fill =
    pkg.polarity === "buff" ? 0x1a2a1a : pkg.polarity === "mixed" ? 0x2a2418 : 0x2a1a1a;
  const radius = size * 0.5;

  slot.bg.clear().circle(0, 0, radius).fill({ color: fill, alpha: 0.95 });
  slot.maskGfx.clear().circle(0, 0, radius - size * 0.04).fill({ color: 0xffffff });
  slot.frame
    .clear()
    .circle(0, 0, radius)
    .stroke({ color: stroke, width: Math.max(1.5, size * 0.08) });

  paintIconArt(slot, resolveStatusIconUrl(pkg.representative), size);

  slot.timer.anchor.set(1, 1);
  slot.timer.text = formatStatusTimer(pkg.remaining);
  slot.timer.position.set(half - 1, half - 1);
  slot.root.visible = true;
}

function paintOverflow(slot: IconSlot, count: number, size: number): void {
  slot.package = null;
  slot.pendingUrl = null;
  const half = size / 2;
  const radius = size * 0.5;
  slot.bg.clear().circle(0, 0, radius).fill({ color: 0x1a2018, alpha: 0.95 });
  slot.maskGfx.clear();
  slot.frame
    .clear()
    .circle(0, 0, radius)
    .stroke({ color: 0x8a8070, width: Math.max(1.5, size * 0.08) });
  slot.sprite.visible = false;
  slot.timer.anchor.set(0.5);
  slot.timer.text = `+${count}`;
  slot.timer.position.set(0, 0);
  slot.root.visible = true;
}

/**
 * Иконки боевых статусов на карточке юнита.
 * Пакеты по способности (1 скилл = 1 иконка).
 * unit - ряд внутри портрета над полоской HP; hero - баффы слева / дебаффы справа.
 */
export class StatusIconStrip {
  readonly view = new Container();
  private readonly layout: StatusStripLayout;
  private readonly iconSize: number;
  private readonly gap: number;
  private readonly fontSize: number;
  private readonly buffSlots: IconSlot[] = [];
  private readonly debuffSlots: IconSlot[] = [];
  private readonly unitSlots: IconSlot[] = [];
  private readonly overflowSlot: IconSlot;

  constructor(layout: StatusStripLayout) {
    this.layout = layout;
    // unit: круг над HP внутри портрета; hero: крупнее у большой карты
    this.iconSize = layout === "hero" ? 44 : 28;
    this.gap = layout === "hero" ? 6 : 4;
    this.fontSize = layout === "hero" ? 13 : 10;
    this.view.eventMode = "none";

    const max = STATUS_ICON_MAX_VISIBLE;
    if (layout === "hero") {
      for (let i = 0; i < max; i++) {
        const b = makeSlot(this.fontSize);
        const d = makeSlot(this.fontSize);
        this.buffSlots.push(b);
        this.debuffSlots.push(d);
        this.view.addChild(b.root, d.root);
      }
    } else {
      for (let i = 0; i < max; i++) {
        const s = makeSlot(this.fontSize);
        this.unitSlots.push(s);
        this.view.addChild(s.root);
      }
    }

    this.overflowSlot = makeSlot(this.fontSize);
    this.view.addChild(this.overflowSlot.root);
    this.hideAll();
  }

  /**
   * @param cardHalf - половина cardSize
   * @param barEdgeY - hero: низ колонки баров; unit: верх полоски HP
   */
  sync(statuses: StatusEffect[], cardHalf: number, barEdgeY: number): void {
    this.hideAll();
    if (statuses.length === 0) return;
    const packages = groupStatusesForDisplay(statuses);

    if (this.layout === "hero") {
      this.syncHero(packages, cardHalf, barEdgeY);
    } else {
      this.syncUnit(packages, barEdgeY);
    }
  }

  /** Локальные координаты относительно view юнита (центр карточки = 0,0). */
  hitTest(localX: number, localY: number): StatusDisplayPackage | null {
    const half = this.iconSize / 2;
    const slots =
      this.layout === "hero"
        ? [...this.buffSlots, ...this.debuffSlots]
        : [...this.unitSlots, this.overflowSlot];
    for (let i = slots.length - 1; i >= 0; i--) {
      const slot = slots[i]!;
      if (!slot.root.visible || !slot.package) continue;
      const dx = localX - slot.root.x;
      const dy = localY - slot.root.y;
      if (Math.abs(dx) <= half && Math.abs(dy) <= half) return slot.package;
    }
    return null;
  }

  private syncHero(packages: StatusDisplayPackage[], cardHalf: number, barBottomY: number): void {
    // Чистые баффы и tradeoff (mixed) слева; чистые дебаффы справа.
    const buffs = packages.filter((p) => p.polarity === "buff" || p.polarity === "mixed");
    const debuffs = packages.filter((p) => p.polarity === "debuff");
    const y = barBottomY - this.iconSize / 2;
    const pad = 8;

    const showBuffs = buffs.slice(0, STATUS_ICON_MAX_VISIBLE);
    for (let i = 0; i < showBuffs.length; i++) {
      const slot = this.buffSlots[i]!;
      paintPackage(slot, showBuffs[i]!, this.iconSize);
      const fromEdge = showBuffs.length - 1 - i;
      slot.root.position.set(
        -(cardHalf + pad + this.iconSize / 2 + fromEdge * (this.iconSize + this.gap)),
        y,
      );
    }

    const showDebuffs = debuffs.slice(0, STATUS_ICON_MAX_VISIBLE);
    for (let i = 0; i < showDebuffs.length; i++) {
      const slot = this.debuffSlots[i]!;
      paintPackage(slot, showDebuffs[i]!, this.iconSize);
      slot.root.position.set(
        cardHalf + pad + this.iconSize / 2 + i * (this.iconSize + this.gap),
        y,
      );
    }
  }

  /** Внутри портрета, ряд сразу над верхней кромкой полоски HP. */
  private syncUnit(packages: StatusDisplayPackage[], barTopY: number): void {
    const visible = packages.slice(0, STATUS_ICON_MAX_VISIBLE);
    const overflow = packages.length - visible.length;
    const count = visible.length + (overflow > 0 ? 1 : 0);
    const totalW = count * this.iconSize + Math.max(0, count - 1) * this.gap;
    let x = -totalW / 2 + this.iconSize / 2;
    const y = barTopY - 2 - this.iconSize / 2;

    for (let i = 0; i < visible.length; i++) {
      const slot = this.unitSlots[i]!;
      paintPackage(slot, visible[i]!, this.iconSize);
      slot.root.position.set(x, y);
      x += this.iconSize + this.gap;
    }

    if (overflow > 0) {
      paintOverflow(this.overflowSlot, overflow, this.iconSize);
      this.overflowSlot.root.position.set(x, y);
    }
  }

  private hideAll(): void {
    for (const s of this.buffSlots) {
      s.root.visible = false;
      s.package = null;
    }
    for (const s of this.debuffSlots) {
      s.root.visible = false;
      s.package = null;
    }
    for (const s of this.unitSlots) {
      s.root.visible = false;
      s.package = null;
      s.timer.anchor.set(1, 1);
    }
    this.overflowSlot.root.visible = false;
    this.overflowSlot.package = null;
    this.overflowSlot.sprite.visible = true;
    this.overflowSlot.timer.anchor.set(1, 1);
  }
}

export function statusStripLayoutForUnit(opts: {
  team: "player" | "enemy";
  summonSlot: number | null;
}): StatusStripLayout {
  if (opts.team === "player" && opts.summonSlot == null) return "hero";
  return "unit";
}

export { frameColorForPolarity };
