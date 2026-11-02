import {
  createTownBackgroundImg,
  getTownBackgroundUrl,
  type TownTimeOfDay,
} from "../art/menuBackground";
import { computeHeroSheet } from "../items/equipment";
import { sheetBaseFromProfile } from "../meta/heroProfile";
import { MAX_HERO_LEVEL, xpToNextLevel } from "../meta/progression";
import type { GameState } from "../meta/gameState";
import { getStat } from "../stats/sheet";
import { goldAmountNode } from "./goldIcon";
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
  /** Портрет + HP/мана поверх карты (не зависит от экрана города). */
  showHeroDock(state: GameState): void;
  hideHeroDock(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface HubScreenHandlers {
  onCharacter: () => void;
  onInventory: () => void;
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

function makeRoundBtn(className: string, label: string): HTMLButtonElement {
  const btn = el("button", className);
  btn.type = "button";
  btn.setAttribute("aria-label", label);
  return btn;
}

function bagIcon(): HTMLElement {
  const span = el("span", "hub-bag-icon");
  span.setAttribute("aria-hidden", "true");
  span.innerHTML =
    '<svg viewBox="0 0 24 24" focusable="false">' +
    '<path fill="currentColor" d="M7 8V6.8C7 4.15 9.02 2 12 2s5 2.15 5 4.8V8h2.2c.99 0 1.8.81 1.8 1.8v10.4c0 .99-.81 1.8-1.8 1.8H4.8c-.99 0-1.8-.81-1.8-1.8V9.8C3 8.81 3.81 8 4.8 8H7zm2 0h6V6.8c0-1.55-1.12-2.8-3-2.8s-3 1.25-3 2.8V8z"/>' +
    "</svg>";
  return span;
}

export function mountHubScreen(handlers: HubScreenHandlers): HubScreenApi {
  const root = el("div", "meta-screen hub-screen");
  root.id = "hub-screen";
  root.hidden = true;
  const bgImg = createTownBackgroundImg();
  let townTime: TownTimeOfDay = "evening";
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

  /* ---- Герой: левый нижний угол ---- */
  const heroDock = el("button", "hub-hero-dock");
  heroDock.type = "button";
  heroDock.setAttribute("aria-label", "Персонаж");

  const portraitWrap = el("div", "hub-portrait");
  const portraitImg = el("img", "hub-portrait-img");
  portraitImg.alt = "";
  portraitImg.draggable = false;
  portraitWrap.append(portraitImg);

  const heroBody = el("div", "hub-hero-body");
  const heroRow = el("div", "hub-hero-row");
  const levelBadge = el("div", "hub-level");
  levelBadge.style.setProperty("--xp-pct", "0");
  levelBadge.setAttribute("aria-label", "Уровень и опыт");
  const levelNum = el("span", "hub-level-num", "1");
  levelBadge.append(levelNum);
  const nameEl = el("div", "hub-name");
  heroRow.append(levelBadge, nameEl);

  const makeVital = (kind: "hp" | "mana", title: string) => {
    const wrap = el("div", `hub-vital hub-vital-${kind}`);
    wrap.setAttribute("aria-label", title);
    const track = el("div", "hub-vital-track");
    const fill = el("div", "hub-vital-fill");
    const gloss = el("div", "hub-vital-gloss");
    const label = el("span", "hub-vital-label", "0 / 0");
    track.append(fill, gloss, label);
    wrap.append(track);
    return { wrap, fill, label };
  };

  const hpBar = makeVital("hp", "Здоровье");
  const manaBar = makeVital("mana", "Мана");

  heroBody.append(heroRow, hpBar.wrap, manaBar.wrap);
  heroDock.append(portraitWrap, heroBody);
  heroDock.addEventListener("click", () => handlers.onCharacter());
  // Вне .hub-screen: иначе stacking context хаба держит блок под затемнением/блюром оверлеев.
  heroDock.hidden = true;

  const syncPortraitSize = (): void => {
    // Квадрат по высоте колонки статов (aspect-ratio во flex с overflow схлопывался в 0).
    const side = Math.max(1, Math.round(heroBody.getBoundingClientRect().height));
    portraitWrap.style.width = `${side}px`;
    portraitWrap.style.height = `${side}px`;
    portraitWrap.style.flexBasis = `${side}px`;
  };
  const portraitObs = new ResizeObserver(() => syncPortraitSize());
  portraitObs.observe(heroBody);

  let xpTipText = "0 / 1";
  const xpTip = el("div", "skill-tooltip hub-xp-tip");
  xpTip.hidden = true;

  /* ---- Круглые кнопки: правый верх ---- */
  const tools = el("div", "hub-tools");

  const timeBtn = makeRoundBtn("hub-round-btn hub-time-btn", "День");
  timeBtn.textContent = "☾";
  timeBtn.setAttribute("aria-pressed", "true");

  const addGoldBtn = makeRoundBtn("hub-round-btn hub-add-gold-btn", "Добавить 1000 золота");
  addGoldBtn.textContent = "+1k";
  addGoldBtn.addEventListener("click", () => handlers.onAddTestGold());

  const fsBtn = makeRoundBtn("hub-round-btn hub-fs-btn", "Полный экран");
  fsBtn.append(el("span", "hub-fs-icon"));
  fsBtn.setAttribute("aria-pressed", "false");

  const menuWrap = el("div", "hub-menu-wrap");
  const menuBtn = makeRoundBtn("hub-round-btn hub-menu-btn", "Меню");
  menuBtn.append(el("span"), el("span"), el("span"));
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.setAttribute("aria-controls", "hub-game-menu");

  const menu = el("nav", "hub-game-menu");
  menu.id = "hub-game-menu";
  menu.hidden = true;
  menu.setAttribute("aria-label", "Игровое меню");

  const btnItemGen = el("button", "hub-menu-item", "Кодекс");
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
  menu.append(btnItemGen, menuSep, btnSave, btnSettings, btnSlots, btnExit);
  menuWrap.append(menuBtn, menu);

  tools.append(timeBtn, addGoldBtn, fsBtn, menuWrap);
  root.append(tools);

  /* ---- Сумка: правый нижний угол ---- */
  const bagDock = el("div", "hub-bag-dock");
  const bagBtn = makeRoundBtn("hub-round-btn hub-bag-btn", "Инвентарь");
  bagBtn.append(bagIcon());
  bagBtn.addEventListener("click", () => handlers.onInventory());
  const goldLine = el("div", "hub-bag-gold");
  goldLine.setAttribute("aria-live", "polite");
  bagDock.append(bagBtn, goldLine);
  root.append(bagDock);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root, heroDock, xpTip);

  const hideXpTip = (): void => {
    xpTip.hidden = true;
  };

  const placeXpTip = (clientX: number, clientY: number): void => {
    xpTip.innerHTML = `
      <div class="tt-name">Опыт</div>
      <div class="tt-desc">${xpTipText}</div>
    `;
    xpTip.hidden = false;
    const tipRect = xpTip.getBoundingClientRect();
    let left = clientX - tipRect.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
    let top = clientY - tipRect.height - 12;
    if (top < 8) top = clientY + 16;
    xpTip.style.left = `${left}px`;
    xpTip.style.top = `${top}px`;
  };

  levelBadge.addEventListener("pointerenter", (ev) => {
    placeXpTip(ev.clientX, ev.clientY);
  });
  levelBadge.addEventListener("pointermove", (ev) => {
    if (xpTip.hidden) return;
    placeXpTip(ev.clientX, ev.clientY);
  });
  levelBadge.addEventListener("pointerleave", hideXpTip);

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
      if (ev.code === "KeyI" && !root.hidden) {
        ev.preventDefault();
        handlers.onInventory();
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

  const syncTimeBtn = (): void => {
    const evening = townTime === "evening";
    timeBtn.textContent = evening ? "☾" : "☀";
    timeBtn.setAttribute("aria-label", evening ? "Сменить на день" : "Сменить на вечер");
    timeBtn.setAttribute("aria-pressed", evening ? "true" : "false");
    timeBtn.classList.toggle("is-evening", evening);
  };

  const applyTownTime = (time: TownTimeOfDay): void => {
    townTime = time;
    syncTimeBtn();
    const nextBg = getTownBackgroundUrl(time);
    if (currentTownBgUrl === nextBg) return;
    currentTownBgUrl = nextBg;
    imageW = 0;
    imageH = 0;
    bgImg.src = nextBg;
    scheduleLayout();
  };

  timeBtn.addEventListener("click", () => {
    applyTownTime(townTime === "evening" ? "day" : "evening");
  });
  syncTimeBtn();

  const onBgLoad = (): void => scheduleLayout();
  bgImg.addEventListener("load", onBgLoad);
  if (bgImg.complete && bgImg.naturalWidth > 0) scheduleLayout();

  const resizeObs = new ResizeObserver(() => scheduleLayout());
  resizeObs.observe(root);

  const setVital = (
    bar: { fill: HTMLElement; label: HTMLElement },
    current: number,
    max: number,
  ): void => {
    const cur = Math.max(0, Math.round(current));
    const cap = Math.max(1, Math.round(max));
    const pct = Math.min(100, (cur / cap) * 100);
    bar.fill.style.width = `${pct}%`;
    bar.label.textContent = `${cur} / ${cap}`;
  };

  const applyHeroDock = (state: GameState): void => {
    const h = state.hero;
    portraitImg.src = h.portraitUrl;
    portraitImg.alt = h.name;
    levelNum.textContent = String(h.level);
    nameEl.textContent = h.name;

    if (h.level >= MAX_HERO_LEVEL) {
      levelBadge.style.setProperty("--xp-pct", "100");
      xpTipText = "Макс. уровень";
    } else {
      const need = Math.max(1, xpToNextLevel(h.level));
      const pct = Math.min(100, Math.max(0, (h.xp / need) * 100));
      levelBadge.style.setProperty("--xp-pct", String(pct));
      xpTipText = `${h.xp} / ${need}`;
    }

    const sheet = computeHeroSheet(h.equipment, sheetBaseFromProfile(h));
    const maxHp = getStat(sheet, "maxHp");
    const maxMana = getStat(sheet, "maxMana");
    const hp = h.currentHp == null ? maxHp : Math.min(maxHp, Math.max(1, Math.ceil(h.currentHp)));
    const mana =
      h.currentMana == null ? maxMana : Math.min(maxMana, Math.max(0, Math.floor(h.currentMana)));
    setVital(hpBar, hp, maxHp);
    setVital(manaBar, mana, maxMana);

    heroDock.hidden = false;
    requestAnimationFrame(syncPortraitSize);
  };

  return {
    show(state) {
      goldLine.replaceChildren(goldAmountNode(state.hero.gold, "gold-amount hub-bag-gold-amount"));

      // Фон не рандомим: вечер по умолчанию, день/вечер только вручную.
      const opening = root.hidden;
      if (opening) applyTownTime(townTime);

      // Меню закрываем только при входе в город, не при каждом refresh (реген HP/маны).
      if (opening) closeMenu();
      root.hidden = false;
      applyHeroDock(state);
      scheduleLayout();
    },
    showHeroDock(state) {
      applyHeroDock(state);
    },
    hideHeroDock() {
      hideXpTip();
      heroDock.hidden = true;
    },
    hide() {
      closeMenu();
      hideXpTip();
      root.hidden = true;
      heroDock.hidden = true;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      if (layoutRaf) cancelAnimationFrame(layoutRaf);
      portraitObs.disconnect();
      resizeObs.disconnect();
      bgImg.removeEventListener("load", onBgLoad);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
      hideXpTip();
      xpTip.remove();
      heroDock.remove();
      root.remove();
    },
  };
}
