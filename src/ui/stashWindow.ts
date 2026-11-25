import { STASH_COLS, STASH_SIZE, type InventoryBag } from "../items/inventory";
import { isPotionItem } from "../items/potions";
import { SLOT_LABEL } from "../items/slots";
import type { ItemDef } from "../items/types";
import { HUB_PHONE_MQ, isHubPhoneUi } from "../art/menuBackground";
import { fillItemTooltip } from "./itemTooltip";
import "./itemRarity.css";
import "./stashWindow.css";
import "./inventoryWindow.css";

/** На телефоне: 5×5 ячеек, 4 страницы = те же 100 слотов. */
const STASH_PHONE_COLS = 5;
const STASH_PHONE_ROWS = 5;
const STASH_PHONE_PAGE_SIZE = STASH_PHONE_COLS * STASH_PHONE_ROWS;
const STASH_PHONE_PAGES = Math.ceil(STASH_SIZE / STASH_PHONE_PAGE_SIZE);

export interface StashWindowApi {
  isOpen(): boolean;
  open(): void;
  close(): void;
  setBag(bag: InventoryBag | null): void;
  refresh(): void;
  /** Крестик закрывает тайник (+ компаньон-окна через хаб). */
  setOnCloseRequest(fn: (() => void) | null): void;
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

  const closeBtn = el("button", "inv-bag-x stash-x");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.innerHTML = '<span aria-hidden="true"></span>';

  const head = el("header", "inv-bag-head stash-head");
  const title = el("h2", "inv-title", "Тайник");
  title.id = "stash-title";
  const count = el("span", "inv-bag-count", `0 / ${STASH_SIZE}`);
  const headMeta = el("div", "inv-bag-head-meta");
  headMeta.append(count, closeBtn);
  head.append(title, headMeta);

  const gridHost = el("div", "stash-grid-host");
  const tip = el("div", "item-tip inv-tip");
  tip.hidden = true;

  const pager = el("div", "stash-pager");
  pager.hidden = true;
  pager.setAttribute("role", "tablist");
  pager.setAttribute("aria-label", "Страницы тайника");
  const pageBtns: HTMLButtonElement[] = [];
  for (let p = 0; p < STASH_PHONE_PAGES; p++) {
    const btn = el("button", "stash-page-btn") as HTMLButtonElement;
    btn.type = "button";
    btn.textContent = String(p + 1);
    btn.setAttribute("aria-label", `Страница ${p + 1}`);
    btn.dataset.page = String(p);
    pageBtns.push(btn);
    pager.append(btn);
  }

  const hints = el("div", "stash-hints");
  const hint = el("div", "stash-hint");
  hint.append(
    el("div", "", "ПКМ: переложить между сумкой и тайником; с экипировки снять в сумку."),
    el("div", "", "Ctrl+ПКМ: надеть предмет; с экипировки снять в тайник."),
  );
  hints.append(hint);

  root.append(head, gridHost, pager, tip);
  stack.append(root, hints);
  hud.append(stack);

  let bag: InventoryBag | null = null;
  let onCloseRequest: (() => void) | null = null;
  let page = 0;

  const setPage = (next: number): void => {
    const clamped = Math.max(0, Math.min(STASH_PHONE_PAGES - 1, next));
    if (clamped === page && !stack.hidden) {
      syncPager();
      return;
    }
    page = clamped;
    if (!stack.hidden) render();
  };

  const syncPager = (): void => {
    const phone = isHubPhoneUi();
    pager.hidden = !phone;
    root.classList.toggle("stash-phone", phone);
    for (const btn of pageBtns) {
      const p = Number(btn.dataset.page);
      const active = phone && p === page;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.tabIndex = active ? 0 : -1;
    }
  };

  closeBtn.addEventListener("click", () => {
    if (onCloseRequest) onCloseRequest();
    else {
      stack.hidden = true;
      tip.hidden = true;
    }
  });

  pager.addEventListener("click", (ev) => {
    const btn = (ev.target as Element).closest<HTMLButtonElement>(".stash-page-btn");
    if (!btn || !pager.contains(btn)) return;
    const next = Number(btn.dataset.page);
    if (!Number.isFinite(next)) return;
    setPage(next);
  });

  const phoneMq = window.matchMedia(HUB_PHONE_MQ);
  const onPhoneMq = (): void => {
    if (stack.hidden) return;
    if (!isHubPhoneUi()) page = 0;
    render();
  };
  phoneMq.addEventListener("change", onPhoneMq);

  const render = (): void => {
    tip.hidden = true;
    const filled = bag ? bag.filter(Boolean).length : 0;
    count.textContent = `${filled} / ${STASH_SIZE}`;
    if (isHubPhoneUi()) {
      page = Math.max(0, Math.min(STASH_PHONE_PAGES - 1, page));
    }
    syncPager();
    gridHost.replaceChildren(renderGrid(bag, isHubPhoneUi() ? page : null));
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
    if (isHubPhoneUi()) return;
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
    setOnCloseRequest(fn) {
      onCloseRequest = fn;
    },
  };
}

/** page = null → весь тайник 10×10; иначе страница 5×5 на телефоне. */
function renderGrid(bag: InventoryBag | null, page: number | null): HTMLElement {
  const grid = el("div", "stash-grid");
  if (page === null) {
    grid.style.setProperty("--stash-cols", String(STASH_COLS));
    for (let i = 0; i < STASH_SIZE; i++) {
      grid.append(stashCell(i, bag?.[i] ?? null));
    }
    return grid;
  }

  grid.classList.add("stash-grid--phone");
  grid.style.setProperty("--stash-cols", String(STASH_PHONE_COLS));
  const start = page * STASH_PHONE_PAGE_SIZE;
  const end = Math.min(STASH_SIZE, start + STASH_PHONE_PAGE_SIZE);
  for (let i = start; i < end; i++) {
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
    const stack = isPotionItem(item) ? Math.max(1, Math.floor(item.stackCount ?? 1)) : 1;
    btn.setAttribute("aria-label", stack > 1 ? `${item.name} ×${stack}` : item.name);
    if (item.icon) {
      const img = el("img", "inv-cell-icon") as HTMLImageElement;
      img.src = item.icon;
      img.alt = "";
      img.draggable = false;
      face.append(img);
    } else {
      face.append(el("span", "inv-cell-glyph", SLOT_LABEL[item.slot].slice(0, 1)));
    }
    if (stack > 1) {
      face.append(el("span", "inv-cell-stack", String(stack)));
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
