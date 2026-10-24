import { tryResolveBackgroundStemUrl, createWorldMapBackgroundImg } from "../art/menuBackground";
import { getEnemyKind } from "../combat/enemies";
import type { GameState, ZoneId } from "../meta/gameState";
import { getZone, getZonePoint, isZoneUnlocked, type ZonePointDef } from "../meta/zones";
import { coverLayout, projectLocation } from "./hubLocations";
import { WORLD_MAP_SPOTS, type WorldMapSpotId } from "./worldMapLocations";
import "./worldMapScreen.css";

export interface WorldMapApi {
  show(state: GameState): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface WorldMapHandlers {
  onBackToTown: () => void;
  onStartZone: (zoneId: ZoneId, pointId: string) => void;
  showToast: (text: string) => void;
}

function formatEnemyLevels(levels: [number, number]): string {
  const [lvlMin, lvlMax] = levels;
  return lvlMin === lvlMax ? `уровень ${lvlMin}` : `уровень ${lvlMin}-${lvlMax}`;
}

function formatPointLevelBadge(levels: [number, number]): string {
  const [lvlMin, lvlMax] = levels;
  return lvlMin === lvlMax ? `${lvlMin}` : `${lvlMin}-${lvlMax}`;
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

function lockHint(zoneId: ZoneId, heroLevel: number): string {
  const zone = getZone(zoneId);
  if (zoneId === "ruins" && heroLevel < 3) return "Нужен 3 уровень";
  return `Закрыто (ур. ${zone.minLevel}+)`;
}

export function mountWorldMapScreen(handlers: WorldMapHandlers): WorldMapApi {
  const root = el("div", "meta-screen world-map-screen");
  root.id = "world-map-screen";
  root.hidden = true;
  const bgImg = createWorldMapBackgroundImg();
  root.append(bgImg);

  const map = el("div", "world-map-layer");
  map.setAttribute("aria-label", "Карта мира");
  const spotAnchors = new Map<WorldMapSpotId, HTMLElement>();
  const spotButtons = new Map<WorldMapSpotId, HTMLButtonElement>();

  for (const spot of WORLD_MAP_SPOTS) {
    const anchor = el("div", "world-map-spot");
    anchor.dataset.spot = spot.id;
    const btn = el("button", "title-btn world-map-spot-btn", spot.label);
    btn.type = "button";
    btn.title = spot.label;
    btn.setAttribute("aria-label", spot.label);
    btn.addEventListener("click", () => {
      if (spot.kind === "town") {
        closeZonePanel();
        handlers.onBackToTown();
        return;
      }
      const zoneId = spot.zoneId;
      if (!zoneId) return;
      const unlocked = btn.dataset.unlocked === "1";
      if (!unlocked) {
        handlers.showToast(btn.dataset.lockHint || "Закрыто");
        return;
      }
      openZonePanel(zoneId);
    });
    anchor.append(btn);
    spotAnchors.set(spot.id, anchor);
    spotButtons.set(spot.id, btn);
    map.append(anchor);
  }
  root.append(map);

  const overlay = el("div", "wm-zone-overlay");
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");

  const panel = el("div", "wm-zone-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "wm-zone-title");

  const hero = el("section", "wm-zone-block wm-zone-hero");
  const previewWrap = el("div", "wm-zone-preview");
  const previewImg = el("img", "wm-zone-preview-img");
  previewImg.alt = "";
  previewImg.draggable = false;
  previewImg.decoding = "async";
  const previewFallback = el("div", "wm-zone-preview-fallback", "Нет арта");
  previewWrap.append(previewImg, previewFallback);
  const heroCopy = el("div", "wm-zone-hero-copy");
  const titleEl = el("h2", "wm-zone-title");
  titleEl.id = "wm-zone-title";
  const descEl = el("p", "wm-zone-desc");
  heroCopy.append(titleEl, descEl);
  hero.append(previewWrap, heroCopy);

  const pointsBlock = el("section", "wm-zone-block wm-zone-points-block");
  pointsBlock.append(el("h3", "wm-zone-block-title", "Локации"));
  const pointsRow = el("div", "wm-zone-points");
  pointsRow.setAttribute("role", "tablist");
  pointsRow.setAttribute("aria-label", "Локации");
  pointsBlock.append(pointsRow);

  const questsBlock = el("section", "wm-zone-block");
  questsBlock.append(el("h3", "wm-zone-block-title", "Квесты"));
  const questList = el("ul", "wm-zone-quest-list");
  questsBlock.append(questList);

  const enemiesBlock = el("section", "wm-zone-block");
  const enemiesHead = el("div", "wm-zone-enemies-head");
  enemiesHead.append(el("h3", "wm-zone-block-title", "Возможные враги"));
  const enemyLevelEl = el("span", "wm-zone-enemy-levels");
  enemiesHead.append(enemyLevelEl);
  const enemyRow = el("div", "wm-zone-enemy-row");
  enemiesBlock.append(enemiesHead, enemyRow);

  const lootBlock = el("section", "wm-zone-block wm-zone-loot");
  lootBlock.append(el("h3", "wm-zone-block-title", "Особый лут"));
  const lootStub = el("p", "wm-zone-loot-stub", "Особые ресурсы зоны появятся позже.");
  lootBlock.append(lootStub);

  const actions = el("div", "wm-zone-actions");
  const btnBack = el("button", "meta-btn wm-zone-btn", "Назад");
  btnBack.type = "button";
  const btnGo = el("button", "meta-btn meta-btn-primary wm-zone-btn", "В путь");
  btnGo.type = "button";
  actions.append(btnBack, btnGo);

  panel.append(hero, pointsBlock, questsBlock, enemiesBlock, lootBlock, actions);
  overlay.append(panel);
  root.append(overlay);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let openZoneId: ZoneId | null = null;
  let openPointId: string | null = null;
  let panelClosing = false;

  const fillPointDetails = (point: ZonePointDef): void => {
    openPointId = point.id;
    enemyLevelEl.textContent = formatEnemyLevels(point.enemyLevels);

    enemyRow.replaceChildren();
    for (const id of point.enemyPool) {
      const kind = getEnemyKind(id);
      if (!kind) continue;
      const chip = el("div", "wm-zone-enemy");
      chip.title = kind.name;
      const img = el("img", "wm-zone-enemy-img");
      img.src = kind.portraitUrl;
      img.alt = kind.name;
      img.draggable = false;
      const nameEl = el("span", "wm-zone-enemy-name");
      // Перенос только после "-" (например "Гоблин-копейщик").
      const parts = kind.name.split("-");
      parts.forEach((part, i) => {
        if (i > 0) {
          nameEl.append("-");
          nameEl.append(document.createElement("wbr"));
        }
        nameEl.append(part);
      });
      chip.append(img, nameEl);
      enemyRow.append(chip);
    }

    for (const node of pointsRow.querySelectorAll<HTMLButtonElement>(".wm-zone-point-btn")) {
      const active = node.dataset.pointId === point.id;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-selected", active ? "true" : "false");
      node.tabIndex = active ? 0 : -1;
    }
  };

  const fillZonePanel = (zoneId: ZoneId): void => {
    const zone = getZone(zoneId);
    openZoneId = zoneId;
    titleEl.textContent = zone.name;
    descEl.textContent = zone.description;

    const previewUrl = tryResolveBackgroundStemUrl(zone.previewStem);
    if (previewUrl) {
      previewImg.src = previewUrl;
      previewImg.hidden = false;
      previewFallback.hidden = true;
    } else {
      previewImg.removeAttribute("src");
      previewImg.hidden = true;
      previewFallback.hidden = false;
    }

    pointsRow.replaceChildren();
    pointsBlock.hidden = zone.points.length <= 1;
    for (const point of zone.points) {
      const btn = el("button", "wm-zone-point-btn");
      btn.type = "button";
      btn.dataset.pointId = point.id;
      btn.setAttribute("role", "tab");
      const nameSpan = el("span", "wm-zone-point-name", point.name);
      const lvlSpan = el(
        "span",
        "wm-zone-point-lvl",
        formatPointLevelBadge(point.enemyLevels),
      );
      btn.append(nameSpan, lvlSpan);
      btn.title = `${point.name} - ${formatEnemyLevels(point.enemyLevels)}`;
      btn.addEventListener("click", () => {
        if (openZoneId !== zoneId) return;
        fillPointDetails(point);
      });
      pointsRow.append(btn);
    }

    questList.replaceChildren();
    if (zone.quests.length === 0) {
      const empty = el("li", "wm-zone-quest-empty", "Нет активных квестов");
      questList.append(empty);
    } else {
      for (const name of zone.quests) {
        questList.append(el("li", undefined, name));
      }
    }

    fillPointDetails(getZonePoint(zone));
    panel.setAttribute("aria-labelledby", "wm-zone-title");
  };

  const openZonePanel = (zoneId: ZoneId): void => {
    panelClosing = false;
    fillZonePanel(zoneId);
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    // Два кадра: сначала mount, потом класс анимации.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (openZoneId !== zoneId) return;
        overlay.classList.add("is-open");
      });
    });
    btnGo.focus();
  };

  const closeZonePanel = (after?: () => void): void => {
    if (overlay.hidden || panelClosing) {
      after?.();
      return;
    }
    panelClosing = true;
    overlay.classList.remove("is-open");
    const finish = (): void => {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      openZoneId = null;
      openPointId = null;
      panelClosing = false;
      after?.();
    };
    const onEnd = (ev: TransitionEvent): void => {
      if (ev.target !== panel || ev.propertyName !== "transform") return;
      panel.removeEventListener("transitionend", onEnd);
      finish();
    };
    panel.addEventListener("transitionend", onEnd);
    window.setTimeout(() => {
      panel.removeEventListener("transitionend", onEnd);
      if (panelClosing) finish();
    }, 220);
  };

  btnBack.addEventListener("click", () => closeZonePanel());
  btnGo.addEventListener("click", () => {
    const id = openZoneId;
    const pointId = openPointId;
    if (!id || !pointId) return;
    handlers.onStartZone(id, pointId);
  });
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeZonePanel();
  });
  pointsRow.addEventListener("keydown", (ev) => {
    if (ev.code !== "ArrowLeft" && ev.code !== "ArrowRight") return;
    const buttons = [...pointsRow.querySelectorAll<HTMLButtonElement>(".wm-zone-point-btn")];
    if (buttons.length < 2) return;
    const current = buttons.findIndex((b) => b.classList.contains("is-active"));
    if (current < 0) return;
    ev.preventDefault();
    const delta = ev.code === "ArrowRight" ? 1 : -1;
    const next = buttons[(current + delta + buttons.length) % buttons.length]!;
    next.click();
    next.focus();
  });

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (root.hidden) return;
    const target = ev.target;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;
    if (typing) return;
    if (ev.code !== "Escape") return;
    ev.preventDefault();
    if (!overlay.hidden) {
      closeZonePanel();
      return;
    }
    handlers.onBackToTown();
  };
  window.addEventListener("keydown", onKeyDown);

  let imageW = 0;
  let imageH = 0;
  let layoutRaf = 0;

  const layoutSpots = (): void => {
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
    for (const spot of WORLD_MAP_SPOTS) {
      const anchor = spotAnchors.get(spot.id);
      if (!anchor) continue;
      const { left, top } = projectLocation(spot, layout);
      anchor.style.left = `${left}px`;
      anchor.style.top = `${top}px`;
    }
  };

  const scheduleLayout = (): void => {
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(layoutSpots);
  };

  const onBgLoad = (): void => scheduleLayout();
  bgImg.addEventListener("load", onBgLoad);
  if (bgImg.complete && bgImg.naturalWidth > 0) scheduleLayout();

  const resizeObs = new ResizeObserver(() => scheduleLayout());
  resizeObs.observe(root);

  return {
    show(state) {
      closeZonePanel();
      for (const spot of WORLD_MAP_SPOTS) {
        const btn = spotButtons.get(spot.id);
        if (!btn) continue;
        if (spot.kind === "town") {
          btn.classList.remove("is-locked");
          btn.dataset.unlocked = "1";
          delete btn.dataset.lockHint;
          btn.title = "Вернуться в город";
          continue;
        }
        const zoneId = spot.zoneId!;
        const zone = getZone(zoneId);
        const unlocked = isZoneUnlocked(zoneId, state.hero.level, state.unlockedZones);
        btn.classList.toggle("is-locked", !unlocked);
        btn.dataset.unlocked = unlocked ? "1" : "0";
        const point = getZonePoint(zone);
        const hint = unlocked
          ? `${zone.description} (${zone.points.length} локации, ilvl ${point.itemLevel}+)`
          : lockHint(zoneId, state.hero.level);
        btn.dataset.lockHint = unlocked ? "" : hint;
        btn.title = unlocked ? `${zone.name} - ${hint}` : hint;
        btn.textContent = zone.name;
        btn.setAttribute("aria-label", zone.name);
      }
      root.hidden = false;
      scheduleLayout();
    },
    hide() {
      closeZonePanel();
      root.hidden = true;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      if (layoutRaf) cancelAnimationFrame(layoutRaf);
      resizeObs.disconnect();
      bgImg.removeEventListener("load", onBgLoad);
      window.removeEventListener("keydown", onKeyDown);
      root.remove();
    },
  };
}
