import { SLOT_LABEL, type EquipSlotId } from "../items/slots";
import type { ItemDef } from "../items/types";
import "./itemRarity.css";
import "./itemDrag.css";

/** Источник перетаскивания - единый для всех экранов. */
export type ItemDragSource =
  | { kind: "inv"; index: number }
  | { kind: "stash"; index: number }
  | { kind: "equip"; slot: EquipSlotId }
  | { kind: "market"; merchantId: string; index: number };

export interface ItemDragSession {
  item: ItemDef;
  source: ItemDragSource;
}

export interface ItemDragApi {
  isActive(): boolean;
  getSession(): ItemDragSession | null;
  begin(item: ItemDef, source: ItemDragSource, x: number, y: number, sourceEl?: HTMLElement | null): void;
  move(x: number, y: number): void;
  /** Hit-test под курсором (призрак временно скрывается). */
  hitTest(x: number, y: number): Element | null;
  /** Завершить drag; возвращает сессию или null если не начался. */
  end(): ItemDragSession | null;
  cancel(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createGhost(): HTMLElement {
  const ghost = el("div", "item-drag-ghost");
  ghost.hidden = true;
  ghost.setAttribute("aria-hidden", "true");
  document.body.append(ghost);
  return ghost;
}

function fillGhost(ghost: HTMLElement, item: ItemDef): void {
  ghost.replaceChildren();
  ghost.dataset.rarity = item.rarity;
  const face = el("span", "item-drag-face");
  if (item.icon) {
    const img = el("img", "item-drag-icon") as HTMLImageElement;
    img.src = item.icon;
    img.alt = "";
    img.draggable = false;
    face.append(img);
  } else {
    face.append(el("span", "item-drag-glyph", SLOT_LABEL[item.slot].slice(0, 1)));
  }
  ghost.append(face);
}

function placeGhost(ghost: HTMLElement, x: number, y: number): void {
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
}

function createItemDrag(): ItemDragApi {
  const ghost = createGhost();
  let session: ItemDragSession | null = null;
  let active = false;
  let sourceEl: HTMLElement | null = null;

  const clearSourceMark = (): void => {
    sourceEl?.classList.remove("item-drag-source");
    sourceEl = null;
  };

  const hide = (): void => {
    active = false;
    session = null;
    ghost.hidden = true;
    ghost.replaceChildren();
    clearSourceMark();
    document.body.classList.remove("item-dragging");
  };

  return {
    isActive() {
      return active;
    },
    getSession() {
      return session;
    },
    begin(item, source, x, y, elSource) {
      session = { item, source };
      active = true;
      clearSourceMark();
      if (elSource) {
        sourceEl = elSource;
        sourceEl.classList.add("item-drag-source");
      }
      fillGhost(ghost, item);
      placeGhost(ghost, x, y);
      ghost.hidden = false;
      document.body.classList.add("item-dragging");
    },
    move(x, y) {
      if (!active) return;
      placeGhost(ghost, x, y);
    },
    hitTest(x, y) {
      const was = ghost.hidden;
      ghost.hidden = true;
      const under = document.elementFromPoint(x, y);
      if (!was && active) ghost.hidden = false;
      return under;
    },
    end() {
      const done = active ? session : null;
      hide();
      return done;
    },
    cancel() {
      hide();
    },
  };
}

let singleton: ItemDragApi | null = null;

/** Общий drag предметов для инвентаря, экипа, тайника, рынка. */
export function getItemDrag(): ItemDragApi {
  if (!singleton) singleton = createItemDrag();
  return singleton;
}

export function isItemDragging(): boolean {
  return singleton?.isActive() ?? false;
}
