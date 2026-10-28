import { resolveMerchantPortraitUrl } from "../art/menuBackground";
import { rolledAffixParts } from "../items/affixCatalog";
import { rolledItemBaseParts } from "../items/baseCatalog";
import type { EquipmentMap } from "../items/equipment";
import { itemDisplayName } from "../items/generate";
import { addItemToInventory } from "../items/inventory";
import {
  createPotionItem,
  isPotionItem,
  POTION_HEAL_PCT,
  POTION_LABEL,
} from "../items/potions";
import type { EquipSlotId } from "../items/slots";
import type { ItemDef } from "../items/types";
import type { GameState } from "../meta/gameState";
import {
  ensureMarket,
  herbalistPinnedOffers,
  MERCHANT_BY_ID,
  MERCHANTS,
  refreshMarketStock,
  type MarketTabId,
  type MarketOffer,
} from "../meta/market";
import { goldAmountNode } from "./goldIcon";
import {
  fillEmptyItemTooltip,
  fillItemTooltip,
  formatWeaponDps,
  itemSlotLabel,
} from "./itemTooltip";
import "./itemRarity.css";
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
  if (isPotionItem(item)) return [];
  if (item.slot === "ring1" || item.slot === "ring2") return ["ring1", "ring2"];
  if (item.slot === "mainhand" || item.slot === "offhand") return ["mainhand", "offhand"];
  return [item.slot];
}

/** Бонус + серый `[Tier]` без min-max (карточки рынка). */
function appendTieredStat(host: HTMLElement, className: string, main: string, tierId?: string): void {
  const line = el("div", className, main);
  if (tierId) {
    // nbsp: тир не отрывается на следующую строку один.
    line.append(document.createTextNode("\u00A0"));
    line.append(el("span", "market-tier-meta", `[${tierId}]`));
  }
  host.append(line);
}

function appendItemStats(host: HTMLElement, item: ItemDef, lineClass: string, affixClass: string): void {
  if (isPotionItem(item)) {
    const pct = Math.round(POTION_HEAL_PCT * 100);
    const effect =
      item.potionId === "healing_potion"
        ? `+${pct}% макс. здоровья`
        : `+${pct}% макс. маны`;
    appendTieredStat(host, lineClass, effect);
    return;
  }
  if (item.weapon) {
    appendTieredStat(host, lineClass, `DPS ${formatWeaponDps(item.weapon)}`, item.weapon.tierId);
  } else if (item.base) {
    appendTieredStat(
      host,
      `${affixClass} market-affix-base`,
      rolledItemBaseParts(item.base).main,
      item.base.tierId,
    );
  }
  const prefixes = item.affixes.filter((a) => a.affixSlot === "prefix");
  const suffixes = item.affixes.filter((a) => a.affixSlot === "suffix");
  for (const a of prefixes) {
    appendTieredStat(
      host,
      `${affixClass} market-affix-prefix`,
      rolledAffixParts(a).main,
      a.tierId,
    );
  }
  for (const a of suffixes) {
    appendTieredStat(
      host,
      `${affixClass} market-affix-suffix`,
      rolledAffixParts(a).main,
      a.tierId,
    );
  }
  if (!item.affixes.length && !item.weapon && !item.base) {
    host.append(el("div", lineClass, "Без аффиксов"));
  }
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
  const tabBtns = new Map<MarketTabId, HTMLButtonElement>();
  for (const merchant of MERCHANTS) {
    const btn = el("button", "market-tab", merchant.label) as HTMLButtonElement;
    btn.type = "button";
    btn.dataset.tab = merchant.id;
    tabs.append(btn);
    tabBtns.set(merchant.id, btn);
  }
  const buybackTab = el("button", "market-tab", "Выкуп") as HTMLButtonElement;
  buybackTab.type = "button";
  buybackTab.dataset.tab = "buyback";
  tabs.append(buybackTab);
  tabBtns.set("buyback", buybackTab);

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

  const main = el("div", "market-main");
  const detail = el("aside", "market-detail item-tip");
  detail.hidden = true;
  detail.setAttribute("aria-live", "polite");
  main.append(win, detail);

  const hints = el("div", "market-hints");
  const hint = el("div", "market-hint");
  hint.append(
    el("div", "", "ЛКМ по товару: подробности; повторный клик закрывает. ПКМ по товару: купить."),
    el("div", "", "ПКМ в сумке / перетащить на рынок: продать. ПКМ на экипе: снять. Ctrl+ПКМ на экипе: быстрая продажа."),
    el(
      "div",
      "",
      "Ctrl+ПКМ в сумке: надеть. Кольца: Ctrl+ПКМ - левый слот, Shift+ПКМ - правый слот.",
    ),
  );
  hints.append(hint);

  stage.append(main, hints);
  // Вне .market-window: иначе overflow:hidden режет тултип, и он уезжает влево поверх товаров.
  root.append(stage, compare);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let stateRef: GameState | null = null;
  let activeTab: MarketTabId = "weaponsmith";
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
    detail.hidden = false;
    root.classList.add("has-detail");
    fillItemTooltip(detail, item, {
      showIcon: true,
      showSellPrice: false,
      priceLabel: activeTab === "buyback" ? "Выкуп:" : "Цена:",
      priceAmount: offer.price,
    });
    detail.append(
      el("p", "market-detail-hint", activeTab === "buyback" ? "ПКМ - выкупить" : "ПКМ - купить"),
    );
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

  /** Справа и чуть ниже курсора; влево от курсора не уводим. */
  function positionCompare(clientX: number, clientY: number): void {
    compare.hidden = false;
    const tipRect = compare.getBoundingClientRect();
    const gap = 16;
    const margin = 8;

    let left = clientX + gap;
    let top = clientY + gap;

    const maxLeft = window.innerWidth - tipRect.width - margin;
    const maxTop = window.innerHeight - tipRect.height - margin;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    if (top > maxTop) top = Math.max(margin, maxTop);
    left = Math.max(margin, left);
    top = Math.max(margin, top);

    compare.style.left = `${left}px`;
    compare.style.top = `${top}px`;
  }

  function showCompare(
    item: ItemDef,
    equipment: EquipmentMap,
    clientX: number,
    clientY: number,
  ): void {
    const slots = compareSlotsFor(item);
    compare.replaceChildren();

    const saleCard = el("div", "item-tip market-tip");
    fillItemTooltip(saleCard, item, {
      showIcon: true,
      caption: "В продаже",
      showSellPrice: false,
    });
    compare.append(saleCard);

    for (const slot of slots) {
      const card = el("div", "item-tip market-tip");
      const equipped = equipment[slot] ?? null;
      if (equipped) {
        fillItemTooltip(card, equipped, {
          showIcon: true,
          caption: "Экипировано",
          showSellPrice: false,
          equippedSlot: slot,
        });
      } else {
        fillEmptyItemTooltip(card, slot, "Экипировано");
      }
      compare.append(card);
    }
    positionCompare(clientX, clientY);
  }

  function currentOffers(): MarketOffer[] {
    if (!stateRef) return [];
    if (activeTab === "buyback") return stateRef.market.buyback;
    return stateRef.market.stock[activeTab] ?? [];
  }

  function tryBuy(index: number, pinned = false): void {
    if (!stateRef) return;
    if (pinned && activeTab === "herbalist") {
      const pinnedList = herbalistPinnedOffers();
      const current = pinnedList[index];
      if (!current || !isPotionItem(current.item)) {
        handlers.showToast("Товар недоступен");
        render();
        return;
      }
      if (stateRef.hero.gold < current.price) {
        handlers.showToast("Недостаточно золота");
        return;
      }
      const bought = createPotionItem(current.item.potionId, 1);
      const slot = addItemToInventory(stateRef.hero.inventory, bought);
      if (slot < 0) {
        handlers.showToast("Сумка полна");
        return;
      }
      stateRef.hero.gold -= current.price;
      handlers.showToast(`Куплено: ${POTION_LABEL[current.item.potionId]}`);
      handlers.onChanged();
      render();
      return;
    }

    const list = currentOffers();
    const current = list[index];
    if (!current) {
      handlers.showToast(activeTab === "buyback" ? "Предмет уже выкуплен" : "Товар уже куплен");
      render();
      return;
    }
    if (stateRef.hero.gold < current.price) {
      handlers.showToast("Недостаточно золота");
      return;
    }
    const toAdd = isPotionItem(current.item)
      ? createPotionItem(current.item.potionId, current.item.stackCount ?? 1)
      : structuredClone(current.item);
    const slot = addItemToInventory(stateRef.hero.inventory, toAdd);
    if (slot < 0) {
      handlers.showToast("Сумка полна");
      return;
    }
    const name = isPotionItem(current.item)
      ? POTION_LABEL[current.item.potionId]
      : itemDisplayName(current.item);
    if (selectedItemId === current.item.id) clearDetail();
    stateRef.hero.gold -= current.price;
    list.splice(index, 1);
    handlers.showToast(activeTab === "buyback" ? `Выкуплено: ${name}` : `Куплено: ${name}`);
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

  function setActiveTab(id: MarketTabId): void {
    if (activeTab !== id) clearDetail();
    activeTab = id;
    for (const [mid, btn] of tabBtns) {
      btn.classList.toggle("active", mid === id);
    }
    btnRefresh.hidden = id === "buyback";
    portrait.classList.toggle("market-portrait-buyback", id === "buyback");
  }

  function renderPortrait(): void {
    if (activeTab === "buyback") {
      portrait.style.setProperty("--m-accent", "#c4a35a");
      portraitImg.removeAttribute("src");
      portraitImg.alt = "";
      portraitImg.hidden = true;
      portraitName.textContent = "Выкуп";
      return;
    }
    const merchant = MERCHANT_BY_ID[activeTab];
    portraitImg.hidden = false;
    portrait.style.setProperty("--m-accent", merchant.accent);
    portraitImg.src = resolveMerchantPortraitUrl(merchant.portraitStem);
    portraitImg.alt = merchant.label;
    portraitName.textContent = merchant.label;
  }

  function renderGoods(): void {
    if (!stateRef) return;
    ensureMarket(stateRef);
    const stockOffers = currentOffers();
    const pinned =
      activeTab === "herbalist" ? herbalistPinnedOffers().map((offer) => ({ offer, pinned: true as const })) : [];
    const rows = [
      ...pinned,
      ...stockOffers.map((offer) => ({ offer, pinned: false as const })),
    ];
    const gold = stateRef.hero.gold;
    goodsGrid.replaceChildren();
    hideCompare();

    if (!rows.length) {
      goodsGrid.append(
        el(
          "p",
          "market-empty",
          activeTab === "buyback" ? "Пока нечего выкупать." : "У торговца пусто.",
        ),
      );
      clearDetail();
      return;
    }

    rows.forEach((row, visualIndex) => {
      const { offer, pinned: isPinned } = row;
      const stockIndex = isPinned ? visualIndex : visualIndex - pinned.length;
      const { item, price } = offer;
      const canAfford = gold >= price;
      const btn = el("button", "market-offer") as HTMLButtonElement;
      btn.type = "button";
      btn.dataset.rarity = item.rarity;
      if (isPinned) btn.classList.add("market-offer-pinned");
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
      const head = el("div", "market-offer-head");
      const name = isPotionItem(item) ? POTION_LABEL[item.potionId] : itemDisplayName(item);
      head.append(el("p", "market-offer-name", name));
      const priceEl = el("div", "market-offer-price");
      priceEl.append(goldAmountNode(price));
      if (!canAfford) priceEl.classList.add("unaffordable");
      head.append(priceEl);
      info.append(head);
      info.append(
        el(
          "p",
          "market-offer-sub",
          isPinned
            ? `${itemSlotLabel(item)} - всегда в продаже`
            : `${itemSlotLabel(item)} - ур. ${item.itemLevel}`,
        ),
      );
      const stats = el("div", "market-offer-stats");
      appendItemStats(stats, item, "market-offer-stat", "market-offer-affix");
      info.append(stats);

      btn.append(iconWrap, info);

      btn.addEventListener("pointerenter", (ev) => {
        if (!stateRef) return;
        showCompare(item, stateRef.hero.equipment, ev.clientX, ev.clientY);
      });
      btn.addEventListener("pointermove", (ev) => {
        if (compare.hidden) return;
        positionCompare(ev.clientX, ev.clientY);
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
        tryBuy(isPinned ? visualIndex : stockIndex, isPinned);
      });

      goodsGrid.append(btn);
    });

    restoreDetailSelection(rows.map((r) => r.offer));
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
    if (!stateRef || activeTab === "buyback") return;
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
        setActiveTab(activeTab);
      } else {
        for (const [mid, btn] of tabBtns) {
          btn.classList.toggle("active", mid === activeTab);
        }
        btnRefresh.hidden = activeTab === "buyback";
        portrait.classList.toggle("market-portrait-buyback", activeTab === "buyback");
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
