import { ASPECT_LABEL } from "../abilities/definitions";
import { resolveMerchantPortraitUrl } from "../art/menuBackground";
import { addItemToInventory } from "../items/inventory";
import { SLOT_LABEL } from "../items/slots";
import { RARITY_LABEL } from "../items/types";
import type { GameState } from "../meta/gameState";
import {
  ensureMarket,
  MERCHANT_BY_ID,
  MERCHANTS,
  refreshMarketStock,
  type MerchantId,
} from "../meta/market";
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

export function mountMerchantScreen(handlers: MerchantScreenHandlers): MerchantScreenApi {
  const root = el("div", "market-overlay");
  root.id = "merchant-screen";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "market-title");

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
  root.append(win);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let stateRef: GameState | null = null;
  let activeId: MerchantId = "weaponsmith";

  function close(): void {
    root.hidden = true;
    stateRef = null;
    handlers.onClose();
  }

  function setActiveTab(id: MerchantId): void {
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

    if (!offers.length) {
      goodsGrid.append(el("p", "market-empty", "У торговца пусто."));
      return;
    }

    offers.forEach((offer, index) => {
      const { item, price } = offer;
      const btn = el("button", "market-offer") as HTMLButtonElement;
      btn.type = "button";
      btn.dataset.rarity = item.rarity;
      btn.disabled = gold < price;

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
      const aspect = item.aspectTag ? ` - ${ASPECT_LABEL[item.aspectTag]}` : "";
      info.append(el("p", "market-offer-name", item.name));
      info.append(
        el(
          "p",
          "market-offer-sub",
          `${RARITY_LABEL[item.rarity]} - ${SLOT_LABEL[item.slot]} - ур. ${item.itemLevel}${aspect}`,
        ),
      );

      const priceEl = el("div", "market-offer-price", `${price} з`);
      btn.append(iconWrap, info, priceEl);

      btn.addEventListener("click", () => {
        if (!stateRef) return;
        const list = stateRef.market.stock[activeId];
        const current = list[index];
        if (!current || current.item.id !== item.id) {
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
        stateRef.hero.gold -= current.price;
        list.splice(index, 1);
        handlers.showToast(`Куплено: ${current.item.name}`);
        handlers.onChanged();
        render();
      });

      goodsGrid.append(btn);
    });
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
    refreshMarketStock(stateRef);
    handlers.showToast("Ассортимент обновлён");
    handlers.onChanged();
    render();
  });

  closeBtn.addEventListener("click", () => close());
  root.addEventListener("click", (ev) => {
    if (ev.target === root) close();
  });

  window.addEventListener("keydown", (ev) => {
    if (root.hidden) return;
    if (ev.code !== "Escape" || ev.repeat) return;
    ev.preventDefault();
    close();
  });

  return {
    show(state) {
      stateRef = state;
      ensureMarket(state);
      setActiveTab(activeId);
      root.hidden = false;
      render();
    },
    hide() {
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
