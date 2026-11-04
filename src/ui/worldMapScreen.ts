import { ASPECT_HEX } from "../abilities/definitions";
import { createWorldMapBackgroundImg } from "../art/menuBackground";
import { tryResolveRegionArtUrl } from "../art/regionArt";
import { getEnemyCardById } from "../combat/enemyCatalog";
import { enemyLevelRangeForIds, getEnemyKind, type EnemyKind } from "../combat/enemies";
import type { GameState, RegionId } from "../meta/gameState";
import {
  encounterEnemyIds,
  getRegion,
  getLocation,
  isRegionUnlocked,
  type LocationDef,
} from "../meta/regions";
import { activeQuestNamesForRegion } from "../quests/questLog";
import { coverLayout, projectLocation } from "./hubLocations";
import { CURRENT_HUB_CITY_NAME } from "../meta/hubCity";
import { SKULL_ICON_PATH } from "./enemyRankIcons";
import { WORLD_MAP_SPOTS, type WorldMapSpotId } from "./worldMapLocations";
import "./worldMapScreen.css";

const HOVER_TOOLTIP_MQ = "(hover: hover) and (pointer: fine)";

export interface WorldMapShowOptions {
  /** Сразу открыть окно региона (после боя и т.п.). */
  openRegionId?: RegionId;
  /** Подсветить локацию внутри региона. */
  openLocationId?: string;
}

export interface WorldMapApi {
  show(state: GameState, opts?: WorldMapShowOptions): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface WorldMapHandlers {
  onBackToTown: () => void;
  onStartLocation: (regionId: RegionId, locationId: string) => void;
  showToast: (text: string) => void;
}

function formatEnemyLevels(levels: [number, number]): string {
  const [lvlMin, lvlMax] = levels;
  return lvlMin === lvlMax ? `уровни ${lvlMin}` : `уровни ${lvlMin}-${lvlMax}`;
}

/** Средний уровень угрозы локации (середина бюджета пачки). */
function averageThreat(budget: [number, number]): number {
  return Math.round((budget[0] + budget[1]) / 2);
}

const THREAT_TOOLTIP =
  "Уровень опасности локации. Чем выше число, тем тяжелее сражение: врагов больше и/или они сильнее.";

function createThreatIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "wm-region-threat-icon");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M8 1.2c-.9 1.4-2.6 2.3-4.4 2.5.2 3.4 1.6 5.8 4.4 7.6 2.8-1.8 4.2-4.2 4.4-7.6C10.6 3.5 8.9 2.6 8 1.2zm0 3.1c.7 0 1.3.6 1.3 1.3S8.7 6.9 8 6.9 6.7 6.3 6.7 5.6 7.3 4.3 8 4.3zm-2.1 4.2c.5.4 1.2.7 2.1.7s1.6-.3 2.1-.7c-.2.9-.8 1.6-2.1 2.1-1.3-.5-1.9-1.2-2.1-2.1z",
  );
  path.setAttribute("fill", "currentColor");
  svg.append(path);
  return svg;
}

/** Красный череп для бейджа босса. */
function createBossIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "wm-region-enemy-boss-icon");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", SKULL_ICON_PATH);
  path.setAttribute("fill", "currentColor");
  svg.append(path);
  return svg;
}

function canHoverTooltip(): boolean {
  return window.matchMedia(HOVER_TOOLTIP_MQ).matches;
}

function fillEnemyUnitTooltip(host: HTMLElement, kind: EnemyKind): void {
  const card = getEnemyCardById(kind.id);
  const description = card?.description?.trim() || kind.name;

  host.replaceChildren();
  host.className = `skill-tooltip wm-region-enemy-tip aspect-${kind.aspect}`;
  host.style.setProperty("--aspect-color", ASPECT_HEX[kind.aspect]);
  host.append(el("div", "tt-desc", description));
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

function lockHint(regionId: RegionId, _heroLevel: number): string {
  const region = getRegion(regionId);
  return `Закрыто (ур. ${region.minLevel}+)`;
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
    btn.setAttribute("aria-label", spot.label);
    btn.addEventListener("click", () => {
      if (spot.kind === "town") {
        closeRegionPanel();
        handlers.onBackToTown();
        return;
      }
      const regionId = spot.regionId;
      if (!regionId) return;
      const unlocked = btn.dataset.unlocked === "1";
      if (!unlocked) {
        handlers.showToast(btn.dataset.lockHint || "Закрыто");
        return;
      }
      openRegionPanel(regionId);
    });
    anchor.append(btn);
    spotAnchors.set(spot.id, anchor);
    spotButtons.set(spot.id, btn);
    map.append(anchor);
  }
  root.append(map);

  const overlay = el("div", "wm-region-overlay");
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");

  const panel = el("div", "wm-region-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "wm-region-title");

  const hero = el("section", "wm-region-block wm-region-hero");
  const previewWrap = el("div", "wm-region-preview");
  const previewImg = el("img", "wm-region-preview-img");
  previewImg.alt = "";
  previewImg.draggable = false;
  previewImg.decoding = "async";
  const previewFallback = el("div", "wm-region-preview-fallback", "Нет арта");
  previewWrap.append(previewImg, previewFallback);
  const heroCopy = el("div", "wm-region-hero-copy");
  const titleEl = el("h2", "wm-region-title");
  titleEl.id = "wm-region-title";
  const descEl = el("p", "wm-region-desc");
  heroCopy.append(titleEl, descEl);
  hero.append(previewWrap, heroCopy);

  const locationsBlock = el("section", "wm-region-block wm-region-locations-block");
  locationsBlock.append(el("h3", "wm-region-block-title", "Локации"));
  const locationsRow = el("div", "wm-region-locations");
  locationsRow.setAttribute("role", "tablist");
  locationsRow.setAttribute("aria-label", "Локации");
  locationsBlock.append(locationsRow);

  const questsBlock = el("section", "wm-region-block");
  questsBlock.append(el("h3", "wm-region-block-title", "Квесты"));
  const questList = el("ul", "wm-region-quest-list");
  questsBlock.append(questList);

  const enemiesBlock = el("section", "wm-region-block wm-region-enemies-block");
  const enemiesHead = el("div", "wm-region-enemies-head");
  enemiesHead.append(el("h3", "wm-region-block-title", "Возможные враги"));
  const enemiesMeta = el("div", "wm-region-enemies-meta");
  const threatBtn = el("button", "wm-region-threat");
  threatBtn.type = "button";
  threatBtn.setAttribute("aria-label", "Угроза локации");
  const threatValueEl = el("span", "wm-region-threat-value");
  const threatTip = el("span", "wm-region-threat-tip");
  threatTip.id = "wm-region-threat-tip";
  const tipBody = el("span", "wm-region-threat-tip-body", THREAT_TOOLTIP);
  threatTip.append(el("span", "wm-region-threat-tip-title", "Угроза"), tipBody);
  threatBtn.setAttribute("aria-describedby", threatTip.id);
  threatBtn.append(threatValueEl, createThreatIcon(), threatTip);
  const enemyLevelEl = el("span", "wm-region-enemy-levels");
  enemiesMeta.append(threatBtn, enemyLevelEl);
  enemiesHead.append(enemiesMeta);
  const enemyRow = el("div", "wm-region-enemy-row");
  enemiesBlock.append(enemiesHead, enemyRow);

  const lootBlock = el("section", "wm-region-block wm-region-loot");
  lootBlock.append(el("h3", "wm-region-block-title", "Особый лут"));
  const lootStub = el("p", "wm-region-loot-stub", "Особые ресурсы региона появятся позже.");
  lootBlock.append(lootStub);

  const actions = el("div", "wm-region-actions");
  const btnBack = el("button", "meta-btn wm-region-btn", "Назад");
  btnBack.type = "button";
  const btnGo = el("button", "meta-btn meta-btn-primary wm-region-btn", "В бой");
  btnGo.type = "button";
  actions.append(btnBack, btnGo);

  panel.append(hero, locationsBlock, questsBlock, enemiesBlock, lootBlock, actions);
  overlay.append(panel);
  root.append(overlay);

  const enemyTip = el("div", "skill-tooltip wm-region-enemy-tip");
  enemyTip.hidden = true;

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root, enemyTip);

  let openRegionId: RegionId | null = null;
  let openLocationId: string | null = null;
  let panelClosing = false;
  let stateRef: GameState | null = null;

  const hideEnemyTip = (): void => {
    enemyTip.hidden = true;
  };

  const placeEnemyTip = (anchor: HTMLElement): void => {
    const rect = anchor.getBoundingClientRect();
    const tipRect = enemyTip.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
    let top = rect.top - tipRect.height - 10;
    if (top < 8) top = rect.bottom + 10;
    enemyTip.style.left = `${left}px`;
    enemyTip.style.top = `${Math.max(8, top)}px`;
  };

  const showEnemyTip = (anchor: HTMLElement, kind: EnemyKind): void => {
    fillEnemyUnitTooltip(enemyTip, kind);
    enemyTip.hidden = false;
    placeEnemyTip(anchor);
  };

  const bindEnemyPortraitTip = (anchor: HTMLElement, kind: EnemyKind): void => {
    anchor.addEventListener("pointerenter", () => {
      if (!canHoverTooltip()) return;
      showEnemyTip(anchor, kind);
    });
    anchor.addEventListener("pointerleave", () => {
      if (!canHoverTooltip()) return;
      hideEnemyTip();
    });
    anchor.addEventListener("focus", () => {
      if (!canHoverTooltip()) return;
      showEnemyTip(anchor, kind);
    });
    anchor.addEventListener("blur", () => {
      if (!canHoverTooltip()) return;
      hideEnemyTip();
    });
  };

  const fillLocationQuests = (regionId: RegionId, locationId: string): void => {
    questList.replaceChildren();
    const questNames = stateRef ? activeQuestNamesForRegion(stateRef, regionId, locationId) : [];
    if (questNames.length === 0) {
      questList.append(el("li", "wm-region-quest-empty", "Нет активных квестов"));
      return;
    }
    for (const name of questNames) {
      questList.append(el("li", undefined, name));
    }
  };

  const clearLocationDetails = (): void => {
    openLocationId = null;
    hideEnemyTip();
    if (openRegionId) fillLocationQuests(openRegionId, "");
    enemyLevelEl.textContent = "";
    threatValueEl.textContent = "-";
    threatBtn.setAttribute("aria-label", "Угроза");
    enemyRow.replaceChildren();
    btnGo.disabled = true;
  };

  const fillLocationDetails = (location: LocationDef): void => {
    openLocationId = location.id;
    hideEnemyTip();
    if (openRegionId) fillLocationQuests(openRegionId, location.id);
    const levelRange = enemyLevelRangeForIds(encounterEnemyIds(location));
    const threat = averageThreat(location.encounter.threatBudget);
    enemyLevelEl.textContent = formatEnemyLevels(levelRange);
    threatValueEl.textContent = String(threat);
    threatBtn.setAttribute("aria-label", `Угроза ${threat}`);
    btnGo.disabled = false;

    enemyRow.replaceChildren();
    for (const id of encounterEnemyIds(location)) {
      const kind = getEnemyKind(id);
      if (!kind) continue;
      const chip = el("div", "wm-region-enemy");
      const portrait = el("div", "wm-region-enemy-portrait");
      portrait.tabIndex = 0;
      portrait.setAttribute("role", "img");
      portrait.setAttribute("aria-label", kind.name);
      const img = el("img", "wm-region-enemy-img");
      img.src = kind.portraitUrl;
      img.alt = "";
      img.draggable = false;
      portrait.append(img);

      if (kind.boss) {
        const badge = el("button", "wm-region-enemy-boss");
        badge.type = "button";
        badge.setAttribute("aria-label", "Босс");
        const bossTip = el("span", "rank-label-tip wm-region-enemy-boss-tip", "Босс");
        badge.append(createBossIcon(), bossTip);
        badge.addEventListener("pointerenter", () => {
          hideEnemyTip();
        });
        badge.addEventListener("pointerleave", (ev) => {
          const next = ev.relatedTarget;
          if (next instanceof Node && portrait.contains(next) && canHoverTooltip()) {
            showEnemyTip(portrait, kind);
          }
        });
        badge.addEventListener("focus", () => {
          hideEnemyTip();
        });
        badge.addEventListener("blur", () => {
          if (document.activeElement === portrait && canHoverTooltip()) {
            showEnemyTip(portrait, kind);
          }
        });
        portrait.append(badge);
      }

      const nameEl = el("span", "wm-region-enemy-name");
      // Перенос только после "-" (например "Гоблин-копейщик").
      const parts = kind.name.split("-");
      parts.forEach((part, i) => {
        if (i > 0) {
          nameEl.append("-");
          nameEl.append(document.createElement("wbr"));
        }
        nameEl.append(part);
      });
      chip.append(portrait, nameEl);
      bindEnemyPortraitTip(portrait, kind);
      enemyRow.append(chip);
    }

    for (const node of locationsRow.querySelectorAll<HTMLButtonElement>(".wm-location-btn")) {
      const active = node.dataset.locationId === location.id;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-selected", active ? "true" : "false");
      node.tabIndex = active ? 0 : -1;
    }
  };

  const fillRegionPanel = (regionId: RegionId, locationId?: string): void => {
    const region = getRegion(regionId);
    openRegionId = regionId;
    titleEl.textContent = region.name;
    descEl.textContent = region.description;

    const previewUrl = tryResolveRegionArtUrl(region.previewStem);
    if (previewUrl) {
      previewImg.src = previewUrl;
      previewImg.hidden = false;
      previewFallback.hidden = true;
    } else {
      previewImg.removeAttribute("src");
      previewImg.hidden = true;
      previewFallback.hidden = false;
    }

    locationsRow.replaceChildren();
    locationsBlock.hidden = region.locations.length <= 1;
    for (const location of region.locations) {
      const btn = el("button", "wm-location-btn");
      btn.type = "button";
      btn.dataset.locationId = location.id;
      btn.setAttribute("role", "tab");
      const nameSpan = el("span", "wm-location-name", location.name);
      btn.append(nameSpan);
      btn.setAttribute("aria-label", location.name);
      btn.addEventListener("click", () => {
        if (openRegionId !== regionId) return;
        fillLocationDetails(location);
      });
      locationsRow.append(btn);
    }

    const location = getLocation(region, locationId);
    if (location) fillLocationDetails(location);
    else clearLocationDetails();
    panel.setAttribute("aria-labelledby", "wm-region-title");
  };

  const openRegionPanel = (regionId: RegionId, locationId?: string): void => {
    panelClosing = false;
    fillRegionPanel(regionId, locationId);
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    // Два кадра: сначала mount, потом класс анимации.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (openRegionId !== regionId) return;
        overlay.classList.add("is-open");
      });
    });
    btnGo.focus();
  };

  const closeRegionPanel = (after?: () => void): void => {
    if (overlay.hidden || panelClosing) {
      after?.();
      return;
    }
    panelClosing = true;
    hideEnemyTip();
    overlay.classList.remove("is-open");
    const finish = (): void => {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      openRegionId = null;
      openLocationId = null;
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

  btnBack.addEventListener("click", () => closeRegionPanel());
  btnGo.addEventListener("click", () => {
    const id = openRegionId;
    const locationId = openLocationId;
    if (!id || !locationId) return;
    handlers.onStartLocation(id, locationId);
  });
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeRegionPanel();
  });
  locationsRow.addEventListener("keydown", (ev) => {
    if (ev.code !== "ArrowLeft" && ev.code !== "ArrowRight") return;
    const buttons = [...locationsRow.querySelectorAll<HTMLButtonElement>(".wm-location-btn")];
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
      closeRegionPanel();
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
    show(state, opts) {
      stateRef = state;
      closeRegionPanel();
      for (const spot of WORLD_MAP_SPOTS) {
        const btn = spotButtons.get(spot.id);
        if (!btn) continue;
        if (spot.kind === "town") {
          btn.classList.remove("is-locked");
          btn.dataset.unlocked = "1";
          delete btn.dataset.lockHint;
          btn.setAttribute("aria-label", `Вернуться в ${CURRENT_HUB_CITY_NAME}`);
          continue;
        }
        const regionId = spot.regionId!;
        const region = getRegion(regionId);
        const unlocked = isRegionUnlocked(regionId, state.hero.level, state.unlockedRegions);
        btn.classList.toggle("is-locked", !unlocked);
        btn.dataset.unlocked = unlocked ? "1" : "0";
        const location = getLocation(region);
        const hint = unlocked
          ? location
            ? `${region.description} (${region.locations.length} локации, ilvl ${location.itemLevel}+)`
            : region.description
          : lockHint(regionId, state.hero.level);
        btn.dataset.lockHint = unlocked ? "" : hint;
        btn.textContent = region.name;
        btn.setAttribute("aria-label", unlocked ? `${region.name}. ${hint}` : hint);
      }
      root.hidden = false;
      scheduleLayout();
      const openId = opts?.openRegionId;
      if (
        openId &&
        isRegionUnlocked(openId, state.hero.level, state.unlockedRegions)
      ) {
        openRegionPanel(openId, opts?.openLocationId);
      }
    },
    hide() {
      closeRegionPanel();
      root.hidden = true;
      stateRef = null;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      if (layoutRaf) cancelAnimationFrame(layoutRaf);
      resizeObs.disconnect();
      bgImg.removeEventListener("load", onBgLoad);
      window.removeEventListener("keydown", onKeyDown);
      hideEnemyTip();
      enemyTip.remove();
      root.remove();
    },
  };
}
