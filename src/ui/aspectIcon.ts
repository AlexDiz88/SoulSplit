import { ASPECT_HEX, ASPECT_LABEL } from "../abilities/aspects";
import { aspectIconUrl } from "../art/aspectIcons";
import type { Aspect } from "../types";
import { placeItemTip } from "./itemTooltip";
import "./aspectIcon.css";

const HOVER_TOOLTIP_MQ = "(hover: hover) and (pointer: fine)";

export function canHoverAspectTooltip(): boolean {
  return window.matchMedia(HOVER_TOOLTIP_MQ).matches;
}

export function createAspectNameTip(): HTMLElement {
  const tip = document.createElement("div");
  tip.className = "skill-tooltip aspect-name-tip";
  tip.hidden = true;
  return tip;
}

export function createAspectIconImg(
  aspect: Aspect,
  className = "aspect-icon",
): HTMLImageElement {
  const img = document.createElement("img");
  img.className = className;
  img.src = aspectIconUrl(aspect);
  img.alt = "";
  img.draggable = false;
  return img;
}

/** Кликабельная / наводимая иконка аспекта (обёртка для тултипа). */
export function createAspectIconHit(
  aspect: Aspect,
  imgClassName = "aspect-icon-sm",
  hitClassName = "aspect-icon-hit",
): HTMLElement {
  const hit = document.createElement("span");
  hit.className = hitClassName;
  hit.setAttribute("aria-label", ASPECT_LABEL[aspect]);
  hit.append(createAspectIconImg(aspect, imgClassName));
  return hit;
}

export function fillAspectNameTip(tip: HTMLElement, aspect: Aspect): void {
  tip.className = `skill-tooltip aspect-name-tip aspect-${aspect}`;
  tip.style.setProperty("--aspect-color", ASPECT_HEX[aspect]);
  tip.replaceChildren();
  const name = document.createElement("div");
  name.className = "tt-name";
  name.textContent = ASPECT_LABEL[aspect];
  tip.append(name);
}

export function showAspectNameTip(
  tip: HTMLElement,
  aspect: Aspect,
  anchor: HTMLElement,
): void {
  fillAspectNameTip(tip, aspect);
  tip.dataset.tipAspect = aspect;
  placeItemTip(tip, anchor);
}

export function hideAspectNameTip(tip: HTMLElement): void {
  tip.hidden = true;
  delete tip.dataset.tipAspect;
}

export interface WireAspectTooltipOpts {
  /** На тач: toggle по клику (если клик не уводит с экрана). */
  toggleOnClick?: boolean;
}

/** Кастомный тултип с названием аспекта. Без HTML title. */
export function wireAspectNameTooltip(
  anchor: HTMLElement,
  aspect: Aspect,
  tip: HTMLElement,
  opts?: WireAspectTooltipOpts,
): void {
  anchor.setAttribute("aria-label", ASPECT_LABEL[aspect]);

  const show = (): void => showAspectNameTip(tip, aspect, anchor);
  const hide = (): void => {
    if (tip.dataset.tipAspect === aspect) hideAspectNameTip(tip);
  };

  anchor.addEventListener("pointerenter", () => {
    if (!canHoverAspectTooltip()) return;
    show();
  });
  anchor.addEventListener("pointerleave", () => {
    if (!canHoverAspectTooltip()) return;
    hide();
  });

  if (opts?.toggleOnClick) {
    anchor.addEventListener("click", () => {
      if (canHoverAspectTooltip()) return;
      if (!tip.hidden && tip.dataset.tipAspect === aspect) hide();
      else show();
    });
  }
}
