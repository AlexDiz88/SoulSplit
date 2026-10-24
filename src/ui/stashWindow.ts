import { STASH_COLS, STASH_SIZE, type InventoryBag } from "../items/inventory";
import { SLOT_LABEL } from "../items/slots";
import type { ItemDef } from "../items/types";
import { fillItemTooltip } from "./itemTooltip";
import "./stashWindow.css";
import "./inventoryWindow.css";

export interface StashWindowApi {
  isOpen(): boolean;
  open(): void;
  close(): void;
  setBag(bag: InventoryBag | null): void;
  refresh(): void;
}

/** Окно тайника 10×10 по центру экрана (стиль ячеек как у инвентаря). */
export function mountStashWindow(): StashWindowApi {
  const hud = document.getElementById("hud")!;
  const stack = el("div", "stash-stack");
  stack.hidden = true;

  const root = el("div", "stash-root");
  root.id = "stash";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-labelledby", "stash-title");

  const head = el("header", "inv-bag-head stash-head");
  const title = el("h2", "inv-title", "Тайник");
  title.id = "stash-title";
  const count = el("span", "inv-bag-count", `0 / ${STASH_SIZE}`);
  head.append(title, count);

  const gridHost = el("div", "stash-grid-host");
  const tip = el("div", "item-tip inv-tip");
  tip.hidden = true;

  const hints = el("div", "stash-hints");
  const hint = el("div", "stash-hint");
  hint.append(
    el("div", "", "ПКМ: переложить между сумкой и тайником; с экипировки снять в сумку."),
    el("div", "", "Ctrl+ПКМ: надеть предмет; с экипировки снять в тайник."),
  );
  hints.append(hint);

  root.append(head, gridHost, tip);
  stack.append(root, hints);
  hud.append(stack);

  let bag: InventoryBag | null = null;

  const render = (): void => {
    tip.hidden = true;
    const filled = bag ? bag.filter(Boolean).length : 0;
    count.textContent = `${filled} / ${STASH_SIZE}`;
    gridHost.replaceChildren(renderGrid(bag));
  };

  const placeTip = (anchor: HTMLElement): void => {
    tip.hidden = false;
    const rootRect = root.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let left = rect.right - rootRect.left + 8;
    if (left + tipRect.width > rootRect.width - 6) {
      left = rect.left - rootRect.left - tipRect.width - 8;
    }
    const top = Math.min(Math.max(6, rect.top - rootRect.top), rootRect.height - tipRect.height - 6);
    tip.style.left = `${Math.max(6, left)}px`;
    tip.style.top = `${top}px`;
  };

  const showBagTip = (cell: HTMLElement): void => {
    if (!bag || document.body.classList.contains("item-dragging")) return;
    const index = Number(cell.dataset.stash);
    if (!Number.isFinite(index)) return;
    const item = bag[index];
    if (!item) {
      tip.hidden = true;
      return;
    }
    fillItemTooltip(tip, item);
    placeTip(cell);
  };

  gridHost.addEventListener("pointerover", (ev) => {
    const cell = (ev.target as Element).closest<HTMLElement>(".inv-cell[data-stash]");
    if (cell) showBagTip(cell);
  });
  gridHost.addEventListener("pointerout", (ev) => {
    const cell = (ev.target as Element).closest<HTMLElement>(".inv-cell[data-stash]");
    const next = ev.relatedTarget as Element | null;
    if (cell && (!next || !cell.contains(next))) tip.hidden = true;
  });

  return {
    isOpen: () => !stack.hidden,
    open() {
      render();
      stack.hidden = false;
    },
    close() {
      stack.hidden = true;
      tip.hidden = true;
    },
    setBag(next) {
      bag = next;
      if (!stack.hidden) render();
    },
    refresh() {
      if (!stack.hidden) render();
    },
  };
}

function renderGrid(bag: InventoryBag | null): HTMLElement {
  const grid = el("div", "stash-grid");
  grid.style.setProperty("--stash-cols", String(STASH_COLS));
  for (let i = 0; i < STASH_SIZE; i++) {
    grid.append(stashCell(i, bag?.[i] ?? null));
  }
  return grid;
}

function stashCell(index: number, item: ItemDef | null): HTMLButtonElement {
  const btn = el("button", "inv-cell stash-cell");
  btn.type = "button";
  btn.dataset.stash = String(index);
  const face = el("span", "inv-cell-face");
  if (item) {
    btn.dataset.rarity = item.rarity;
    btn.classList.add("filled");
    btn.setAttribute("aria-label", item.name);
    if (item.icon) {
      const img = el("img", "inv-cell-icon") as HTMLImageElement;
      img.src = item.icon;
      img.alt = "";
      img.draggable = false;
      face.append(img);
    } else {
      face.append(el("span", "inv-cell-glyph", SLOT_LABEL[item.slot].slice(0, 1)));
    }
  } else {
    btn.setAttribute("aria-label", `Пустая ячейка тайника ${index + 1}`);
  }
  btn.append(face);
  return btn;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
