import { createWorldMapBackgroundImg } from "../art/menuBackground";
import type { GameState, ZoneId } from "../meta/gameState";
import { getZone, isZoneUnlocked } from "../meta/zones";
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
  onStartZone: (zoneId: ZoneId) => void;
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
      handlers.onStartZone(zoneId);
    });
    anchor.append(btn);
    spotAnchors.set(spot.id, anchor);
    spotButtons.set(spot.id, btn);
    map.append(anchor);
  }
  root.append(map);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (root.hidden) return;
    const target = ev.target;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;
    if (typing) return;
    if (ev.code === "Escape") {
      ev.preventDefault();
      handlers.onBackToTown();
    }
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
        const hint = unlocked
          ? `${zone.description} (ilvl ${zone.itemLevel})`
          : lockHint(zoneId, state.hero.level);
        btn.dataset.lockHint = unlocked ? "" : hint;
        btn.title = unlocked ? `${zone.name} - ${hint}` : hint;
      }
      root.hidden = false;
      scheduleLayout();
    },
    hide() {
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
