import {
  createTownBackgroundImg,
  pickRandomTownBackgroundUrl,
} from "../art/menuBackground";
import { MAX_HERO_LEVEL, xpToNextLevel } from "../meta/progression";
import type { GameState } from "../meta/gameState";
import {
  HUB_LOCATIONS,
  coverLayout,
  projectLocation,
  type HubLocationId,
} from "./hubLocations";
import "./hubScreen.css";

export interface HubScreenApi {
  show(state: GameState): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface HubScreenHandlers {
  onCharacter: () => void;
  onItemGenerator: () => void;
  onSave: () => void;
  onSettings: () => void;
  onCharacterSelect: () => void;
  onExitToMenu: () => void;
  onLocation: (id: HubLocationId) => void;
  /** Горячая клавиша S - тайник (только пока открыт город). */
  onStash: () => void;
  /** Тест: +1000 золота. */
  onAddTestGold: () => void;
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
  const bgImg = createTownBackgroundImg();
  let currentTownBgUrl = bgImg.getAttribute("src") ?? "";
  root.append(bgImg);

  const map = el("div", "hub-map");
  map.setAttribute("aria-label", "Локации города");
  const locationAnchors = new Map<HubLocationId, HTMLElement>();
  for (const loc of HUB_LOCATIONS) {
    const anchor = el("div", "hub-loc");
    anchor.dataset.loc = loc.id;
    const btn = el("button", "title-btn hub-loc-btn", loc.label);
    btn.type = "button";
    btn.setAttribute("aria-label", loc.label);
    btn.addEventListener("click", () => handlers.onLocation(loc.id));
    anchor.append(btn);
    locationAnchors.set(loc.id, anchor);
    map.append(anchor);
  }
  root.append(map);

  const topbar = el("header", "hub-topbar");

  const left = el("button", "hub-topbar-left");
  left.type = "button";
  left.setAttribute("aria-label", "Персонаж");
  const portraitWrap = el("div", "hub-portrait");
  const portraitImg = el("img", "hub-portrait-img");
  portraitImg.alt = "";
  portraitImg.draggable = false;
  portraitWrap.append(portraitImg);

  const meta = el("div", "hub-topbar-meta");
  const heroRow = el("div", "hub-hero-row");
  const levelBadge = el("div", "hub-level");
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
  meta.append(heroRow, xp);
  left.append(portraitWrap, meta);
  left.addEventListener("click", () => handlers.onCharacter());

  const right = el("div", "hub-topbar-right");
  const currencies = el("div", "hub-currencies");
  const addGoldBtn = el("button", "hub-add-gold-btn", "+1000");
  addGoldBtn.type = "button";
  addGoldBtn.setAttribute("aria-label", "Добавить 1000 золота");
  addGoldBtn.addEventListener("click", () => handlers.onAddTestGold());
  const goldEl = el("div", "hub-currency hub-currency-gold");
  const goldValue = el("span", "hub-currency-value", "0");
  goldEl.append(el("span", "hub-currency-label", "Золото"), goldValue);
  currencies.append(addGoldBtn, goldEl);

  const fsBtn = el("button", "hub-fs-btn");
  fsBtn.type = "button";
  fsBtn.setAttribute("aria-label", "Полный экран");
  fsBtn.setAttribute("aria-pressed", "false");
  fsBtn.append(el("span", "hub-fs-icon"));

  const menuWrap = el("div", "hub-menu-wrap");
  const menuBtn = el("button", "hub-menu-btn");
  menuBtn.type = "button";
  menuBtn.setAttribute("aria-label", "Меню");
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.setAttribute("aria-controls", "hub-game-menu");
  menuBtn.append(el("span"), el("span"), el("span"));

  const menu = el("nav", "hub-game-menu");
  menu.id = "hub-game-menu";
  menu.hidden = true;
  menu.setAttribute("aria-label", "Игровое меню");

  const btnItemGen = el("button", "hub-menu-item", "Панель разработчика");
  btnItemGen.type = "button";
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
    btnItemGen,
    menuSep,
    btnSave,
    btnSettings,
    btnSlots,
    btnExit,
  );
  menuWrap.append(menuBtn, menu);
  right.append(currencies, fsBtn, menuWrap);

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

  const isFullscreen = (): boolean => document.fullscreenElement != null;

  const syncFullscreenBtn = (): void => {
    const on = isFullscreen();
    fsBtn.classList.toggle("is-fullscreen", on);
    fsBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) {
      fsBtn.setAttribute("aria-label", "Оконный режим");
    } else {
      fsBtn.setAttribute("aria-label", "Полный экран");
    }
  };

  const toggleFullscreen = (): void => {
    const req = isFullscreen()
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    void req.catch(() => {
      /* браузер мог отклонить запрос */
    });
  };

  fsBtn.addEventListener("click", () => {
    toggleFullscreen();
  });

  menuBtn.addEventListener("click", () => {
    if (menu.hidden) openMenu();
    else closeMenu();
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
    const target = ev.target;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;

    if (!typing && !ev.repeat && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (ev.code === "KeyX") {
        ev.preventDefault();
        toggleFullscreen();
        return;
      }
      if (ev.code === "KeyS" && !root.hidden) {
        ev.preventDefault();
        handlers.onStash();
        return;
      }
    }

    if (ev.code !== "Escape" || menu.hidden) return;
    closeMenu();
  };

  const onFullscreenChange = (): void => {
    syncFullscreenBtn();
  };

  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  window.addEventListener("keydown", onKeyDown);
  syncFullscreenBtn();

  let imageW = 0;
  let imageH = 0;
  let layoutRaf = 0;

  const layoutLocations = (): void => {
    layoutRaf = 0;
    if (root.hidden) return;
    const cw = root.clientWidth;
    const ch = root.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    const iw = imageW || bgImg.naturalWidth;
    const ih = imageH || bgImg.naturalHeight;
    if (iw <= 0 || ih <= 0) return;
    imageW = iw;
    imageH = ih;

    const layout = coverLayout(cw, ch, iw, ih);
    for (const loc of HUB_LOCATIONS) {
      const anchor = locationAnchors.get(loc.id);
      if (!anchor) continue;
      const { left, top } = projectLocation(loc, layout);
      anchor.style.left = `${left}px`;
      anchor.style.top = `${top}px`;
    }
  };

  const scheduleLayout = (): void => {
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(layoutLocations);
  };

  const onBgLoad = (): void => scheduleLayout();
  bgImg.addEventListener("load", onBgLoad);
  if (bgImg.complete && bgImg.naturalWidth > 0) scheduleLayout();

  const resizeObs = new ResizeObserver(() => scheduleLayout());
  resizeObs.observe(root);

  return {
    show(state) {
      const h = state.hero;
      portraitImg.src = h.portraitUrl;
      portraitImg.alt = h.name;
      levelNum.textContent = String(h.level);
      nameEl.textContent = h.name;
      goldValue.textContent = String(h.gold);

      if (h.level >= MAX_HERO_LEVEL) {
        xpLabel.textContent = "Макс. уровень";
        xpFill.style.width = "100%";
      } else {
        const need = xpToNextLevel(h.level);
        const pct = Math.min(100, (h.xp / need) * 100);
        xpLabel.textContent = `${h.xp} / ${need}`;
        xpFill.style.width = `${pct}%`;
      }

      // Новый фон только при входе в город, не при обновлении UI (рынок, золото, экип).
      if (root.hidden) {
        const nextBg = pickRandomTownBackgroundUrl();
        if (currentTownBgUrl !== nextBg) {
          currentTownBgUrl = nextBg;
          imageW = 0;
          imageH = 0;
          bgImg.src = nextBg;
        }
      }

      closeMenu();
      root.hidden = false;
      scheduleLayout();
    },
    hide() {
      closeMenu();
      root.hidden = true;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      if (layoutRaf) cancelAnimationFrame(layoutRaf);
      resizeObs.disconnect();
      bgImg.removeEventListener("load", onBgLoad);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
      root.remove();
    },
  };
}
