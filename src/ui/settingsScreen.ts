import { createMenuBackgroundImg } from "../art/menuBackground";
import "./hubScreen.css";
import "./startMenu.css";

export interface SettingsScreenApi {
  show(): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface SettingsScreenHandlers {
  onBack: () => void;
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

export function mountSettingsScreen(handlers: SettingsScreenHandlers): SettingsScreenApi {
  const root = el("div", "meta-screen title-screen");
  root.id = "settings-screen";
  root.hidden = true;
  root.append(createMenuBackgroundImg());

  const stage = el("div", "title-stage title-stage-settings");

  const brand = el("h1", "title-brand title-brand-sm");
  brand.setAttribute("aria-label", "Настройки");
  const glow = el("span", "title-brand-glow", "Настройки");
  glow.setAttribute("aria-hidden", "true");
  const face = el("span", "title-brand-face", "Настройки");
  brand.append(glow, face);

  const stub = el(
    "p",
    "settings-stub",
    "Пока доступно только локальное сохранение. Звук, графика и аккаунт появятся позже.",
  );

  const actions = el("div", "title-actions");
  const btnBack = el("button", "title-btn", "Назад");
  btnBack.type = "button";
  actions.append(btnBack);

  stage.append(brand, stub, actions);
  root.append(stage);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  btnBack.addEventListener("click", () => handlers.onBack());

  return {
    show() {
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
