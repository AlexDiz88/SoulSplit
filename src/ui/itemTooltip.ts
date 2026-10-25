import { formatRolledAffix } from "../items/affixCatalog";
import { isTwoHandPlaceholder } from "../items/equipment";
import { SLOT_LABEL, type EquipSlotId } from "../items/slots";
import type { ItemDef, WeaponImplicit } from "../items/types";
import { sellPrice } from "../meta/economy";
import { goldTipLine } from "./goldIcon";
import "./itemTooltip.css";

export interface ItemTooltipOptions {
  /** Показать цену продажи внизу. По умолчанию true. */
  showSellPrice?: boolean;
  /** Крупная иконка над названием (2x2 ячейки инвентаря). По умолчанию true. */
  showIcon?: boolean;
  /** Подпись над иконкой/названием ("В продаже", "Экипировано"). */
  caption?: string;
  /** Кастомная цена в футере вместо продажи (например цена покупки). */
  priceLabel?: string;
  priceAmount?: number;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function rule(): HTMLElement {
  return el("div", "item-tip-rule");
}

/** Подпись слота: "Основная рука" / "Левая рука" / "Обе руки". */
export function itemSlotLabel(item: ItemDef): string {
  if (isTwoHandPlaceholder(item)) return "Обе руки";
  // Пока без двуручного владения: любое 1H-оружие только в основную руку.
  if (item.weapon) return SLOT_LABEL.mainhand;
  return SLOT_LABEL[item.slot];
}

export function weaponDps(weapon: WeaponImplicit): number {
  const avg = (weapon.damageMin + weapon.damageMax) / 2;
  return weapon.baseCd > 0 ? avg / weapon.baseCd : 0;
}

export function formatWeaponDps(weapon: WeaponImplicit): string {
  const value = weaponDps(weapon);
  if (!Number.isFinite(value)) return "0.0";
  return (Math.round(value * 10) / 10).toFixed(1);
}

function itemIconNode(item: ItemDef): HTMLElement {
  const wrap = el("div", "item-tip-icon");
  const face = el("div", "item-tip-icon-face");
  if (item.icon) {
    const img = document.createElement("img");
    img.src = item.icon;
    img.alt = "";
    img.draggable = false;
    face.append(img);
  }
  wrap.append(face);
  return wrap;
}

/**
 * Содержимое тултипа предмета в стиле Hero Siege:
 * название → слот → база (DPS) → аффиксы → уровень.
 * Редкость видна по цвету названия, отдельной строкой не пишем.
 */
export function renderItemTooltip(item: ItemDef, options: ItemTooltipOptions = {}): HTMLElement[] {
  const showSell = options.showSellPrice !== false && options.priceAmount === undefined;
  const showIcon = options.showIcon !== false;
  const nodes: HTMLElement[] = [];

  if (options.caption) {
    nodes.push(el("div", "item-tip-caption", options.caption));
  }
  if (showIcon) {
    nodes.push(itemIconNode(item));
  }

  nodes.push(
    el("div", "item-tip-name", item.name),
    el("div", "item-tip-sub", itemSlotLabel(item)),
  );

  const hasBase = Boolean(item.weapon);
  const hasAffixes = item.affixes.length > 0;

  nodes.push(rule());

  if (item.weapon) {
    const base = el("div", "item-tip-base");
    const dps = el("div", "item-tip-dps");
    dps.append(
      el("span", "item-tip-dps-label", "DPS"),
      document.createTextNode(" "),
      el("span", "item-tip-dps-value", formatWeaponDps(item.weapon)),
    );
    base.append(dps);
    nodes.push(base);
  }

  if (hasAffixes) {
    if (hasBase) nodes.push(rule());
    const affixes = el("div", "item-tip-affixes");
    const prefixes = item.affixes.filter((a) => a.affixSlot === "prefix");
    const suffixes = item.affixes.filter((a) => a.affixSlot === "suffix");
    for (const a of prefixes) {
      affixes.append(el("div", "item-tip-affix item-tip-affix-prefix", formatRolledAffix(a)));
    }
    for (const a of suffixes) {
      affixes.append(el("div", "item-tip-affix item-tip-affix-suffix", formatRolledAffix(a)));
    }
    nodes.push(affixes);
  }

  if (hasBase || hasAffixes) nodes.push(rule());

  const footer = el("div", "item-tip-footer");
  footer.append(el("div", "item-tip-level", `Уровень предмета ${item.itemLevel}`));
  if (options.priceAmount !== undefined) {
    footer.append(
      goldTipLine(options.priceLabel ?? "Цена:", options.priceAmount, "item-tip-sell"),
    );
  } else if (showSell) {
    footer.append(goldTipLine("Продажа:", sellPrice(item), "item-tip-sell"));
  }
  nodes.push(footer);

  return nodes;
}

/** Заполняет хост тултипа и выставляет data-rarity. */
export function fillItemTooltip(
  host: HTMLElement,
  item: ItemDef,
  options: ItemTooltipOptions = {},
): void {
  host.replaceChildren();
  host.dataset.rarity = item.rarity;
  host.classList.remove("empty");
  host.append(...renderItemTooltip(item, options));
}

/** Пустой слот в окне сравнения. */
export function fillEmptyItemTooltip(host: HTMLElement, slot: EquipSlotId, caption?: string): void {
  host.replaceChildren();
  delete host.dataset.rarity;
  host.classList.add("empty");
  if (caption) host.append(el("div", "item-tip-caption", caption));
  host.append(
    el("div", "item-tip-empty-name", SLOT_LABEL[slot]),
    el("div", "item-tip-empty-meta", "Пусто"),
  );
}
