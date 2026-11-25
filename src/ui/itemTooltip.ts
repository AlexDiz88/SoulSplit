import { rolledAffixParts } from "../items/affixCatalog";
import { rolledItemBaseParts } from "../items/baseCatalog";
import { gripLabel, type EquipmentMap } from "../items/equipment";
import { itemDisplayName } from "../items/generate";
import { OFFHAND_WEAPON_DAMAGE_MULT } from "../items/grip";
import {
  isPotionItem,
  POTION_BATTLE_NOTE,
  POTION_LABEL,
  potionEffectText,
} from "../items/potions";
import { SLOT_LABEL, type EquipSlotId } from "../items/slots";
import type { ItemDef, WeaponImplicit } from "../items/types";
import { sellPrice } from "../meta/economy";
import { goldTipLine } from "./goldIcon";
import "./itemRarity.css";
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
  /** Слот, в котором предмет сейчас надет (для штрафа левой руки). */
  equippedSlot?: EquipSlotId;
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

/** Строка бонуса + мелкий серый тир "[min-max] Tier". */
function rolledStatLine(
  className: string,
  parts: { main: string; tierMeta?: string },
): HTMLElement {
  const line = el("div", className, parts.main);
  if (parts.tierMeta) {
    line.append(document.createTextNode(" "));
    line.append(el("span", "item-tip-tier-meta", parts.tierMeta));
  }
  return line;
}

/** Подпись слота предмета: "Основная рука" / "Палец" (без номера) / … */
export function itemSlotLabel(item: ItemDef): string {
  if (isPotionItem(item)) return "Зелье";
  const fromGrip = gripLabel(item);
  if (fromGrip) return fromGrip;
  // У кольца слот экипа ring1/ring2 нумеруется, сам предмет - просто "Палец".
  if (item.slot === "ring1" || item.slot === "ring2") return "Палец";
  return SLOT_LABEL[item.slot];
}

export function weaponDps(weapon: WeaponImplicit, damageMult = 1): number {
  const avg = ((weapon.damageMin + weapon.damageMax) / 2) * damageMult;
  return weapon.baseCd > 0 ? avg / weapon.baseCd : 0;
}

export function formatWeaponDps(weapon: WeaponImplicit, damageMult = 1): string {
  const value = weaponDps(weapon, damageMult);
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
 * название → слот → база → [DPS оружия] → аффиксы → уровень.
 * Редкость видна по цвету названия, отдельной строкой не пишем.
 */
export function renderItemTooltip(item: ItemDef, options: ItemTooltipOptions = {}): HTMLElement[] {
  const showSell = options.showSellPrice !== false && options.priceAmount === undefined;
  const showIcon = options.showIcon !== false;
  const nodes: HTMLElement[] = [];
  const offhandWeapon =
    Boolean(item.weapon) && options.equippedSlot === "offhand";
  const damageMult = offhandWeapon ? OFFHAND_WEAPON_DAMAGE_MULT : 1;

  if (options.caption) {
    nodes.push(el("div", "item-tip-caption", options.caption));
  }
  if (showIcon) {
    nodes.push(itemIconNode(item));
  }

  // Верхний блок: имя → слот → база.
  const tipName = isPotionItem(item)
    ? `${POTION_LABEL[item.potionId]}${
        (item.stackCount ?? 1) > 1 ? ` ×${item.stackCount}` : ""
      }`
    : itemDisplayName(item);
  nodes.push(el("div", "item-tip-name", tipName));
  nodes.push(el("div", "item-tip-sub", itemSlotLabel(item)));
  if (isPotionItem(item)) {
    nodes.push(el("div", "item-tip-base-stat", potionEffectText(item.potionId)));
    nodes.push(el("div", "item-tip-note", POTION_BATTLE_NOTE));
  } else if (item.weapon) {
    const w = item.weapon;
    nodes.push(
      rolledStatLine("item-tip-base-stat", {
        main: `Урон ${w.damageMin}-${w.damageMax} · КД ${w.baseCd.toFixed(1)} с`,
        tierMeta: w.tierId ? `[${w.tierId}]` : undefined,
      }),
    );
  } else if (item.base) {
    nodes.push(rolledStatLine("item-tip-base-stat", rolledItemBaseParts(item.base)));
  }

  const hasAffixes = item.affixes.length > 0;

  // DPS оружия - отдельный блок под верхним.
  if (item.weapon) {
    nodes.push(rule());
    const dpsBlock = el("div", "item-tip-base");
    const dps = el("div", "item-tip-dps");
    dps.append(
      el("span", "item-tip-dps-label", "DPS"),
      document.createTextNode(" "),
      el("span", "item-tip-dps-value", formatWeaponDps(item.weapon, damageMult)),
    );
    dpsBlock.append(dps);
    if (offhandWeapon) {
      dpsBlock.append(
        el(
          "div",
          "item-tip-offhand-penalty",
          `Левая рука: -${Math.round((1 - OFFHAND_WEAPON_DAMAGE_MULT) * 100)}% урона автоатак`,
        ),
      );
    }
    nodes.push(dpsBlock);
  }

  if (hasAffixes) {
    nodes.push(rule());
    const affixes = el("div", "item-tip-affixes");
    const prefixes = item.affixes.filter((a) => a.affixSlot === "prefix");
    const suffixes = item.affixes.filter((a) => a.affixSlot === "suffix");
    for (const a of prefixes) {
      affixes.append(rolledStatLine("item-tip-affix item-tip-affix-prefix", rolledAffixParts(a)));
    }
    for (const a of suffixes) {
      affixes.append(rolledStatLine("item-tip-affix item-tip-affix-suffix", rolledAffixParts(a)));
    }
    nodes.push(affixes);
  }

  nodes.push(rule());

  const footer = el("div", "item-tip-footer");
  if (!isPotionItem(item)) {
    footer.append(el("div", "item-tip-level", `Уровень предмета ${item.itemLevel}`));
  }
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
  host.classList.toggle("item-tip--potion", isPotionItem(item));
  host.classList.remove("empty");
  host.append(...renderItemTooltip(item, options));
}

/**
 * Ставит тултип под нижней гранью якоря (ячейка/слот).
 * Если снизу на экране нет места - над верхней гранью.
 * Иконка якоря не перекрывается.
 * Крепится к #hud с position:fixed, чтобы не обрезаться окном и быть поверх сумки.
 */
export function placeItemTip(
  tip: HTMLElement,
  anchor: HTMLElement,
  _container?: HTMLElement,
  opts?: { gap?: number; margin?: number },
): void {
  const hud = document.getElementById("hud");
  if (hud && tip.parentElement !== hud) hud.append(tip);

  tip.hidden = false;
  tip.style.position = "fixed";
  tip.style.zIndex = "60";

  const gap = opts?.gap ?? 8;
  const margin = opts?.margin ?? 6;
  const rect = anchor.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();

  let left = rect.left + (rect.width - tipRect.width) / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));

  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const need = tipRect.height + gap;
  const top =
    spaceBelow >= need ? rect.bottom + gap : rect.top - tipRect.height - gap;

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

/** Пустой слот в окне сравнения. */
export function fillEmptyItemTooltip(host: HTMLElement, slot: EquipSlotId, caption?: string): void {
  host.replaceChildren();
  delete host.dataset.rarity;
  host.classList.add("empty");
  const phoneCompare = host.classList.contains("item-tip--phone-compare");
  if (caption) host.append(el("div", "item-tip-caption", caption));
  if (phoneCompare) {
    host.append(
      el("div", "item-tip-empty-name", "Пусто"),
      el("div", "item-tip-empty-meta", SLOT_LABEL[slot]),
    );
    return;
  }
  host.append(
    el("div", "item-tip-empty-name", SLOT_LABEL[slot]),
    el("div", "item-tip-empty-meta", "Пусто"),
  );
}

/** Слоты экипа для сравнения при наведении на предмет. */
export function compareEquipSlotsFor(item: ItemDef): EquipSlotId[] {
  if (isPotionItem(item)) return [];
  if (item.slot === "ring1" || item.slot === "ring2") return ["ring1", "ring2"];
  if (item.slot === "mainhand" || item.slot === "offhand") return ["mainhand", "offhand"];
  return [item.slot];
}

export interface PositionItemCompareOpts {
  gap?: number;
  margin?: number;
  /**
   * se - справа-вниз от курсора (рынок / добыча).
   * nw - влево-вверх от якоря или курсора (сумка справа внизу).
   */
  prefer?: "se" | "nw";
  /** Ячейка/слот: панель не должна его перекрывать. */
  anchor?: HTMLElement;
}

/** Ставит панель сравнения; по умолчанию справа-вниз от курсора. */
export function positionItemCompare(
  compare: HTMLElement,
  clientX: number,
  clientY: number,
  opts?: PositionItemCompareOpts,
): void {
  compare.hidden = false;
  const tipRect = compare.getBoundingClientRect();
  const gap = opts?.gap ?? 16;
  const margin = opts?.margin ?? 8;
  const prefer = opts?.prefer ?? "se";
  const w = tipRect.width;
  const h = tipRect.height;
  const maxLeft = window.innerWidth - w - margin;
  const maxTop = window.innerHeight - h - margin;

  let left: number;
  let top: number;

  if (prefer === "nw") {
    const anchor = opts?.anchor?.getBoundingClientRect();
    const refBottom = anchor ? anchor.top : clientY;
    // Панель над ячейкой; правый край подсказки = правый край иконки.
    top = refBottom - h - gap;
    left = (anchor ? anchor.right : clientX) - w;

    left = Math.max(margin, Math.min(left, maxLeft));
    top = Math.max(margin, Math.min(top, maxTop));
  } else {
    left = clientX + gap;
    top = clientY + gap;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    if (top > maxTop) top = Math.max(margin, maxTop);
    left = Math.max(margin, left);
    top = Math.max(margin, top);
  }

  compare.style.left = `${left}px`;
  compare.style.top = `${top}px`;
}

export interface ItemCompareCardOptions {
  tipClass: string;
  itemCaption: string;
  equippedCaption?: string;
  showItemSellPrice?: boolean;
  showEquippedSellPrice?: boolean;
  /** Цена покупки/выкупа на карточке предмета (рынок). */
  itemPriceLabel?: string;
  itemPriceAmount?: number;
  /**
   * Где карточка наведённого предмета: left (рынок/добыча) или right (сумка справа внизу).
   * Экипированные слоты занимают оставшуюся сторону.
   */
  itemSide?: "left" | "right";
}

/** Карточки предмета и экипированных слотов для панели сравнения. */
export function buildItemCompareCards(
  item: ItemDef,
  equipment: EquipmentMap,
  options: ItemCompareCardOptions,
): HTMLElement[] {
  const equippedCaption = options.equippedCaption ?? "Экипировано";
  const tipClass = `item-tip ${options.tipClass}`.trim();
  const itemSide = options.itemSide ?? "left";

  const itemCard = el("div", tipClass);
  fillItemTooltip(itemCard, item, {
    showIcon: true,
    caption: options.itemCaption,
    showSellPrice: options.showItemSellPrice ?? false,
    priceLabel: options.itemPriceLabel,
    priceAmount: options.itemPriceAmount,
  });

  const equippedCards: HTMLElement[] = [];
  for (const slot of compareEquipSlotsFor(item)) {
    const card = el("div", tipClass);
    const equipped = equipment[slot] ?? null;
    if (equipped) {
      fillItemTooltip(card, equipped, {
        showIcon: true,
        caption: equippedCaption,
        showSellPrice: options.showEquippedSellPrice ?? false,
        equippedSlot: slot,
      });
    } else {
      fillEmptyItemTooltip(card, slot, equippedCaption);
    }
    equippedCards.push(card);
  }

  return itemSide === "right" ? [...equippedCards, itemCard] : [itemCard, ...equippedCards];
}
