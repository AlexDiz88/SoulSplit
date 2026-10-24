import { MAX_HERO_LEVEL, xpToNextLevel } from "../meta/progression";
import type { GameState } from "../meta/gameState";
import { getZone, isZoneUnlocked } from "../meta/zones";
import "./hubScreen.css";

export interface HubScreenApi {
  show(state: GameState): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface HubScreenHandlers {
  onEmbark: () => void;
  onSelectZone: () => void;
  onMerchant: () => void;
  onCharacter: () => void;
  onInventory: () => void;
  onNewGame: () => void;
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

export function mountHubScreen(handlers: HubScreenHandlers): HubScreenApi {
  const root = el("div", "meta-screen");
  root.id = "hub-screen";
  root.hidden = true;
  const panel = el("div", "meta-panel");
  const brand = el("h1", "meta-brand", "Soul Split");
  const heroLine = el("p", "meta-hero-line");
  const goldLine = el("p", "meta-gold-line");
  const xpBlock = el("div", "meta-xp");
  const xpLabel = el("div", "meta-xp-label");
  const xpText = el("span");
  const xpNeed = el("span");
  xpLabel.append(xpText, xpNeed);
  const track = el("div", "meta-xp-track");
  const fill = el("div", "meta-xp-fill");
  track.append(fill);
  xpBlock.append(xpLabel, track);

  const actions = el("div", "meta-actions");
  const btnEmbark = el("button", "meta-btn meta-btn-primary", "В поход");
  btnEmbark.type = "button";
  const btnZones = el("button", "meta-btn", "Выбор зоны");
  btnZones.type = "button";
  const btnMerchant = el("button", "meta-btn", "Скупщик");
  btnMerchant.type = "button";
  const btnChar = el("button", "meta-btn", "Персонаж");
  btnChar.type = "button";
  const btnInv = el("button", "meta-btn", "Инвентарь");
  btnInv.type = "button";
  const btnNew = el("button", "meta-btn meta-btn-danger", "Новая игра");
  btnNew.type = "button";
  actions.append(btnEmbark, btnZones, btnMerchant, btnChar, btnInv, btnNew);
  panel.append(brand, heroLine, goldLine, xpBlock, actions);
  root.append(panel);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  btnEmbark.addEventListener("click", () => handlers.onEmbark());
  btnZones.addEventListener("click", () => handlers.onSelectZone());
  btnMerchant.addEventListener("click", () => handlers.onMerchant());
  btnChar.addEventListener("click", () => handlers.onCharacter());
  btnInv.addEventListener("click", () => handlers.onInventory());
  btnNew.addEventListener("click", () => {
    if (window.confirm("Начать новую игру? Текущий прогресс будет стёрт.")) {
      handlers.onNewGame();
    }
  });

  return {
    show(state) {
      const h = state.hero;
      heroLine.textContent = `${h.name} - уровень ${h.level}`;
      goldLine.textContent = `Золото: ${h.gold}`;
      if (h.level >= MAX_HERO_LEVEL) {
        xpText.textContent = "Максимальный уровень";
        xpNeed.textContent = "";
        fill.style.width = "100%";
      } else {
        const need = xpToNextLevel(h.level);
        xpText.textContent = `Опыт ${h.xp} / ${need}`;
        xpNeed.textContent = `до ${h.level + 1}`;
        fill.style.width = `${Math.min(100, (h.xp / need) * 100)}%`;
      }
      const last = state.lastZoneId;
      if (last && isZoneUnlocked(last, h.level, state.unlockedZones)) {
        btnEmbark.textContent = `В поход - ${getZone(last).name}`;
      } else {
        btnEmbark.textContent = "В поход";
      }
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      root.remove();
    },
  };
}
