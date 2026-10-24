import { createTownBackgroundImg } from "../art/menuBackground";
import { MAX_HERO_LEVEL, xpToNextLevel } from "../meta/progression";
import type { GameState } from "../meta/gameState";
import "./hubScreen.css";

export interface HubScreenApi {
  show(state: GameState): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface HubScreenHandlers {
  onBestiary: () => void;
  onGrimoire: () => void;
  onItemGenerator: () => void;
  onSave: () => void;
  onSettings: () => void;
  onCharacterSelect: () => void;
  onExitToMenu: () => void;
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
  const root = el("div", "meta-screen hub-screen");
  root.id = "hub-screen";
  root.hidden = true;
  root.append(createTownBackgroundImg());

  const topbar = el("header", "hub-topbar");

  const left = el("div", "hub-topbar-left");
  const heroRow = el("div", "hub-hero-row");
  const levelBadge = el("div", "hub-level");
  levelBadge.title = "Уровень";
  const levelNum = el("span", "hub-level-num", "1");
  levelBadge.append(levelNum);
  const nameEl = el("div", "hub-name");
  heroRow.append(levelBadge, nameEl);

  const xp = el("div", "hub-xp");
  const xpTrack = el("div", "hub-xp-track");
  const xpFill = el("div", "hub-xp-fill");
  const xpLabel = el("span", "hub-xp-label");
  xpTrack.append(xpFill, xpLabel);
  xp.append(xpTrack);
  left.append(heroRow, xp);

  const right = el("div", "hub-topbar-right");
  const currencies = el("div", "hub-currencies");
  const goldEl = el("div", "hub-currency hub-currency-gold");
  goldEl.title = "Золото";
  const goldValue = el("span", "hub-currency-value", "0");
  goldEl.append(el("span", "hub-currency-label", "Золото"), goldValue);
  currencies.append(goldEl);

  const menuWrap = el("div", "hub-menu-wrap");
  const menuBtn = el("button", "hub-menu-btn");
  menuBtn.type = "button";
  menuBtn.title = "Меню";
  menuBtn.setAttribute("aria-label", "Меню");
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.setAttribute("aria-controls", "hub-game-menu");
  menuBtn.append(el("span"), el("span"), el("span"));

  const menu = el("nav", "hub-game-menu");
  menu.id = "hub-game-menu";
  menu.hidden = true;
  menu.setAttribute("aria-label", "Игровое меню");

  const btnBestiary = el("button", "hub-menu-item", "Бестиарий");
  btnBestiary.type = "button";
  btnBestiary.title = "H";
  const btnGrimoire = el("button", "hub-menu-item", "Гримуар");
  btnGrimoire.type = "button";
  btnGrimoire.title = "V";
  const btnItemGen = el("button", "hub-menu-item", "Генератор предметов");
  btnItemGen.type = "button";
  btnItemGen.title = "G";
  const menuSep = el("div", "hub-menu-sep");
  menuSep.setAttribute("role", "separator");
  const btnSave = el("button", "hub-menu-item", "Сохранить");
  btnSave.type = "button";
  const btnSettings = el("button", "hub-menu-item", "Настройки");
  btnSettings.type = "button";
  const btnSlots = el("button", "hub-menu-item", "Выбор персонажа");
  btnSlots.type = "button";
  const btnExit = el("button", "hub-menu-item hub-menu-item-danger", "Главное меню");
  btnExit.type = "button";
  menu.append(
    btnBestiary,
    btnGrimoire,
    btnItemGen,
    menuSep,
    btnSave,
    btnSettings,
    btnSlots,
    btnExit,
  );
  menuWrap.append(menuBtn, menu);
  right.append(currencies, menuWrap);

  topbar.append(left, right);
  root.append(topbar);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  const closeMenu = (): void => {
    menu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  };

  const openMenu = (): void => {
    menu.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
  };

  menuBtn.addEventListener("click", () => {
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  btnBestiary.addEventListener("click", () => {
    closeMenu();
    handlers.onBestiary();
  });
  btnGrimoire.addEventListener("click", () => {
    closeMenu();
    handlers.onGrimoire();
  });
  btnItemGen.addEventListener("click", () => {
    closeMenu();
    handlers.onItemGenerator();
  });
  btnSave.addEventListener("click", () => {
    closeMenu();
    handlers.onSave();
  });
  btnSettings.addEventListener("click", () => {
    closeMenu();
    handlers.onSettings();
  });
  btnSlots.addEventListener("click", () => {
    closeMenu();
    handlers.onCharacterSelect();
  });
  btnExit.addEventListener("click", () => {
    closeMenu();
    handlers.onExitToMenu();
  });

  const onPointerDown = (ev: PointerEvent): void => {
    if (menu.hidden) return;
    const target = ev.target;
    if (!(target instanceof Node)) return;
    if (menuWrap.contains(target)) return;
    closeMenu();
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.code !== "Escape" || menu.hidden) return;
    closeMenu();
  };

  document.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("keydown", onKeyDown);

  return {
    show(state) {
      const h = state.hero;
      levelNum.textContent = String(h.level);
      nameEl.textContent = h.name;
      goldValue.textContent = String(h.gold);

      if (h.level >= MAX_HERO_LEVEL) {
        xpLabel.textContent = "Макс. уровень";
        xpFill.style.width = "100%";
        xpTrack.title = "Максимальный уровень";
      } else {
        const need = xpToNextLevel(h.level);
        const pct = Math.min(100, (h.xp / need) * 100);
        xpLabel.textContent = `${h.xp} / ${need}`;
        xpFill.style.width = `${pct}%`;
        xpTrack.title = `Опыт ${h.xp} / ${need}`;
      }

      closeMenu();
      root.hidden = false;
    },
    hide() {
      closeMenu();
      root.hidden = true;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      root.remove();
    },
  };
}
