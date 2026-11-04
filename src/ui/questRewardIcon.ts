import { itemDisplayName } from "../items/generate";
import { SLOT_LABEL } from "../items/slots";
import type { ItemDef } from "../items/types";
import { fillItemTooltip } from "./itemTooltip";
import "./inventoryWindow.css";
import "./itemRarity.css";
import "./itemTooltip.css";
import "./questRewardIcon.css";

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

/** Ячейка награды размера инвентаря + кастомный тултип при наведении. */
export function createQuestRewardIcon(item: ItemDef): HTMLElement {
  const wrap = el("div", "quest-reward-slot");
  const tip = el("div", "item-tip quest-reward-tip");
  tip.hidden = true;

  const cell = el("button", "inv-cell filled quest-reward-cell");
  cell.type = "button";
  cell.dataset.rarity = item.rarity;
  cell.setAttribute("aria-label", itemDisplayName(item));

  const face = el("span", "inv-cell-face");
  if (item.icon) {
    const img = el("img", "inv-cell-icon") as HTMLImageElement;
    img.src = item.icon;
    img.alt = "";
    img.draggable = false;
    face.append(img);
  } else {
    face.append(el("span", "inv-cell-glyph", SLOT_LABEL[item.slot].slice(0, 1)));
  }
  cell.append(face);

  const hideTip = (): void => {
    tip.hidden = true;
  };

  const showTip = (): void => {
    fillItemTooltip(tip, item, { showIcon: true, showSellPrice: false });
    tip.hidden = false;
    tip.style.position = "fixed";
    tip.style.zIndex = "80";
    const rect = cell.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 8;
    const margin = 6;
    let left = rect.left + (rect.width - tipRect.width) / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const top =
      spaceBelow >= tipRect.height + gap
        ? rect.bottom + gap
        : rect.top - tipRect.height - gap;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };

  cell.addEventListener("pointerenter", () => showTip());
  cell.addEventListener("pointerleave", hideTip);
  cell.addEventListener("blur", hideTip);

  wrap.append(cell, tip);
  return wrap;
}
