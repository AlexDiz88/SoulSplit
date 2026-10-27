import { rolledAffixParts } from "../items/affixCatalog";
import { rolledItemBaseParts } from "../items/baseCatalog";
import { gripLabel } from "../items/equipment";
import { itemDisplayName } from "../items/generate";
import { OFFHAND_WEAPON_DAMAGE_MULT } from "../items/grip";
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
 * название → слот (не для оффхенда) → база → [DPS оружия] → аффиксы → уровень.
 * Редкость видна по цвету названия, отдельной строкой не пишем.
 */
export function renderItemTooltip(item: ItemDef, options: ItemTooltipOptions = {}): HTMLElement[] {
  const showSell = options.showSellPrice !== false && options.priceAmount === undefined;
  const showIcon = options.showIcon !== false;
  const nodes: HTMLElement[] = [];
  const offhandWeapon =
    Boolean(item.weapon) && options.equippedSlot === "offhand";
  const damageMult = offhandWeapon ? OFFHAND_WEAPON_DAMAGE_MULT : 1;
  /** Чистый оффхенд (щит/том/сфера…), не dual-wield оружие. */
  const isOffhandItem = Boolean(item.offhand) && !item.weapon;

  if (options.caption) {
    nodes.push(el("div", "item-tip-caption", options.caption));
  }
  if (showIcon) {
    nodes.push(itemIconNode(item));
  }

  // Верхний блок: имя → слот (кроме оффхенда) → база.
  nodes.push(el("div", "item-tip-name", itemDisplayName(item)));
  if (!isOffhandItem) {
    nodes.push(el("div", "item-tip-sub", itemSlotLabel(item)));
  }
  if (item.weapon) {
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
