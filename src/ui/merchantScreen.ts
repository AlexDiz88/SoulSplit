import { ASPECT_LABEL } from "../abilities/definitions";
import { sellPrice } from "../meta/economy";
import type { HeroProfile } from "../meta/heroProfile";
import { RARITY_LABEL, type ItemDef } from "../items/types";
import { SLOT_LABEL } from "../items/slots";
import "./hubScreen.css";

export interface MerchantScreenApi {
  show(profile: HeroProfile): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface MerchantScreenHandlers {
  onBack: () => void;
  onSold: () => void;
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
  const root = el("div", "meta-screen");
  root.id = "merchant-screen";
  root.hidden = true;
  const panel = el("div", "meta-panel");
  panel.append(el("h1", "meta-brand", "Скупщик"));
  const goldLine = el("p", "meta-hero-line");
  const summary = el("p", "meta-summary", "Продай лишний экип из сумки. Цена = ilvl × редкость.");
  const list = el("div", "meta-reward-list");
  const btnBack = el("button", "meta-btn", "Назад в хаб");
  btnBack.type = "button";
  panel.append(goldLine, summary, list, btnBack);
  root.append(panel);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let heroRef: HeroProfile | null = null;

  btnBack.addEventListener("click", () => handlers.onBack());

  function renderRow(profile: HeroProfile, item: ItemDef, invIndex: number): HTMLElement {
    const row = el("div", "meta-reward-row");
    const img = document.createElement("img");
    img.src = item.icon ?? "";
    img.alt = item.name;
    const info = el("div");
    const aspect = item.aspectTag ? ` - ${ASPECT_LABEL[item.aspectTag]}` : "";
    const price = sellPrice(item);
    info.append(el("div", "meta-reward-name", item.name));
    info.append(
      el(
        "div",
        "meta-reward-sub",
        `${RARITY_LABEL[item.rarity]} - ${SLOT_LABEL[item.slot]} - ур. ${item.itemLevel}${aspect}`,
      ),
    );
    const btns = el("div", "meta-reward-actions");
    const sell = el("button", undefined, `Продать (${price} з)`);
    sell.type = "button";
    sell.addEventListener("click", () => {
      if (!heroRef) return;
      const cell = profile.inventory[invIndex];
      if (!cell || cell.id !== item.id) {
        handlers.showToast("Предмет уже продан");
        return;
      }
      profile.inventory[invIndex] = null;
      profile.gold += price;
      handlers.showToast(`+${price} золота`);
      handlers.onSold();
    });
    btns.append(sell);
    row.append(img, info, btns);
    return row;
  }

  return {
    show(profile) {
      heroRef = profile;
      goldLine.textContent = `Золото: ${profile.gold}`;
      list.replaceChildren();
      let any = false;
      profile.inventory.forEach((item, index) => {
        if (!item) return;
        any = true;
        list.append(renderRow(profile, item, index));
      });
      if (!any) list.append(el("p", "meta-summary", "Сумка пуста."));
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      heroRef = null;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      root.remove();
    },
  };
}
