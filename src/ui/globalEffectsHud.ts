import {
  formatGlobalEffectTimer,
  globalEffectDef,
  type GlobalEffect,
} from "../effects/globalEffects";

export interface GlobalEffectsHudApi {
  sync(effects: GlobalEffect[]): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

/** Полоска глобальных эффектов в левом верхнем углу (город / карта). */
export function mountGlobalEffectsHud(parent: HTMLElement): GlobalEffectsHudApi {
  const root = document.createElement("div");
  root.className = "global-effects-hud";
  root.hidden = true;
  parent.appendChild(root);

  const tooltip = document.createElement("div");
  tooltip.className = "skill-tooltip global-effect-tooltip";
  tooltip.hidden = true;
  parent.appendChild(tooltip);

  const hideTip = (): void => {
    tooltip.hidden = true;
  };

  const placeTip = (anchor: HTMLElement): void => {
    const rect = anchor.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
    let top = rect.bottom + 8;
    if (top + tipRect.height > window.innerHeight - 8) {
      top = Math.max(8, rect.top - tipRect.height - 8);
    }
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  const showTip = (anchor: HTMLElement, effect: GlobalEffect): void => {
    const def = globalEffectDef(effect.id);
    const timer = formatGlobalEffectTimer(effect.remaining);
    tooltip.className = "skill-tooltip global-effect-tooltip";
    tooltip.style.removeProperty("--aspect-color");
    tooltip.innerHTML = `
      <div class="tt-name">${def.name}</div>
      <div class="tt-desc">${def.description}</div>
      ${
        timer
          ? `<div class="tt-stats"><div class="tt-stat"><span>Осталось</span><b>${timer}</b></div></div>`
          : `<div class="tt-stats"><div class="tt-stat"><span>Длительность</span><b>постоянно</b></div></div>`
      }
    `;
    tooltip.hidden = false;
    placeTip(anchor);
  };

  const canHover = (): boolean => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const sync = (effects: GlobalEffect[]): void => {
    root.replaceChildren();
    for (const effect of effects) {
      const def = globalEffectDef(effect.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "global-effect-icon";
      btn.setAttribute("aria-label", def.name);

      const img = document.createElement("img");
      img.src = def.iconUrl;
      img.alt = "";
      img.draggable = false;

      btn.appendChild(img);

      const timer = formatGlobalEffectTimer(effect.remaining);
      if (timer) {
        const badge = document.createElement("span");
        badge.className = "global-effect-timer";
        badge.textContent = timer;
        btn.appendChild(badge);
      }

      btn.addEventListener("pointerenter", () => {
        if (!canHover()) return;
        showTip(btn, effect);
      });
      btn.addEventListener("pointerleave", hideTip);
      root.appendChild(btn);
    }
  };

  return {
    sync,
    setVisible(visible: boolean) {
      root.hidden = !visible;
      if (!visible) hideTip();
    },
    destroy() {
      hideTip();
      root.remove();
      tooltip.remove();
    },
  };
}
