import { ASPECT_LABEL } from "../abilities/definitions";
import { addItemToInventory } from "../items/inventory";
import { RARITY_LABEL, type ItemDef } from "../items/types";
import { SLOT_LABEL } from "../items/slots";
import type { HeroProfile } from "../meta/heroProfile";
import "./hubScreen.css";

export interface RewardScreenPayload {
  items: ItemDef[];
  xpGained: number;
  levelsGained: number;
  newLevel: number;
  kills: number;
  zoneName: string;
}

export interface RewardScreenApi {
  show(profile: HeroProfile, payload: RewardScreenPayload): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface RewardScreenHandlers {
  onTaken: () => void;
  onDone: () => void;
  onOpenInventory: () => void;
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

export function mountRewardScreen(handlers: RewardScreenHandlers): RewardScreenApi {
  const root = el("div", "meta-screen");
  root.id = "reward-screen";
  root.hidden = true;
  const panel = el("div", "meta-panel");
  const title = el("h1", "meta-brand", "Награда");
  const summary = el("p", "meta-summary");
  const levelup = el("p", "meta-levelup");
  levelup.hidden = true;
  const list = el("div", "meta-reward-list");
  const actions = el("div", "meta-actions");
  const btnInv = el("button", "meta-btn", "Инвентарь");
  btnInv.type = "button";
  const btnHub = el("button", "meta-btn meta-btn-primary", "В хаб");
  btnHub.type = "button";
  actions.append(btnInv, btnHub);
  panel.append(title, summary, levelup, list, actions);
  root.append(panel);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let heroRef: HeroProfile | null = null;
  const taken = new Set<string>();

  btnInv.addEventListener("click", () => handlers.onOpenInventory());
  btnHub.addEventListener("click", () => handlers.onDone());

  function renderRow(profile: HeroProfile, item: ItemDef): HTMLElement {
    const row = el("div", "meta-reward-row");
    const img = document.createElement("img");
    img.src = item.icon ?? "";
    img.alt = item.name;
    const info = el("div");
    const aspect = item.aspectTag ? ` - ${ASPECT_LABEL[item.aspectTag]}` : "";
    info.append(el("div", "meta-reward-name", item.name));
    info.append(
      el(
        "div",
        "meta-reward-sub",
        `${RARITY_LABEL[item.rarity]} - ${SLOT_LABEL[item.slot]} - ур. ${item.itemLevel}${aspect}`,
      ),
    );
    const btns = el("div", "meta-reward-actions");
    const take = el("button", undefined, taken.has(item.id) ? "Взято" : "Взять");
    take.type = "button";
    take.disabled = taken.has(item.id);
    take.addEventListener("click", () => {
      if (taken.has(item.id) || !heroRef) return;
      const slot = addItemToInventory(profile.inventory, item);
      if (slot < 0) {
        handlers.showToast("Инвентарь полон");
        return;
      }
      taken.add(item.id);
      take.textContent = "Взято";
      take.disabled = true;
      handlers.onTaken();
    });
    const skip = el("button", undefined, "Оставить");
    skip.type = "button";
    skip.disabled = taken.has(item.id);
    skip.addEventListener("click", () => {
      taken.add(item.id);
      take.disabled = true;
      skip.disabled = true;
      take.textContent = "Пропущено";
    });
    btns.append(take, skip);
    row.append(img, info, btns);
    return row;
  }

  return {
    show(profile, payload) {
      heroRef = profile;
      taken.clear();
      summary.textContent = `${payload.zoneName}: +${payload.xpGained} опыта, убито ${payload.kills}`;
      if (payload.levelsGained > 0) {
        levelup.hidden = false;
        levelup.textContent = `Новый уровень: ${payload.newLevel}`;
      } else {
        levelup.hidden = true;
      }
      list.replaceChildren(...payload.items.map((item) => renderRow(profile, item)));
      if (!payload.items.length) {
        list.append(el("p", "meta-summary", "Предметов нет."));
      }
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
