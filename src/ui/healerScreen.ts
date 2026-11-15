import { formatGlobalEffectTimer, globalEffectDef } from "../effects/globalEffects";
import type { GameState } from "../meta/gameState";
import {
  clearTrauma,
  findTrauma,
  grantOrRefreshHealerBuff,
  HEALER_BUFF_OFFERS,
  traumaDefById,
  type HealerBuffOffer,
} from "../meta/healer";
import { advanceHours, HOURS_PER_HEALER_SERVICE } from "../meta/worldTime";
import { goldAmountNode } from "./goldIcon";
import "./healerScreen.css";

export interface HealerScreenApi {
  show(state: GameState): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface HealerScreenHandlers {
  onClose: () => void;
  onChanged: () => void;
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

function formatDurationMin(sec: number): string {
  const m = Math.max(1, Math.round(sec / 60));
  return `${m} мин`;
}

export function mountHealerScreen(handlers: HealerScreenHandlers): HealerScreenApi {
  const root = el("div", "healer-overlay");
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "healer-title");

  const win = el("div", "healer-window");

  const closeBtn = el("button", "healer-x");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.innerHTML = '<span aria-hidden="true"></span>';

  const head = el("div", "healer-head");
  const title = el("h2", "healer-title", "Лекарь");
  title.id = "healer-title";
  const subtitle = el(
    "p",
    "healer-subtitle",
    "Лечение травм и временные усиления перед походом",
  );
  const goldLine = el("div", "healer-gold");
  head.append(title, subtitle, goldLine);

  const body = el("div", "healer-body");
  const traumaSection = el("section", "healer-section");
  traumaSection.append(el("h3", "healer-section-title", "Травмы / Недуги"));
  const traumaHost = el("div", "healer-trauma-host");
  traumaSection.append(traumaHost);

  const buffsSection = el("section", "healer-section");
  buffsSection.append(el("h3", "healer-section-title", "Временные усиления"));
  const buffsHost = el("div", "healer-buffs");
  buffsSection.append(buffsHost);

  body.append(traumaSection, buffsSection);
  win.append(closeBtn, head, body);
  root.append(win);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let stateRef: GameState | null = null;

  function close(): void {
    root.hidden = true;
    stateRef = null;
    handlers.onClose();
  }

  function renderGold(): void {
    if (!stateRef) return;
    goldLine.replaceChildren();
    goldLine.append(document.createTextNode("Золото: "));
    goldLine.append(goldAmountNode(stateRef.hero.gold));
  }

  function renderTrauma(): void {
    if (!stateRef) return;
    traumaHost.replaceChildren();
    const effect = findTrauma(stateRef.hero.globalEffects);
    const card = el("div", "healer-trauma-card");

    if (!effect) {
      card.classList.add("is-clear");
      const icon = el("div", "healer-trauma-icon");
      const img = el("img");
      img.src = globalEffectDef("rest_recovery").iconUrl;
      img.alt = "";
      img.draggable = false;
      icon.append(img);
      const info = el("div", "healer-trauma-info");
      info.append(el("p", "healer-trauma-name", "Ран нет"));
      info.append(
        el(
          "p",
          "healer-trauma-desc",
          "Вы здоровы. Если вы получите травму - обратитесь к лекарю.",
        ),
      );
      card.append(icon, info);
      traumaHost.append(card);
      return;
    }

    const trauma = traumaDefById(effect.id);
    if (!trauma) return;
    const def = globalEffectDef(effect.id);
    const pct = Math.round(trauma.damageReduceFraction * 100);

    const icon = el("div", "healer-trauma-icon");
    const img = el("img");
    img.src = def.iconUrl;
    img.alt = "";
    img.draggable = false;
    icon.append(img);

    const info = el("div", "healer-trauma-info");
    info.append(el("p", "healer-trauma-name", trauma.name));
    info.append(
      el("p", "healer-trauma-desc", `Урон снижен на ${pct}%. Лечение снимает эффект сразу.`),
    );
    const timer = formatGlobalEffectTimer(effect.remaining);
    if (timer) {
      info.append(el("div", "healer-trauma-timer", `Осталось: ${timer}`));
    }

    const healBtn = el("button", "healer-heal-btn", `Вылечить (${trauma.healCost})`);
    healBtn.type = "button";
    const canAfford = stateRef.hero.gold >= trauma.healCost;
    healBtn.disabled = !canAfford;
    healBtn.addEventListener("click", () => {
      if (!stateRef) return;
      if (stateRef.hero.gold < trauma.healCost) {
        handlers.showToast("Не хватает золота");
        return;
      }
      stateRef.hero.gold -= trauma.healCost;
      stateRef.hero.globalEffects = clearTrauma(stateRef.hero.globalEffects);
      const time = advanceHours(stateRef, HOURS_PER_HEALER_SERVICE);
      handlers.showToast(
        time.daysAdvanced > 0
          ? `${trauma.name} вылечена. Новый день - торговцы обновили товар.`
          : `${trauma.name} вылечена`,
      );
      handlers.onChanged();
      render();
    });

    card.append(icon, info, healBtn);
    traumaHost.append(card);
  }

  function renderBuffCard(offer: HealerBuffOffer): HTMLElement {
    const def = globalEffectDef(offer.id);
    const card = el("div", "healer-buff-card");
    const top = el("div", "healer-buff-top");

    const icon = el("div", "healer-buff-icon");
    const img = el("img");
    img.src = def.iconUrl;
    img.alt = "";
    img.draggable = false;
    icon.append(img);

    const text = el("div", "healer-buff-text");
    text.append(el("p", "healer-buff-name", offer.name));
    text.append(el("p", "healer-buff-desc", offer.description));
    top.append(icon, text);

    const meta = el("div", "healer-buff-meta");
    const duration = el("span", "healer-buff-duration", formatDurationMin(offer.durationSec));
    meta.append(duration);

    const active = stateRef?.hero.globalEffects.find((e) => e.id === offer.id);
    if (active) {
      const left = formatGlobalEffectTimer(active.remaining);
      meta.append(el("span", "healer-buff-active", left ? `Активно: ${left}` : "Активно"));
    }

    meta.append(el("span", "healer-buff-price", `Цена: ${offer.price}`));

    const buyBtn = el("button", "healer-buy-btn");
    buyBtn.type = "button";
    buyBtn.textContent = active ? "Обновить" : "Купить";
    const canAfford = (stateRef?.hero.gold ?? 0) >= offer.price;
    buyBtn.disabled = !canAfford;
    buyBtn.addEventListener("click", () => {
      if (!stateRef) return;
      if (stateRef.hero.gold < offer.price) {
        handlers.showToast("Не хватает золота");
        return;
      }
      stateRef.hero.gold -= offer.price;
      stateRef.hero.globalEffects = grantOrRefreshHealerBuff(
        stateRef.hero.globalEffects,
        offer.id,
      );
      const time = advanceHours(stateRef, HOURS_PER_HEALER_SERVICE);
      const base = active ? `${offer.name}: время обновлено` : `${offer.name} получено`;
      handlers.showToast(
        time.daysAdvanced > 0 ? `${base}. Новый день - торговцы обновили товар.` : base,
      );
      handlers.onChanged();
      render();
    });

    card.append(top, meta, buyBtn);
    return card;
  }

  function renderBuffs(): void {
    buffsHost.replaceChildren();
    for (const offer of HEALER_BUFF_OFFERS) {
      buffsHost.append(renderBuffCard(offer));
    }
  }

  function render(): void {
    renderGold();
    renderTrauma();
    renderBuffs();
  }

  closeBtn.addEventListener("click", close);
  root.addEventListener("click", (ev) => {
    if (ev.target === root) close();
  });

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (root.hidden) return;
    if (ev.code === "Escape") {
      ev.preventDefault();
      close();
    }
  };

  return {
    show(state: GameState) {
      stateRef = state;
      root.hidden = false;
      render();
      window.addEventListener("keydown", onKeyDown);
    },
    hide() {
      root.hidden = true;
      stateRef = null;
      window.removeEventListener("keydown", onKeyDown);
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      root.remove();
    },
  };
}
