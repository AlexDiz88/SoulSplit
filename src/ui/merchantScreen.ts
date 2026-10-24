import { ASPECT_LABEL } from "../abilities/definitions";
import { resolveMerchantPortraitUrl } from "../art/menuBackground";
import { formatRolledAffix } from "../items/affixCatalog";
import type { EquipmentMap } from "../items/equipment";
import { addItemToInventory } from "../items/inventory";
import { SLOT_LABEL, type EquipSlotId } from "../items/slots";
import { RARITY_LABEL, type ItemDef } from "../items/types";
import type { GameState } from "../meta/gameState";
import {
  ensureMarket,
  MERCHANT_BY_ID,
  MERCHANTS,
  refreshMarketStock,
  type MerchantId,
  type MarketOffer,
} from "../meta/market";
import { goldAmountNode } from "./goldIcon";
import "./merchantScreen.css";

export interface MerchantScreenApi {
  show(state: GameState): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface MerchantScreenHandlers {
  onClose: () => void;
  /** После покупки / реролла ассортимента. */
  onChanged: () => void;
  showToast: (text: string) => void;
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

/** Слоты экипа для сравнения при наведении на товар. */
function compareSlotsFor(item: ItemDef): EquipSlotId[] {
  if (item.slot === "ring1" || item.slot === "ring2") return ["ring1", "ring2"];
  if (item.slot === "mainhand" || item.slot === "offhand") return ["mainhand", "offhand"];
  return [item.slot];
}

function appendItemStats(host: HTMLElement, item: ItemDef, lineClass: string, affixClass: string): void {
  if (item.aspectTag) {
    host.append(el("div", lineClass, `Аспект: ${ASPECT_LABEL[item.aspectTag]}`));
  }
  if (item.weapon) {
    host.append(
      el("div", lineClass, `Урон: ${item.weapon.damageMin}-${item.weapon.damageMax}`),
      el("div", lineClass, `КД атаки: ${item.weapon.baseCd.toFixed(1)} с`),
    );
  }
  const prefixes = item.affixes.filter((a) => a.affixSlot === "prefix");
  const suffixes = item.affixes.filter((a) => a.affixSlot === "suffix");
  for (const a of prefixes) {
    host.append(el("div", `${affixClass} market-affix-prefix`, formatRolledAffix(a)));
  }
  for (const a of suffixes) {
    host.append(el("div", `${affixClass} market-affix-suffix`, formatRolledAffix(a)));
  }
  if (!item.affixes.length && !item.weapon) {
    host.append(el("div", lineClass, "Без аффиксов"));
  }
}

function fillItemCard(card: HTMLElement, item: ItemDef): void {
  card.dataset.rarity = item.rarity;
  card.append(el("div", "market-tip-name", item.name));
  card.append(
    el(
      "div",
      "market-tip-meta",
      `${RARITY_LABEL[item.rarity]} - ${SLOT_LABEL[item.slot]} - ур. ${item.itemLevel}`,
    ),
  );
  appendItemStats(card, item, "market-tip-line", "market-tip-affix");
}

function fillEmptyCard(card: HTMLElement, slot: EquipSlotId): void {
  card.classList.add("empty");
  card.append(el("div", "market-tip-meta", SLOT_LABEL[slot]));
  card.append(el("div", "market-tip-empty", "Не экипировано"));
}

export function mountMerchantScreen(handlers: MerchantScreenHandlers): MerchantScreenApi {
  const root = el("div", "market-overlay");
  root.id = "merchant-screen";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "market-title");

  const stage = el("div", "market-stage");

  const win = el("div", "market-window");

  const head = el("header", "market-head");
  const title = el("h2", "market-title", "Рынок");
  title.id = "market-title";
  const headActions = el("div", "market-head-actions");
  const goldLine = el("div", "market-gold", "Золото: 0");
  const btnRefresh = el("button", "market-btn", "Обновить ассортимент");
  btnRefresh.type = "button";
  const closeBtn = el("button", "market-x");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.innerHTML = '<span aria-hidden="true"></span>';
  headActions.append(goldLine, btnRefresh, closeBtn);
  head.append(title, headActions);

  const tabs = el("div", "market-tabs");
  const tabBtns = new Map<MerchantId, HTMLButtonElement>();
  for (const merchant of MERCHANTS) {
    const btn = el("button", "market-tab", merchant.label) as HTMLButtonElement;
    btn.type = "button";
    btn.dataset.merchant = merchant.id;
    tabs.append(btn);
    tabBtns.set(merchant.id, btn);
  }

  const body = el("div", "market-body");
  const portrait = el("aside", "market-portrait");
  const portraitImg = document.createElement("img");
  portraitImg.className = "market-portrait-img";
  portraitImg.alt = "";
  portraitImg.draggable = false;
  portraitImg.decoding = "async";
  const portraitMeta = el("div", "market-portrait-meta");
  const portraitName = el("h3", "market-portrait-name");
  portraitMeta.append(portraitName);
  portrait.append(portraitImg, portraitMeta);

  const goods = el("div", "market-goods");
  const goodsGrid = el("div", "market-goods-grid");
  goods.append(goodsGrid);

  body.append(portrait, goods);
  win.append(head, tabs, body);

  const compare = el("div", "market-compare");
  compare.hidden = true;
  win.append(compare);

  const main = el("div", "market-main");
  const detail = el("aside", "market-detail");
  detail.hidden = true;
  detail.setAttribute("aria-live", "polite");
  main.append(win, detail);

  const hints = el("div", "market-hints");
  const hint = el("div", "market-hint");
  hint.append(
    el("div", "", "ЛКМ по товару: подробности; повторный клик закрывает. ПКМ по товару: купить."),
    el("div", "", "ПКМ в сумке: продать. ПКМ на экипе: снять. Ctrl+ПКМ на экипе: быстрая продажа."),
    el(
      "div",
      "",
      "Ctrl+ПКМ в сумке: надеть. Кольца: Ctrl+ПКМ - левый слот, Shift+ПКМ - правый слот.",
    ),
  );
  hints.append(hint);

  stage.append(main, hints);
  root.append(stage);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let stateRef: GameState | null = null;
  let activeId: MerchantId = "weaponsmith";
  /** Выбранный товар для панели деталей (id предмета). */
  let selectedItemId: string | null = null;

  function hideCompare(): void {
    compare.hidden = true;
    compare.replaceChildren();
  }

  function clearDetail(): void {
    selectedItemId = null;
    detail.hidden = true;
    detail.replaceChildren();
    root.classList.remove("has-detail");
  }

  function showDetail(offer: MarketOffer): void {
    selectedItemId = offer.item.id;
    const item = offer.item;
    detail.replaceChildren();
    detail.hidden = false;
    root.classList.add("has-detail");
    detail.dataset.rarity = item.rarity;

    const icon = el("div", "market-detail-icon");
    const face = el("div", "market-detail-face");
    if (item.icon) {
      const img = document.createElement("img");
      img.src = item.icon;
      img.alt = "";
      img.draggable = false;
      face.append(img);
    }
    icon.append(face);

    detail.append(icon);
    detail.append(el("h3", "market-detail-name", item.name));
    detail.append(
      el(
        "div",
        "market-detail-meta",
        `${RARITY_LABEL[item.rarity]} - ${SLOT_LABEL[item.slot]} - ур. ${item.itemLevel}`,
      ),
    );
    const stats = el("div", "market-detail-stats");
    appendItemStats(stats, item, "market-detail-line", "market-detail-affix");
    detail.append(stats);
    const detailPrice = el("div", "market-detail-price");
    detailPrice.append(goldAmountNode(offer.price));
    detail.append(detailPrice);
    detail.append(el("p", "market-detail-hint", "ПКМ - купить"));
  }

  function restoreDetailSelection(offers: MarketOffer[]): void {
    if (!selectedItemId) {
      clearDetail();
      return;
    }
    const offer = offers.find((o) => o.item.id === selectedItemId);
    if (!offer) {
      clearDetail();
      return;
    }
    showDetail(offer);
  }

  function positionCompare(anchor: HTMLElement): void {
    const winRect = win.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    compare.hidden = false;
    const tipRect = compare.getBoundingClientRect();

    let left = rect.right - winRect.left + 10;
    if (left + tipRect.width > winRect.width - 8) {
      left = rect.left - winRect.left - tipRect.width - 10;
    }
    left = Math.max(8, Math.min(left, winRect.width - tipRect.width - 8));

    let top = rect.top - winRect.top;
    top = Math.max(8, Math.min(top, winRect.height - tipRect.height - 8));

    compare.style.left = `${left}px`;
    compare.style.top = `${top}px`;
  }

  function showCompare(item: ItemDef, equipment: EquipmentMap, anchor: HTMLElement): void {
    const slots = compareSlotsFor(item);
    compare.replaceChildren();
    for (const slot of slots) {
      const card = el("div", "market-tip");
      const equipped = equipment[slot] ?? null;
      if (equipped) fillItemCard(card, equipped);
      else fillEmptyCard(card, slot);
      compare.append(card);
    }
    positionCompare(anchor);
  }

  function tryBuy(index: number): void {
    if (!stateRef) return;
    const list = stateRef.market.stock[activeId];
    const current = list[index];
    if (!current) {
      handlers.showToast("Товар уже куплен");
      render();
      return;
    }
    if (stateRef.hero.gold < current.price) {
      handlers.showToast("Недостаточно золота");
      return;
    }
    const slot = addItemToInventory(stateRef.hero.inventory, structuredClone(current.item));
    if (slot < 0) {
      handlers.showToast("Сумка полна");
      return;
    }
    const name = current.item.name;
    if (selectedItemId === current.item.id) clearDetail();
    stateRef.hero.gold -= current.price;
    list.splice(index, 1);
    handlers.showToast(`Куплено: ${name}`);
    handlers.onChanged();
    render();
  }

  function close(): void {
    hideCompare();
    clearDetail();
    root.hidden = true;
    stateRef = null;
    handlers.onClose();
  }

  function setActiveTab(id: MerchantId): void {
    if (activeId !== id) clearDetail();
    activeId = id;
    for (const [mid, btn] of tabBtns) {
      btn.classList.toggle("active", mid === id);
    }
  }

  function renderPortrait(): void {
    const merchant = MERCHANT_BY_ID[activeId];
    portrait.style.setProperty("--m-accent", merchant.accent);
    portraitImg.src = resolveMerchantPortraitUrl(merchant.portraitStem);
    portraitImg.alt = merchant.label;
    portraitName.textContent = merchant.label;
  }

  function renderGoods(): void {
    if (!stateRef) return;
    ensureMarket(stateRef);
    const offers = stateRef.market.stock[activeId] ?? [];
    const gold = stateRef.hero.gold;
    goodsGrid.replaceChildren();
    hideCompare();

    if (!offers.length) {
      goodsGrid.append(el("p", "market-empty", "У торговца пусто."));
      clearDetail();
      return;
    }

    offers.forEach((offer, index) => {
      const { item, price } = offer;
      const canAfford = gold >= price;
      const btn = el("button", "market-offer") as HTMLButtonElement;
      btn.type = "button";
      btn.dataset.rarity = item.rarity;
      if (selectedItemId === item.id) btn.classList.add("selected");

      const iconWrap = el("div", "market-offer-icon");
      const face = el("div", "market-offer-face");
      if (item.icon) {
        const img = document.createElement("img");
        img.src = item.icon;
        img.alt = "";
        img.draggable = false;
        face.append(img);
      }
      iconWrap.append(face);

      const info = el("div", "market-offer-info");
      info.append(el("p", "market-offer-name", item.name));
      info.append(
        el(
          "p",
          "market-offer-sub",
          `${RARITY_LABEL[item.rarity]} - ${SLOT_LABEL[item.slot]} - ур. ${item.itemLevel}`,
        ),
      );
      const stats = el("div", "market-offer-stats");
      appendItemStats(stats, item, "market-offer-stat", "market-offer-affix");
      info.append(stats);

      const priceEl = el("div", "market-offer-price");
      priceEl.append(goldAmountNode(price));
      if (!canAfford) priceEl.classList.add("unaffordable");

      btn.append(iconWrap, info, priceEl);

      btn.addEventListener("pointerenter", () => {
        if (!stateRef) return;
        showCompare(item, stateRef.hero.equipment, btn);
      });
      btn.addEventListener("pointermove", () => {
        if (compare.hidden) return;
        positionCompare(btn);
      });
      btn.addEventListener("pointerleave", (ev) => {
        const next = ev.relatedTarget;
        if (next instanceof Node && compare.contains(next)) return;
        hideCompare();
      });

      btn.addEventListener("click", (ev) => {
        if (ev.button !== 0) return;
        for (const child of goodsGrid.querySelectorAll(".market-offer.selected")) {
          child.classList.remove("selected");
        }
        if (selectedItemId === item.id && !detail.hidden) {
          clearDetail();
          return;
        }
        showDetail(offer);
        btn.classList.add("selected");
      });

      btn.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        tryBuy(index);
      });

      goodsGrid.append(btn);
    });

    restoreDetailSelection(offers);
  }

  function render(): void {
    if (!stateRef) return;
    goldLine.textContent = `Золото: ${stateRef.hero.gold}`;
    renderPortrait();
    renderGoods();
  }

  for (const [id, btn] of tabBtns) {
    btn.addEventListener("click", () => {
      setActiveTab(id);
      render();
    });
  }

  btnRefresh.addEventListener("click", () => {
    if (!stateRef) return;
    clearDetail();
    refreshMarketStock(stateRef);
    handlers.showToast("Ассортимент обновлён");
    handlers.onChanged();
    render();
  });

  closeBtn.addEventListener("click", () => close());

  window.addEventListener("keydown", (ev) => {
    if (root.hidden) return;
    if (ev.code !== "Escape" || ev.repeat) return;
    ev.preventDefault();
    close();
  });

  return {
    show(state) {
      const wasOpen = !root.hidden;
      stateRef = state;
      ensureMarket(state);
      if (!wasOpen) {
        clearDetail();
        setActiveTab(activeId);
      } else {
        for (const [mid, btn] of tabBtns) {
          btn.classList.toggle("active", mid === activeId);
        }
      }
      root.hidden = false;
      render();
    },
    hide() {
      hideCompare();
      clearDetail();
      root.hidden = true;
      stateRef = null;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      root.remove();
    },
  };
}
