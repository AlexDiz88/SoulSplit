import { createMenuBackgroundImg } from "../art/menuBackground";
import "./hubScreen.css";
import "./startMenu.css";

export interface StartMenuApi {
  show(): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface StartMenuHandlers {
  onPlay: () => void;
  onSettings: () => void;
  onDevPanel: () => void;
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

export function mountStartMenu(handlers: StartMenuHandlers): StartMenuApi {
  const root = el("div", "meta-screen title-screen");
  root.id = "start-menu";
  root.hidden = true;
  const menuBg = createMenuBackgroundImg();
  if (menuBg) root.append(menuBg);
  else root.classList.add("title-screen-phone");

  const stage = el("div", "title-stage");

  const brand = el("h1", "title-brand");
  brand.setAttribute("aria-label", "Soul Split");
  const glow = el("span", "title-brand-glow", "Soul Split");
  glow.setAttribute("aria-hidden", "true");
  const face = el("span", "title-brand-face");
  const soul = el("span", "title-word title-word-soul", "Soul");
  const split = el("span", "title-word title-word-split", "Split");
  face.append(soul, document.createTextNode(" "), split);
  brand.append(glow, face);

  const actions = el("div", "title-actions");
  const btnPlay = el("button", "title-btn title-btn-primary", "Играть");
  btnPlay.type = "button";
  const btnSettings = el("button", "title-btn", "Настройки");
  btnSettings.type = "button";
  const btnDevPanel = el("button", "title-btn title-btn-dev", "Кодекс");
  btnDevPanel.type = "button";
  actions.append(btnPlay, btnSettings, btnDevPanel);

  stage.append(brand, actions);
  root.append(stage);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  btnPlay.addEventListener("click", () => handlers.onPlay());
  btnSettings.addEventListener("click", () => handlers.onSettings());
  btnDevPanel.addEventListener("click", () => handlers.onDevPanel());

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
