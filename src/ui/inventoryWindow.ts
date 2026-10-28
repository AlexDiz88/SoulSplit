import type { Unit } from "../combat/Unit";
import { canEquipInSlot, equipBlockedToast } from "../items/equipment";
import {
  equipFromInventory,
  equipFromInventoryToSlot,
  findEmptyInventorySlot,
  INVENTORY_COLS,
  INVENTORY_SIZE,
  swapBetweenBags,
  swapInventoryCells,
  unequipToInventory,
  unequipToInventoryAt,
  type InventoryBag,
} from "../items/inventory";
import {
  beltPotionCapacity,
  isPotionItem,
  loadPotionToBelt,
  POTION_LABEL,
} from "../items/potions";
import { SLOT_LABEL, type EquipSlotId } from "../items/slots";
import type { ItemDef } from "../items/types";
import { sellPrice } from "../meta/economy";
import { getItemDrag, type ItemDragSource } from "./itemDrag";
import { fillItemTooltip, placeItemTip } from "./itemTooltip";
import "./itemRarity.css";
import "./inventoryWindow.css";

export interface InventoryWindowApi {
  isOpen(): boolean;
  open(): void;
  close(): void;
  setHero(hero: Unit): void;
  /** Сумка тайника для drag-and-drop; null = тайник закрыт. */
  setStashBag(bag: InventoryBag | null): void;
  /** Режим рынка: ПКМ продажа / экип, Ctrl+ПКМ быстрые действия. */
  setMarketMode(active: boolean): void;
  setCanChangeEquipment(fn: () => boolean): void;
  setOnEquipmentChanged(fn: () => void): void;
  setOnStashChanged(fn: () => void): void;
  /** Продажа в режиме рынка: золото + выкуп. */
  setOnMarketSell(fn: ((item: ItemDef, price: number) => void) | null): void;
  setShowToast(fn: (text: string) => void): void;
}

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
  const tip = el("div", "item-tip inv-tip");
  tip.hidden = true;

  root.append(head, gridHost, tip);
  hud.append(root);

  const itemDrag = getItemDrag();

  let hero: Unit | null = null;
  let stashBag: InventoryBag | null = null;
  let marketMode = false;
  let canChangeEquipment: () => boolean = () => true;
  let onEquipmentChanged: (() => void) | null = null;
  let onStashChanged: (() => void) | null = null;
  let onMarketSell: ((item: ItemDef, price: number) => void) | null = null;
  let showToast: ((text: string) => void) | null = null;

  /** Pending pointer: ещё не прошли порог движения. */
  let pending: { source: ItemDragSource; item: ItemDef; el: HTMLElement; x: number; y: number } | null =
    null;
  let dropHighlight: HTMLElement | null = null;

  const toast = (text: string): void => {
    showToast?.(text);
  };

  const afterChange = (opts?: { stash?: boolean }): void => {
    if (opts?.stash) onStashChanged?.();
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
    cancelDrag();
    root.hidden = true;
    tip.hidden = true;
  };

  const placeTip = (anchor: HTMLElement): void => {
    placeItemTip(tip, anchor, root);
  };

  const showBagTip = (cell: HTMLElement): void => {
    if (itemDrag.isActive() || !hero) return;
    const index = Number(cell.dataset.inv);
    if (!Number.isFinite(index)) return;
    const item = hero.inventory[index];
    if (!item) {
      tip.hidden = true;
      return;
    }
    fillItemTooltip(tip, item);
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

  const cancelDrag = (): void => {
    pending = null;
    itemDrag.cancel();
    clearDropHighlight();
  };

  const applyDrop = (source: ItemDragSource, dropEl: Element | null): void => {
    if (!hero) return;

    if (!canChangeEquipment()) {
      toast("Экипировку можно менять только вне боя");
      return;
    }

    const equipTarget = dropEl?.closest<HTMLElement>(".cs-slot[data-slot]");
    const bagTarget = dropEl?.closest<HTMLElement>(".inv-cell[data-inv]");
    const stashTarget = dropEl?.closest<HTMLElement>(".inv-cell[data-stash]");
    const marketTarget = dropEl?.closest<HTMLElement>(".market-window, .market-detail");

    /** Перетащили на окно рынка - продажа. */
    if (
      marketMode &&
      marketTarget &&
      !equipTarget &&
      !bagTarget &&
      !stashTarget &&
      (source.kind === "inv" || source.kind === "equip" || source.kind === "stash")
    ) {
      if (source.kind === "inv") {
        sellInventoryCell(source.index);
        return;
      }
      if (source.kind === "equip") {
        sellEquipSlot(source.slot);
        return;
      }
      if (source.kind === "stash" && stashBag) {
        const item = stashBag[source.index];
        if (!item) return;
        const price = sellPrice(item);
        stashBag[source.index] = null;
        onMarketSell?.(item, price);
        toast(`Продано: ${item.name} (+${price})`);
        afterChange({ stash: true });
      }
      return;
    }

    if (source.kind === "inv") {
      if (equipTarget) {
        const slot = equipTarget.dataset.slot as EquipSlotId;
        const item = hero.inventory[source.index];
        const result = hero.equipInventoryItemToSlot(source.index, slot);
        if (!result.ok) {
          toast(
            result.reason === "bad_slot" && item
              ? equipBlockedToast(item, slot, hero.equipment, "Слот не подходит")
              : "Нельзя экипировать",
          );
          return;
        }
        afterChange();
        return;
      }
      if (bagTarget) {
        const to = Number(bagTarget.dataset.inv);
        if (!Number.isFinite(to) || to === source.index) return;
        hero.moveInventoryItem(source.index, to);
        afterChange();
        return;
      }
      if (stashTarget && stashBag) {
        const to = Number(stashTarget.dataset.stash);
        if (!Number.isFinite(to)) return;
        swapBetweenBags(hero.inventory, source.index, stashBag, to);
        afterChange({ stash: true });
      }
      return;
    }

    if (source.kind === "stash") {
      if (!stashBag) return;
      if (equipTarget) {
        const slot = equipTarget.dataset.slot as EquipSlotId;
        const item = stashBag[source.index];
        const result = equipFromInventoryToSlot(hero.equipment, stashBag, source.index, slot);
        if (!result.ok) {
          toast(
            result.reason === "bad_slot" && item
              ? equipBlockedToast(item, slot, hero.equipment, "Слот не подходит")
              : "Нельзя экипировать",
          );
          return;
        }
        hero.applyEquipmentChange();
        afterChange({ stash: true });
        return;
      }
      if (bagTarget) {
        const to = Number(bagTarget.dataset.inv);
        if (!Number.isFinite(to)) return;
        swapBetweenBags(stashBag, source.index, hero.inventory, to);
        afterChange({ stash: true });
        return;
      }
      if (stashTarget) {
        const to = Number(stashTarget.dataset.stash);
        if (!Number.isFinite(to) || to === source.index) return;
        swapInventoryCells(stashBag, source.index, to);
        afterChange({ stash: true });
      }
      return;
    }

    if (source.kind === "equip") {
      if (bagTarget) {
        const to = Number(bagTarget.dataset.inv);
        if (!Number.isFinite(to)) return;
        const swapIn = hero.inventory[to] ?? null;
        const result = hero.unequipSlotToIndex(source.slot, to);
        if (!result.ok) {
          toast(
            result.reason === "bad_slot" && swapIn
              ? equipBlockedToast(
                  swapIn,
                  source.slot,
                  hero.equipment,
                  "Нельзя обменять с этим предметом",
                )
              : "Нельзя снять",
          );
          return;
        }
        afterChange();
        return;
      }
      if (stashTarget && stashBag) {
        const to = Number(stashTarget.dataset.stash);
        if (!Number.isFinite(to)) return;
        const swapIn = stashBag[to] ?? null;
        const result = unequipToInventoryAt(hero.equipment, stashBag, source.slot, to);
        if (!result.ok) {
          toast(
            result.reason === "bad_slot" && swapIn
              ? equipBlockedToast(
                  swapIn,
                  source.slot,
                  hero.equipment,
                  "Нельзя обменять с этим предметом",
                )
              : "Нельзя снять",
          );
          return;
        }
        hero.applyEquipmentChange();
        afterChange({ stash: true });
        return;
      }
      if (equipTarget) {
        const slot = equipTarget.dataset.slot as EquipSlotId;
        if (slot === source.slot) return;
        const moving = hero.equipment[source.slot];
        const result = hero.swapEquipSlots(source.slot, slot);
        if (!result.ok) {
          toast(
            moving
              ? equipBlockedToast(moving, slot, hero.equipment, "Слот не подходит")
              : "Слот не подходит",
          );
          return;
        }
        afterChange();
      }
    }
  };

  const updateDropHighlight = (source: ItemDragSource, item: ItemDef, under: Element | null): void => {
    const equipTarget = under?.closest<HTMLElement>(".cs-slot[data-slot]");
    const bagTarget = under?.closest<HTMLElement>(".inv-cell[data-inv]");
    const stashTarget = under?.closest<HTMLElement>(".inv-cell[data-stash]");
    const marketTarget = under?.closest<HTMLElement>(".market-window, .market-detail");
    if ((source.kind === "inv" || source.kind === "stash") && equipTarget) {
      const slot = equipTarget.dataset.slot as EquipSlotId;
      setDropHighlight(equipTarget, canEquipInSlot(item, slot, hero?.equipment));
    } else if (
      (source.kind === "equip" || source.kind === "inv" || source.kind === "stash") &&
      (bagTarget || stashTarget)
    ) {
      setDropHighlight(bagTarget ?? stashTarget ?? null, true);
    } else if (source.kind === "equip" && equipTarget) {
      const slot = equipTarget.dataset.slot as EquipSlotId;
      setDropHighlight(
        equipTarget,
        slot !== source.slot && canEquipInSlot(item, slot, hero?.equipment),
      );
    } else if (
      marketMode &&
      marketTarget &&
      (source.kind === "inv" || source.kind === "equip" || source.kind === "stash")
    ) {
      setDropHighlight(marketTarget, true);
    } else {
      clearDropHighlight();
    }
  };

  const tryEquipRmb = (invIndex: number, forceSlot?: EquipSlotId): void => {
    if (!hero) return;
    if (!canChangeEquipment()) {
      toast("Экипировку можно менять только вне боя");
      return;
    }
    const item = hero.inventory[invIndex];
    if (isPotionItem(item)) {
      const result = loadPotionToBelt(
        hero.inventory,
        invIndex,
        hero,
        beltPotionCapacity(hero.equipment),
      );
      if (!result.ok) {
        if (result.reason === "belt_full") toast("Пояс полон");
        else if (result.reason === "empty") toast("Нет ячеек на поясе");
        else toast("Нельзя зарядить");
        return;
      }
      toast(`На пояс: ${POTION_LABEL[result.potionId]}`);
      afterChange();
      return;
    }
    const result = forceSlot
      ? hero.equipInventoryItemToSlot(invIndex, forceSlot)
      : hero.equipInventoryItem(invIndex);
    if (!result.ok) {
      toast(
        result.reason === "bad_slot" && item
          ? equipBlockedToast(item, forceSlot, hero.equipment, "Слот не подходит")
          : "Нельзя экипировать",
      );
      return;
    }
    afterChange();
  };

  const sellInventoryCell = (invIndex: number): void => {
    if (!hero) return;
    const item = hero.inventory[invIndex];
    if (!item) return;
    const price = sellPrice(item);
    hero.inventory[invIndex] = null;
    onMarketSell?.(item, price);
    toast(`Продано: ${item.name} (+${price})`);
    afterChange();
  };

  const sellEquipSlot = (slot: EquipSlotId): void => {
    if (!hero) return;
    if (!canChangeEquipment()) {
      toast("Экипировку можно менять только вне боя");
      return;
    }
    const item = hero.equipment[slot];
    if (!item) return;
    const price = sellPrice(item);
    delete hero.equipment[slot];
    hero.applyEquipmentChange();
    onMarketSell?.(item, price);
    toast(`Продано: ${item.name} (+${price})`);
    afterChange();
  };

  const moveToFirstEmpty = (from: InventoryBag, fromIndex: number, to: InventoryBag): boolean => {
    const free = findEmptyInventorySlot(to);
    if (free < 0) return false;
    to[free] = from[fromIndex] ?? null;
    from[fromIndex] = null;
    return true;
  };

  gridHost.addEventListener("pointerover", (ev) => {
    const cell = (ev.target as Element).closest<HTMLElement>(".inv-cell[data-inv]");
    if (cell) showBagTip(cell);
  });
  gridHost.addEventListener("pointerout", (ev) => {
    const cell = (ev.target as Element).closest<HTMLElement>(".inv-cell[data-inv]");
    const next = ev.relatedTarget as Element | null;
    if (cell && (!next || !cell.contains(next))) tip.hidden = true;
  });

  /** Без тайника/рынка: ПКМ в сумке надевает. Иначе - window capture. */
  gridHost.addEventListener("contextmenu", (ev) => {
    if (stashBag || marketMode) return;
    ev.preventDefault();
    const cell = (ev.target as Element).closest<HTMLElement>(".inv-cell.filled[data-inv]");
    if (!cell) return;
    const index = Number(cell.dataset.inv);
    if (!Number.isFinite(index)) return;
    tryEquipRmb(index);
  });

  /**
   * Тайник: ПКМ перекладывает, Ctrl+ПКМ надевает / снимает в тайник.
   * Рынок: ПКМ продажа / снять; Ctrl+ПКМ одеть / быстрая продажа с экипа;
   * кольца: Ctrl+ПКМ = левый (ring1), Shift+ПКМ = правый (ring2).
   */
  window.addEventListener(
    "contextmenu",
    (ev) => {
      if (!hero) return;
      if (!stashBag && !marketMode) return;

      const invCell = (ev.target as Element).closest<HTMLElement>(".inv-cell.filled[data-inv]");
      const stashCell = (ev.target as Element).closest<HTMLElement>(".inv-cell.filled[data-stash]");
      const equipSlot = (ev.target as Element).closest<HTMLElement>(".cs-slot.filled[data-slot]");
      if (!invCell && !stashCell && !equipSlot) return;

      ev.preventDefault();
      ev.stopPropagation();

      if (!canChangeEquipment()) {
        toast("Экипировку можно менять только вне боя");
        return;
      }

      const ctrl = ev.ctrlKey || ev.metaKey;
      const shift = ev.shiftKey;

      if (marketMode && !stashBag) {
        if (invCell) {
          const index = Number(invCell.dataset.inv);
          if (!Number.isFinite(index)) return;
          const item = hero.inventory[index];
          if (!item) return;
          const isRing = item.slot === "ring1" || item.slot === "ring2";
          if (isRing && shift) {
            tryEquipRmb(index, "ring2");
            return;
          }
          if (isRing && ctrl) {
            tryEquipRmb(index, "ring1");
            return;
          }
          if (ctrl) {
            tryEquipRmb(index);
            return;
          }
          sellInventoryCell(index);
          return;
        }

        if (equipSlot) {
          const slot = equipSlot.dataset.slot as EquipSlotId;
          if (ctrl) {
            sellEquipSlot(slot);
            return;
          }
          const result = hero.unequipSlot(slot);
          if (!result.ok) {
            if (result.reason === "inventory_full") toast("Инвентарь полон");
            return;
          }
          afterChange();
        }
        return;
      }

      if (!stashBag) return;

      if (stashCell) {
        const index = Number(stashCell.dataset.stash);
        if (!Number.isFinite(index)) return;
        if (ctrl) {
          const item = stashBag[index];
          const result = equipFromInventory(hero.equipment, stashBag, index);
          if (!result.ok) {
            toast(
              result.reason === "bad_slot" && item
                ? equipBlockedToast(item, null, hero.equipment, "Слот не подходит")
                : "Нельзя экипировать",
            );
            return;
          }
          hero.applyEquipmentChange();
          afterChange({ stash: true });
          return;
        }
        if (!moveToFirstEmpty(stashBag, index, hero.inventory)) {
          toast("Инвентарь полон");
          return;
        }
        afterChange({ stash: true });
        return;
      }

      if (invCell) {
        const index = Number(invCell.dataset.inv);
        if (!Number.isFinite(index)) return;
        if (ctrl) {
          tryEquipRmb(index);
          return;
        }
        if (!moveToFirstEmpty(hero.inventory, index, stashBag)) {
          toast("Тайник полон");
          return;
        }
        afterChange({ stash: true });
        return;
      }

      if (equipSlot) {
        const slot = equipSlot.dataset.slot as EquipSlotId;
        if (ctrl) {
          const result = unequipToInventory(hero.equipment, stashBag, slot);
          if (!result.ok) {
            if (result.reason === "inventory_full") toast("Тайник полон");
            return;
          }
          hero.applyEquipmentChange();
          afterChange({ stash: true });
          return;
        }
        const result = hero.unequipSlot(slot);
        if (!result.ok) {
          if (result.reason === "inventory_full") toast("Инвентарь полон");
          return;
        }
        afterChange();
      }
    },
    true,
  );

  const onPointerDown = (ev: PointerEvent): void => {
    if (ev.button !== 0 || !hero) return;
    const equip = (ev.target as Element).closest<HTMLElement>(".cs-slot.filled");
    const invCell = (ev.target as Element).closest<HTMLElement>(".inv-cell.filled[data-inv]");
    const stashCell = (ev.target as Element).closest<HTMLElement>(".inv-cell.filled[data-stash]");

    if (!equip && !invCell && !stashCell) return;
    if (invCell && root.hidden) return;
    if (stashCell && !stashBag) return;
    if (equip && root.hidden && !stashBag && !marketMode) return;

    let source: ItemDragSource;
    let item: ItemDef | null | undefined;
    let sourceEl: HTMLElement;
    if (equip) {
      const slot = equip.dataset.slot as EquipSlotId;
      item = hero.equipment[slot];
      source = { kind: "equip", slot };
      sourceEl = equip;
    } else if (stashCell && stashBag) {
      const index = Number(stashCell.dataset.stash);
      if (!Number.isFinite(index)) return;
      item = stashBag[index];
      source = { kind: "stash", index };
      sourceEl = stashCell;
    } else if (invCell) {
      const index = Number(invCell.dataset.inv);
      if (!Number.isFinite(index)) return;
      item = hero.inventory[index];
      source = { kind: "inv", index };
      sourceEl = invCell;
    } else {
      return;
    }
    if (!item) return;

    pending = { source, item, el: sourceEl, x: ev.clientX, y: ev.clientY };
  };

  window.addEventListener("pointerdown", onPointerDown, true);

  window.addEventListener("pointermove", (ev) => {
    if (pending && !itemDrag.isActive()) {
      const dx = ev.clientX - pending.x;
      const dy = ev.clientY - pending.y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
      tip.hidden = true;
      itemDrag.begin(pending.item, pending.source, ev.clientX, ev.clientY, pending.el);
      pending = null;
    }

    if (!itemDrag.isActive()) return;
    const session = itemDrag.getSession();
    if (!session) return;
    itemDrag.move(ev.clientX, ev.clientY);
    updateDropHighlight(session.source, session.item, itemDrag.hitTest(ev.clientX, ev.clientY));
  });

  window.addEventListener("pointerup", (ev) => {
    if (pending) {
      pending = null;
      return;
    }
    if (!itemDrag.isActive()) return;
    const under = itemDrag.hitTest(ev.clientX, ev.clientY);
    const session = itemDrag.end();
    clearDropHighlight();
    if (session && (session.source.kind === "inv" || session.source.kind === "stash" || session.source.kind === "equip")) {
      applyDrop(session.source, under);
    }
  });
  window.addEventListener("pointercancel", () => cancelDrag());

  return {
    isOpen: () => !root.hidden,
    open,
    close,
    setHero(next) {
      hero = next;
      if (!root.hidden) render();
    },
    setStashBag(bag) {
      stashBag = bag;
    },
    setMarketMode(active) {
      marketMode = active;
    },
    setCanChangeEquipment(fn) {
      canChangeEquipment = fn;
      if (!root.hidden) render();
    },
    setOnEquipmentChanged(fn) {
      onEquipmentChanged = fn;
    },
    setOnStashChanged(fn) {
      onStashChanged = fn;
    },
    setOnMarketSell(fn) {
      onMarketSell = fn;
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
    btn.setAttribute("aria-label", `Пустая ячейка ${index + 1}`);
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
