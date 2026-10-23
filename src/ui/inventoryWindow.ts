import { ASPECT_LABEL } from "../abilities/definitions";
import type { Unit } from "../combat/Unit";
import { canEquipInSlot } from "../items/equipment";
import { INVENTORY_COLS, INVENTORY_SIZE } from "../items/inventory";
import { SLOT_LABEL, type EquipSlotId } from "../items/slots";
import { RARITY_LABEL, type ItemDef } from "../items/types";
import { formatStatValue } from "../stats/statIds";
import "./inventoryWindow.css";

export interface InventoryWindowApi {
  isOpen(): boolean;
  open(): void;
  close(): void;
  setHero(hero: Unit): void;
  setCanChangeEquipment(fn: () => boolean): void;
  setOnEquipmentChanged(fn: () => void): void;
  setShowToast(fn: (text: string) => void): void;
}

type DragOrigin =
  | { kind: "inv"; index: number }
  | { kind: "equip"; slot: EquipSlotId };

const DRAG_THRESHOLD = 5;

/** Компактная сумка 5×5 - отдельное окно справа внизу, рядом с листом персонажа. */
export function mountInventoryWindow(): InventoryWindowApi {
  const hud = document.getElementById("hud")!;
  const root = el("div", "inv-bag-root");
  root.id = "inventory";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-labelledby", "inv-title");

  const head = el("header", "inv-bag-head");
  const title = el("h2", "inv-title", "Инвентарь");
  title.id = "inv-title";
  const count = el("span", "inv-bag-count", `0 / ${INVENTORY_SIZE}`);
  head.append(title, count);

  const gridHost = el("div", "inv-bag-grid-host");
  const tip = el("div", "inv-tip");
  tip.hidden = true;
  const ghost = el("div", "inv-ghost");
  ghost.hidden = true;

  root.append(head, gridHost, tip);
  hud.append(root, ghost);

  let hero: Unit | null = null;
  let canChangeEquipment: () => boolean = () => true;
  let onEquipmentChanged: (() => void) | null = null;
  let showToast: ((text: string) => void) | null = null;

  let dragOrigin: DragOrigin | null = null;
  let dragItem: ItemDef | null = null;
  let dragActive = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dropHighlight: HTMLElement | null = null;

  const toast = (text: string): void => {
    showToast?.(text);
  };

  const afterChange = (): void => {
    onEquipmentChanged?.();
    render();
  };

  const render = (): void => {
    tip.hidden = true;
    const filled = hero ? hero.inventory.filter(Boolean).length : 0;
    count.textContent = `${filled} / ${INVENTORY_SIZE}`;
    gridHost.replaceChildren(renderGrid(hero));
    root.classList.toggle("inv-locked", !canChangeEquipment());
  };

  const open = (): void => {
    render();
    root.hidden = false;
  };

  const close = (): void => {
    endDrag(false);
    root.hidden = true;
    tip.hidden = true;
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
    if (dragActive || !hero) return;
    const index = Number(cell.dataset.inv);
    if (!Number.isFinite(index)) return;
    tip.replaceChildren();
    const item = hero.inventory[index];
    tip.dataset.rarity = item?.rarity ?? "";
    if (!item) {
      tip.append(el("div", "inv-tip-name", "Пустая ячейка"), el("div", "inv-tip-meta", "Рюкзак"));
    } else {
      tip.append(...renderItemTip(item));
      tip.append(el("div", "inv-tip-meta", "ПКМ - надеть · перетащить на слот"));
    }
    placeTip(cell);
  };

  const clearDropHighlight = (): void => {
    dropHighlight?.classList.remove("inv-drop-ok", "inv-drop-bad");
    dropHighlight = null;
  };

  const setDropHighlight = (node: HTMLElement | null, ok: boolean): void => {
    if (dropHighlight === node) {
      if (node) {
        node.classList.toggle("inv-drop-ok", ok);
        node.classList.toggle("inv-drop-bad", !ok);
      }
      return;
    }
    clearDropHighlight();
    dropHighlight = node;
    if (node) {
      node.classList.toggle("inv-drop-ok", ok);
      node.classList.toggle("inv-drop-bad", !ok);
    }
  };

  const hitUnder = (x: number, y: number): Element | null => {
    ghost.hidden = true;
    const under = document.elementFromPoint(x, y);
    if (dragActive) ghost.hidden = false;
    return under;
  };

  const endDrag = (apply: boolean, dropEl?: Element | null): void => {
    const origin = dragOrigin;
    const item = dragItem;
    dragOrigin = null;
    dragItem = null;
    dragActive = false;
    ghost.hidden = true;
    ghost.replaceChildren();
    clearDropHighlight();
    document.body.classList.remove("inv-dragging");
    if (!apply || !origin || !item || !hero) return;

    if (!canChangeEquipment()) {
      toast("Экипировку можно менять только вне боя");
      return;
    }

    const equipTarget = dropEl?.closest<HTMLElement>(".cs-slot[data-slot]");
    const bagTarget = dropEl?.closest<HTMLElement>(".inv-cell[data-inv]");

    if (origin.kind === "inv") {
      if (equipTarget) {
        const slot = equipTarget.dataset.slot as EquipSlotId;
        const result = hero.equipInventoryItemToSlot(origin.index, slot);
        if (!result.ok) {
          toast(result.reason === "bad_slot" ? "Слот не подходит" : "Нельзя экипировать");
          return;
        }
        afterChange();
        return;
      }
      if (bagTarget) {
        const to = Number(bagTarget.dataset.inv);
        if (!Number.isFinite(to) || to === origin.index) return;
        hero.moveInventoryItem(origin.index, to);
        afterChange();
      }
      return;
    }

    if (origin.kind === "equip") {
      if (bagTarget) {
        const to = Number(bagTarget.dataset.inv);
        if (!Number.isFinite(to)) return;
        const result = hero.unequipSlotToIndex(origin.slot, to);
        if (!result.ok) {
          toast(result.reason === "bad_slot" ? "Нельзя обменять с этим предметом" : "Нельзя снять");
          return;
        }
        afterChange();
        return;
      }
      if (equipTarget) {
        const slot = equipTarget.dataset.slot as EquipSlotId;
        if (slot === origin.slot) return;
        const result = hero.swapEquipSlots(origin.slot, slot);
        if (!result.ok) {
          toast("Слот не подходит");
          return;
        }
        afterChange();
      }
    }
  };

  const beginGhost = (item: ItemDef, x: number, y: number): void => {
    ghost.replaceChildren();
    ghost.dataset.rarity = item.rarity;
    if (item.icon) {
      const img = el("img", "inv-ghost-icon") as HTMLImageElement;
      img.src = item.icon;
      img.alt = "";
      img.draggable = false;
      ghost.append(img);
    } else {
      ghost.append(el("span", "inv-ghost-glyph", SLOT_LABEL[item.slot].slice(0, 1)));
    }
    ghost.hidden = false;
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
    document.body.classList.add("inv-dragging");
    tip.hidden = true;
  };

  const tryEquipRmb = (invIndex: number): void => {
    if (!hero) return;
    if (!canChangeEquipment()) {
      toast("Экипировку можно менять только вне боя");
      return;
    }
    const result = hero.equipInventoryItem(invIndex);
    if (!result.ok) {
      toast(result.reason === "bad_slot" ? "Слот не подходит" : "Нельзя экипировать");
      return;
    }
    afterChange();
  };

  gridHost.addEventListener("pointerover", (ev) => {
    const cell = (ev.target as Element).closest<HTMLElement>(".inv-cell");
    if (cell) showBagTip(cell);
  });
  gridHost.addEventListener("pointerout", (ev) => {
    const cell = (ev.target as Element).closest<HTMLElement>(".inv-cell");
    const next = ev.relatedTarget as Element | null;
    if (cell && (!next || !cell.contains(next))) tip.hidden = true;
  });

  gridHost.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    const cell = (ev.target as Element).closest<HTMLElement>(".inv-cell.filled");
    if (!cell) return;
    const index = Number(cell.dataset.inv);
    if (!Number.isFinite(index)) return;
    tryEquipRmb(index);
  });

  const onPointerDown = (ev: PointerEvent): void => {
    if (root.hidden || ev.button !== 0 || !hero) return;
    const bag = (ev.target as Element).closest<HTMLElement>(".inv-cell.filled");
    const equip = (ev.target as Element).closest<HTMLElement>(".cs-slot.filled");
    if (!bag && !equip) return;

    let origin: DragOrigin;
    let item: ItemDef | null | undefined;
    if (equip) {
      const slot = equip.dataset.slot as EquipSlotId;
      item = hero.equipment[slot];
      origin = { kind: "equip", slot };
    } else {
      const index = Number(bag!.dataset.inv);
      if (!Number.isFinite(index)) return;
      item = hero.inventory[index];
      origin = { kind: "inv", index };
    }
    if (!item) return;

    dragOrigin = origin;
    dragItem = item;
    dragActive = false;
    dragStartX = ev.clientX;
    dragStartY = ev.clientY;
  };

  window.addEventListener("pointerdown", onPointerDown, true);

  window.addEventListener("pointermove", (ev) => {
    if (!dragOrigin || !dragItem) return;
    const dx = ev.clientX - dragStartX;
    const dy = ev.clientY - dragStartY;
    if (!dragActive) {
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
      dragActive = true;
      beginGhost(dragItem, ev.clientX, ev.clientY);
    }
    ghost.style.left = `${ev.clientX}px`;
    ghost.style.top = `${ev.clientY}px`;

    const under = hitUnder(ev.clientX, ev.clientY);
    const equipTarget = under?.closest<HTMLElement>(".cs-slot[data-slot]");
    const bagTarget = under?.closest<HTMLElement>(".inv-cell[data-inv]");
    if (dragOrigin.kind === "inv" && equipTarget) {
      const slot = equipTarget.dataset.slot as EquipSlotId;
      setDropHighlight(equipTarget, canEquipInSlot(dragItem, slot));
    } else if (dragOrigin.kind === "equip" && bagTarget) {
      setDropHighlight(bagTarget, true);
    } else if (dragOrigin.kind === "inv" && bagTarget) {
      setDropHighlight(bagTarget, true);
    } else if (dragOrigin.kind === "equip" && equipTarget) {
      const slot = equipTarget.dataset.slot as EquipSlotId;
      setDropHighlight(equipTarget, slot !== dragOrigin.slot && canEquipInSlot(dragItem, slot));
    } else {
      clearDropHighlight();
    }
  });

  window.addEventListener("pointerup", (ev) => {
    if (!dragOrigin) return;
    const under = hitUnder(ev.clientX, ev.clientY);
    endDrag(dragActive, under);
  });
  window.addEventListener("pointercancel", () => endDrag(false));

  return {
    isOpen: () => !root.hidden,
    open,
    close,
    setHero(next) {
      hero = next;
      if (!root.hidden) render();
    },
    setCanChangeEquipment(fn) {
      canChangeEquipment = fn;
      if (!root.hidden) render();
    },
    setOnEquipmentChanged(fn) {
      onEquipmentChanged = fn;
    },
    setShowToast(fn) {
      showToast = fn;
    },
  };
}

function renderGrid(hero: Unit | null): HTMLElement {
  const grid = el("div", "inv-bag-grid");
  grid.style.setProperty("--inv-cols", String(INVENTORY_COLS));
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    grid.append(bagCell(i, hero?.inventory[i] ?? null));
  }
  return grid;
}

function bagCell(index: number, item: ItemDef | null): HTMLButtonElement {
  const btn = el("button", "inv-cell");
  btn.type = "button";
  btn.dataset.inv = String(index);
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
    btn.setAttribute("aria-label", `Пустая ячейка ${index + 1}`);
  }
  btn.append(face);
  return btn;
}

function renderItemTip(item: ItemDef): HTMLElement[] {
  const nodes: HTMLElement[] = [
    el("div", "inv-tip-name", item.name),
    el(
      "div",
      "inv-tip-meta",
      `${RARITY_LABEL[item.rarity]} · ${SLOT_LABEL[item.slot]} · ур. ${item.itemLevel}`,
    ),
  ];
  if (item.aspectTag) {
    nodes.push(el("div", "inv-tip-meta", `Аспект: ${ASPECT_LABEL[item.aspectTag]}`));
  }
  if (item.weapon) {
    nodes.push(
      el(
        "div",
        "inv-tip-line",
        `Урон оружия: ${item.weapon.damageMin}-${item.weapon.damageMax}`,
      ),
      el("div", "inv-tip-line", `Кулдаун атаки: ${item.weapon.baseCd.toFixed(1)} с`),
    );
  }
  const prefixes = item.affixes.filter((a) => a.affixSlot === "prefix");
  const suffixes = item.affixes.filter((a) => a.affixSlot === "suffix");
  for (const a of prefixes) {
    nodes.push(el("div", "inv-tip-affix inv-tip-prefix", `${a.label}: ${formatStatValue(a.statId, a.value)}`));
  }
  for (const a of suffixes) {
    nodes.push(el("div", "inv-tip-affix inv-tip-suffix", `${a.label}: ${formatStatValue(a.statId, a.value)}`));
  }
  if (!item.affixes.length) {
    nodes.push(el("div", "inv-tip-meta", "Без аффиксов"));
  }
  return nodes;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
