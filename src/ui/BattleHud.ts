import {
  abilityDisplayName,
  combatAbilityIdForRef,
  findAbilityCard,
  isPassiveAbilityRef,
  type AbilityCard,
} from "../abilities/catalog";
import { ABILITIES, ASPECT_HEX, describeAbility, zoneSecondaryDamage } from "../abilities/definitions";
import { mountCharacterSheet } from "./characterSheet";
import { mountInventoryWindow } from "./inventoryWindow";
import { mountItemGenerator } from "./itemGenerator";
import { mountItemIconPreview } from "./itemIconPreview";
import { mountStashWindow } from "./stashWindow";
import type { InventoryBag } from "../items/inventory";
import {
  potionIconUrl,
  POTION_HEAL_PCT,
  POTION_LABEL,
  type PotionId,
} from "../items/potions";
import type { ItemDef } from "../items/types";
import { ABILITY_ICON_URLS, EMPTY_SKILL_ICON_URL } from "../art/abilityIcons";
import type { Unit } from "../combat/Unit";
import type { AbilityId } from "../types";

/** Число ячеек панели способностей (2 ряда по 5). */
export const SKILL_BAR_SLOTS = 10;

/** Подписи горячих клавиш по слотам: 1-5, затем Q W E R T. */
export const SKILL_HOTKEY_LABELS = ["1", "2", "3", "4", "5", "Q", "W", "E", "R", "T"] as const;

/** KeyboardEvent.code для слотов панели. */
export const SKILL_HOTKEY_CODES = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
  "KeyT",
] as const;

const LONG_PRESS_MS = 450;
const HOVER_TOOLTIP_MQ = "(hover: hover) and (pointer: fine)";

export interface SkillBarState {
  selectedAbility: AbilityId | null;
  /** Оставшееся время ГКД в секундах. */
  gcdRemaining: number;
  /** Длительность ГКД (для визуала). */
  gcdDuration: number;
}

export interface PotionBarState {
  hpCount: number;
  manaCount: number;
  /** Общий КД зелий (сек). */
  cdRemaining: number;
  cdDuration: number;
}

export type BattleBannerMode = "start" | "pause" | "hidden";

/** Режим оболочки HUD: хаб прячет бойцовые контролы, title - стартовое меню. */
export type HudShellMode = "hub" | "battle" | "title";

export interface BattleHudApi {
  renderSkills(unit: Unit | null, state: SkillBarState): void;
  syncSkills(unit: Unit, state: SkillBarState): void;
  renderPotions(state: PotionBarState | null): void;
  syncPotions(state: PotionBarState): void;
  setOnUsePotion(fn: ((id: PotionId) => void) | null): void;
  setHint(text: string): void;
  showToast(text: string): void;
  /** Простой тултип у точки экрана (например кружок уровня на канвасе). */
  showScreenTooltip(clientX: number, clientY: number, title: string, desc: string): void;
  hideScreenTooltip(): void;
  setPause(paused: boolean): void;
  setSpeed(mult: number): void;
  setBattleBanner(mode: BattleBannerMode): void;
  setBattleBannerPosition(x: number, y: number): void;
  onStart(handler: () => void): void;
  setHero(hero: Unit): void;
  setCanChangeEquipment(fn: () => boolean): void;
  setOnEquipmentChanged(fn: () => void): void;
  setShellMode(mode: HudShellMode): void;
  openCharacter(): void;
  openInventory(): void;
  closeInventory(): void;
  isInventoryOpen(): boolean;
  toggleInventory(): void;
  /** Тайник: экип без портрета/статов + инвентарь + сетка 10×10. */
  openStash(bag: InventoryBag): void;
  isStashOpen(): boolean;
  /** Рынок: та же экип-кукла + сумка, без тайника. */
  openMarketSide(): void;
  setMarketMode(active: boolean): void;
  setOnMarketSell(fn: ((item: ItemDef, price: number) => void) | null): void;
  openBestiary(): void;
  openGrimoire(): void;
  openItemGenerator(): void;
  closeOverlays(): void;
  /** Когда закрыли персонажа/экип (чтобы спрятать рынок). */
  setOnPanelsClosed(fn: (() => void) | null): void;
}

export function createBattleHud(onSelectAbility: (id: AbilityId) => void): BattleHudApi {
  const combatBar = document.getElementById("hud-combat-bar")!;
  const skillBar = document.getElementById("skill-bar")!;
  const potionBar = document.getElementById("potion-bar")!;
  const potionHpBtn = document.getElementById("potion-hp") as HTMLButtonElement;
  const potionManaBtn = document.getElementById("potion-mana") as HTMLButtonElement;
  const toast = document.getElementById("toast")!;
  const btnPause = document.getElementById("btn-pause")!;
  const btnSpeed = document.getElementById("btn-speed")!;
  const btnStart = document.getElementById("btn-start")!;
  const pauseLabel = document.getElementById("battle-pause-label")!;
  const battleBanner = document.getElementById("battle-banner")!;
  const menuBtn = document.getElementById("btn-menu")!;
  const sideMenu = document.getElementById("side-menu")!;
  let toastTimer = 0;
  let startHandler: (() => void) | null = null;
  let onUsePotion: ((id: PotionId) => void) | null = null;

  const potionBtnById = {
    healing_potion: potionHpBtn,
    mana_potion: potionManaBtn,
  } as const;

  for (const [id, btn] of Object.entries(potionBtnById)) {
    const potionId = id as PotionId;
    const img = btn.querySelector<HTMLImageElement>(".potion-icon");
    if (img) img.src = potionIconUrl(potionId);
    btn.addEventListener("click", () => onUsePotion?.(potionId));
  }

  const applyPotionVisual = (btn: HTMLButtonElement, count: number, cd: number): void => {
    const countEl = btn.querySelector(".potion-count");
    if (countEl) countEl.textContent = String(count);
    const onCd = cd > 0;
    const empty = count <= 0;
    btn.disabled = empty || onCd;
    btn.classList.toggle("is-empty", empty);
    btn.classList.toggle("on-cd", onCd);
    let overlay = btn.querySelector<HTMLElement>(".potion-cd");
    if (onCd) {
      if (!overlay) {
        overlay = document.createElement("span");
        overlay.className = "potion-cd";
        btn.append(overlay);
      }
      overlay.textContent = String(Math.ceil(cd));
    } else {
      overlay?.remove();
    }
  };

  const renderPotions = (state: PotionBarState | null): void => {
    if (!state) {
      applyPotionVisual(potionHpBtn, 0, 0);
      applyPotionVisual(potionManaBtn, 0, 0);
      return;
    }
    applyPotionVisual(potionHpBtn, state.hpCount, state.cdRemaining);
    applyPotionVisual(potionManaBtn, state.manaCount, state.cdRemaining);
  };

  const syncPotions = (state: PotionBarState): void => {
    applyPotionVisual(potionHpBtn, state.hpCount, state.cdRemaining);
    applyPotionVisual(potionManaBtn, state.manaCount, state.cdRemaining);
  };

  const setBattleBanner = (mode: BattleBannerMode): void => {
    btnStart.hidden = mode !== "start";
    pauseLabel.hidden = mode !== "pause";
    battleBanner.hidden = mode === "hidden";
  };

  // Стартуем в title-режиме: баннер боя включается только из Battle
  setBattleBanner("hidden");
  btnStart.addEventListener("click", () => startHandler?.());

  const tooltip = document.createElement("div");
  tooltip.id = "skill-tooltip";
  tooltip.className = "skill-tooltip";
  tooltip.hidden = true;
  document.getElementById("hud")!.appendChild(tooltip);

  const hideTooltip = (): void => {
    tooltip.hidden = true;
  };

  const placeTooltip = (anchor: HTMLElement): void => {
    const rect = anchor.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
    const top = rect.top - tipRect.height - 10;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
  };

  const passiveLabelHtml = (passive: boolean): string =>
    passive ? `<div class="tt-passive">Пассивное</div>` : "";

  const showTooltip = (btn: HTMLElement, id: AbilityId): void => {
    const def = ABILITIES[id];
    const reachLabel = def.reach <= 0 ? "на себя" : `${def.reach}`;
    const damageLabel =
      def.damage > 0
        ? def.targetMode === "zone"
          ? `${def.damage} / выше ${zoneSecondaryDamage(def)}`
          : String(def.damage)
        : "-";
    const passive = def.targetMode === "passive";

    tooltip.className = `skill-tooltip aspect-${def.aspect}`;
    tooltip.style.setProperty("--aspect-color", ASPECT_HEX[def.aspect]);
    tooltip.innerHTML = `
      <div class="tt-name">${def.name}</div>
      ${passiveLabelHtml(passive)}
      <div class="tt-desc">${describeAbility(def)}</div>
      <div class="tt-stats">
        <div class="tt-stat"><span>Урон</span><b>${damageLabel}</b></div>
        <div class="tt-stat"><span>Кулдаун</span><b>${def.cooldown.toFixed(1)} с</b></div>
        <div class="tt-stat"><span>Радиус</span><b>${reachLabel}</b></div>
      </div>
    `;
    tooltip.hidden = false;
    placeTooltip(btn);
  };

  const showCardTooltip = (anchor: HTMLElement, card: AbilityCard): void => {
    const aspectColor =
      ASPECT_HEX[card.aspectId as keyof typeof ASPECT_HEX] ?? "#c45a4a";
    const cd = card.cooldown?.trim() || "-";
    tooltip.className = `skill-tooltip aspect-${card.aspectId || "enemies"}`;
    tooltip.style.setProperty("--aspect-color", aspectColor);
    tooltip.innerHTML = `
      <div class="tt-name">${card.name}</div>
      ${passiveLabelHtml(isPassiveAbilityRef(card.id))}
      <div class="tt-desc">${card.description || "-"}</div>
      <div class="tt-stats">
        <div class="tt-stat"><span>Кулдаун</span><b>${cd}</b></div>
      </div>
    `;
    tooltip.hidden = false;
    placeTooltip(anchor);
  };

  const showAbilityRefTooltip = (anchor: HTMLElement, ref: string): void => {
    const combatId = combatAbilityIdForRef(ref);
    if (combatId) {
      showTooltip(anchor, combatId);
      return;
    }
    const card = findAbilityCard(ref);
    if (card) {
      showCardTooltip(anchor, card);
      return;
    }
    tooltip.className = "skill-tooltip";
    tooltip.style.removeProperty("--aspect-color");
    tooltip.innerHTML = `
      <div class="tt-name">${abilityDisplayName(ref)}</div>
      ${passiveLabelHtml(isPassiveAbilityRef(ref))}
      <div class="tt-desc">Нет описания способности.</div>
    `;
    tooltip.hidden = false;
    placeTooltip(anchor);
  };

  const canHoverTooltip = (): boolean => window.matchMedia(HOVER_TOOLTIP_MQ).matches;

  const showPotionTooltip = (btn: HTMLButtonElement, potionId: PotionId): void => {
    const hotkey = potionId === "healing_potion" ? "F" : "G";
    const count = Number(btn.querySelector(".potion-count")?.textContent ?? "0");
    const pct = Math.round(POTION_HEAL_PCT * 100);
    const effect =
      potionId === "healing_potion"
        ? `Восстанавливает ${pct}% макс. здоровья`
        : `Восстанавливает ${pct}% макс. маны`;
    tooltip.className = "skill-tooltip";
    tooltip.style.removeProperty("--aspect-color");
    tooltip.innerHTML = `
      <div class="tt-name">${POTION_LABEL[potionId]} (${hotkey})</div>
      <div class="tt-desc">${effect}. В поясе: ${count}. Общий КД 10 с.</div>
    `;
    tooltip.hidden = false;
    placeTooltip(btn);
  };

  for (const [id, btn] of Object.entries(potionBtnById)) {
    const potionId = id as PotionId;
    btn.addEventListener("mouseenter", () => {
      if (!canHoverTooltip()) return;
      showPotionTooltip(btn, potionId);
    });
    btn.addEventListener("mouseleave", () => {
      if (!canHoverTooltip()) return;
      hideTooltip();
    });
  }

  const bindSkillTooltip = (btn: HTMLButtonElement, id: AbilityId): void => {
    let longPressTimer = 0;
    let longPressActive = false;
    let suppressClick = false;

    const clearLongPress = (): void => {
      window.clearTimeout(longPressTimer);
      longPressTimer = 0;
    };

    btn.addEventListener("click", (ev) => {
      if (suppressClick) {
        ev.preventDefault();
        suppressClick = false;
        return;
      }
      onSelectAbility(id);
    });

    // Десктоп: тултип по наведению / фокусу. На таче hover/focus часто срабатывают от короткого тапа.
    btn.addEventListener("mouseenter", () => {
      if (!canHoverTooltip()) return;
      showTooltip(btn, id);
    });
    btn.addEventListener("mouseleave", () => {
      if (!canHoverTooltip()) return;
      hideTooltip();
    });
    btn.addEventListener("focus", () => {
      if (!canHoverTooltip()) return;
      showTooltip(btn, id);
    });
    btn.addEventListener("blur", () => {
      if (!canHoverTooltip()) return;
      hideTooltip();
    });

    btn.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType !== "touch") return;
      clearLongPress();
      longPressActive = false;
      suppressClick = false;
      longPressTimer = window.setTimeout(() => {
        longPressActive = true;
        suppressClick = true;
        showTooltip(btn, id);
      }, LONG_PRESS_MS);
    });

    const endTouchPress = (ev: PointerEvent): void => {
      if (ev.pointerType !== "touch") return;
      clearLongPress();
      if (longPressActive) {
        hideTooltip();
        longPressActive = false;
      }
    };

    btn.addEventListener("pointerup", endTouchPress);
    btn.addEventListener("pointercancel", endTouchPress);
    btn.addEventListener("pointerleave", (ev) => {
      if (ev.pointerType !== "touch") return;
      clearLongPress();
      if (longPressActive) {
        hideTooltip();
        longPressActive = false;
      }
    });
  };

  const applySkillVisual = (
    btn: HTMLButtonElement,
    unit: Unit,
    id: AbilityId,
    state: SkillBarState,
  ): void => {
    const cd = unit.abilityCd[id] ?? 0;
    const onCd = cd > 0.05;
    const onGcd = state.gcdRemaining > 0.02;
    const unavailable = !unit.alive || onCd || onGcd;
    btn.setAttribute("aria-disabled", unavailable ? "true" : "false");
    // opacity.locked только для мёртвого героя - иначе цифра CD тоже тускнеет
    btn.classList.toggle("locked", !unit.alive);
    btn.classList.toggle("on-cd", onCd);
    btn.classList.toggle("selected", state.selectedAbility === id);
    btn.classList.toggle("on-gcd", onGcd);

    let gcdOverlay = btn.querySelector<HTMLElement>(".gcd-overlay");
    if (onGcd) {
      if (!gcdOverlay) {
        gcdOverlay = document.createElement("span");
        gcdOverlay.className = "gcd-overlay";
        btn.appendChild(gcdOverlay);
      }
      const ratio =
        state.gcdDuration > 0 ? Math.min(1, state.gcdRemaining / state.gcdDuration) : 0;
      gcdOverlay.style.setProperty("--gcd", String(ratio));
    } else {
      gcdOverlay?.remove();
    }

    let overlay = btn.querySelector<HTMLElement>(".cd-overlay");
    if (onCd) {
      if (!overlay) {
        overlay = document.createElement("span");
        overlay.className = "cd-overlay";
        btn.appendChild(overlay);
      }
      overlay.textContent = String(Math.ceil(cd));
    } else {
      overlay?.remove();
    }
  };

  const renderSkills = (unit: Unit | null, state: SkillBarState): void => {
    skillBar.innerHTML = "";
    hideTooltip();
    if (!unit) return;

    for (let slot = 0; slot < SKILL_BAR_SLOTS; slot++) {
      const id = unit.abilities[slot];
      const hotkey = SKILL_HOTKEY_LABELS[slot] ?? "";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-btn";
      btn.dataset.slot = String(slot);

      const hotkeyEl = document.createElement("span");
      hotkeyEl.className = "skill-hotkey";
      hotkeyEl.textContent = hotkey;
      hotkeyEl.setAttribute("aria-hidden", "true");

      if (!id) {
        btn.className = "skill-btn empty has-art";
        btn.disabled = true;
        btn.setAttribute("aria-label", `Пустой слот ${hotkey}`);
        btn.innerHTML = `<img class="skill-icon" src="${EMPTY_SKILL_ICON_URL}" alt="" draggable="false" />`;
        btn.appendChild(hotkeyEl);
        skillBar.appendChild(btn);
        continue;
      }

      const def = ABILITIES[id];
      const iconUrl = ABILITY_ICON_URLS[id];
      btn.dataset.ability = id;
      btn.className = `skill-btn aspect-${def.aspect}${iconUrl ? " has-art" : ""}`;
      btn.style.setProperty("--aspect-color", ASPECT_HEX[def.aspect]);
      btn.setAttribute("aria-label", `${def.name}, клавиша ${hotkey}`);
      btn.innerHTML = iconUrl
        ? `<img class="skill-icon" src="${iconUrl}" alt="" draggable="false" />`
        : `<span class="glyph">${def.glyph}</span>`;
      btn.appendChild(hotkeyEl);
      applySkillVisual(btn, unit, id, state);
      bindSkillTooltip(btn, id);
      skillBar.appendChild(btn);
    }
  };

  const syncSkills = (unit: Unit, state: SkillBarState): void => {
    const buttons = [...skillBar.querySelectorAll<HTMLButtonElement>("button.skill-btn")];
    if (buttons.length !== SKILL_BAR_SLOTS) {
      renderSkills(unit, state);
      return;
    }
    for (let slot = 0; slot < SKILL_BAR_SLOTS; slot++) {
      const btn = buttons[slot];
      const id = unit.abilities[slot];
      if (!btn) return;
      if (!id) {
        if (!btn.classList.contains("empty") || btn.dataset.ability) {
          renderSkills(unit, state);
          return;
        }
        continue;
      }
      if (btn.dataset.ability !== id || btn.classList.contains("empty")) {
        renderSkills(unit, state);
        return;
      }
      applySkillVisual(btn, unit, id, state);
    }
  };

  const closeMenu = (): void => {
    sideMenu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  };
  const pushToast = (text: string): void => {
    toast.hidden = false;
    toast.textContent = text;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 1400);
  };

  type PanelId = "character" | "item-generator";

  let character!: ReturnType<typeof mountCharacterSheet>;
  let itemGenerator!: ReturnType<typeof mountItemGenerator>;

  /** Перед открытием панели закрывает остальные (хоткеи и меню переключают окна). */
  const prepareOpen = (except: PanelId): void => {
    hideTooltip();
    closeMenu();
    if (except !== "character" && character.isOpen()) character.close();
    if (except !== "item-generator" && itemGenerator.isOpen()) itemGenerator.close();
  };

  character = mountCharacterSheet(() => prepareOpen("character"));
  const inventory = mountInventoryWindow();
  const stash = mountStashWindow();
  let heroRef: Unit | null = null;
  inventory.setShowToast(pushToast);
  character.setShowToast(pushToast);
  let onPanelsClosed: (() => void) | null = null;

  character.setOnVisibilityChange((open) => {
    if (open) {
      inventory.open();
    } else {
      inventory.close();
      inventory.setStashBag(null);
      inventory.setMarketMode(false);
      stash.close();
      onPanelsClosed?.();
    }
  });
  character.setOnModeChange((mode) => {
    if (mode === "full") {
      inventory.setStashBag(null);
      inventory.setMarketMode(false);
      stash.close();
    }
  });
  inventory.setOnStashChanged(() => {
    stash.refresh();
  });
  itemGenerator = mountItemGenerator(() => prepareOpen("item-generator"));
  itemGenerator.setShowToast(pushToast);
  itemGenerator.setBestiaryTooltips({
    showAbilityRef: showAbilityRefTooltip,
    hideAbilityRef: hideTooltip,
    canHoverAbilityRef: canHoverTooltip,
  });
  mountItemIconPreview();

  const refreshGearUi = (): void => {
    if (!heroRef) return;
    character.setHero(heroRef);
    inventory.setHero(heroRef);
    stash.refresh();
  };

  itemGenerator.setOnInventoryChanged(refreshGearUi);

  const openMenu = (): void => {
    sideMenu.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
  };

  menuBtn.addEventListener("click", () => {
    if (sideMenu.hidden) openMenu();
    else closeMenu();
  });

  const toggleDevPanelTab = (tab: "bestiary" | "grimoire"): void => {
    if (itemGenerator.isOpen() && itemGenerator.getActiveTab() === tab) {
      itemGenerator.close();
    } else {
      itemGenerator.openTab(tab);
    }
  };

  document.addEventListener("pointerdown", (ev) => {
    if (sideMenu.hidden) return;
    const target = ev.target;
    if (!(target instanceof Node)) return;
    if (sideMenu.contains(target) || menuBtn.contains(target)) return;
    closeMenu();
  });
  window.addEventListener("keydown", (ev) => {
    const target = ev.target;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;

    if (!typing && !ev.repeat && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (ev.code === "KeyH") {
        ev.preventDefault();
        toggleDevPanelTab("bestiary");
        return;
      }
      if (ev.code === "KeyV") {
        ev.preventDefault();
        toggleDevPanelTab("grimoire");
        return;
      }
    }

    if (ev.code !== "Escape") return;
    if (itemGenerator.isOpen()) {
      if (!itemGenerator.handleEscape()) itemGenerator.close();
      return;
    }
    if (character.isOpen()) {
      character.close();
      return;
    }
    closeMenu();
  });

  return {
    renderSkills,
    syncSkills,
    renderPotions,
    syncPotions,
    setOnUsePotion(fn) {
      onUsePotion = fn;
    },

    setHint(text: string) {
      void text;
    },

    showToast(text: string) {
      pushToast(text);
    },

    showScreenTooltip(clientX: number, clientY: number, title: string, desc: string) {
      if (!canHoverTooltip()) return;
      tooltip.className = "skill-tooltip";
      tooltip.style.removeProperty("--aspect-color");
      tooltip.innerHTML = `
        <div class="tt-name">${title}</div>
        <div class="tt-desc">${desc}</div>
      `;
      tooltip.hidden = false;
      const tipRect = tooltip.getBoundingClientRect();
      let left = clientX - tipRect.width / 2;
      left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
      let top = clientY - tipRect.height - 12;
      if (top < 8) top = clientY + 16;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    },

    hideScreenTooltip() {
      hideTooltip();
    },

    setPause(paused: boolean) {
      btnPause.textContent = paused ? "▶" : "❚❚";
      btnPause.classList.toggle("active", paused);
      btnPause.setAttribute(
        "aria-label",
        paused ? "Пробел - продолжить" : "Пробел - пауза",
      );
    },

    setSpeed(mult: number) {
      btnSpeed.textContent = `×${mult}`;
      btnSpeed.classList.toggle("active", mult > 1);
    },

    setBattleBanner,

    setBattleBannerPosition(x: number, y: number) {
      battleBanner.style.left = `${x}px`;
      battleBanner.style.top = `${y}px`;
    },

    onStart(handler: () => void) {
      startHandler = handler;
    },

    setHero(hero: Unit) {
      heroRef = hero;
      character.setHero(hero);
      inventory.setHero(hero);
      itemGenerator.setHero(hero);
    },

    setCanChangeEquipment(fn) {
      inventory.setCanChangeEquipment(fn);
      character.setCanChangeEquipment(fn);
    },

    setOnEquipmentChanged(fn) {
      const notify = (): void => {
        fn();
        refreshGearUi();
      };
      inventory.setOnEquipmentChanged(notify);
      character.setOnEquipmentChanged(notify);
    },

    setShellMode(mode: HudShellMode) {
      const battle = mode === "battle";
      const title = mode === "title";
      const hub = mode === "hub";
      const controls = document.querySelector(".controls") as HTMLElement | null;
      const hudTop = document.querySelector(".hud-top") as HTMLElement | null;
      if (controls) controls.hidden = !battle;
      if (hudTop) hudTop.hidden = title || hub;
      menuBtn.hidden = title || hub;
      if (title || hub) closeMenu();
      combatBar.hidden = !battle;
      potionBar.hidden = !battle;
      if (!battle) {
        setBattleBanner("hidden");
        renderSkills(null, { selectedAbility: null, gcdRemaining: 0, gcdDuration: 1 });
        renderPotions(null);
      }
    },

    openCharacter() {
      prepareOpen("character");
      inventory.setStashBag(null);
      inventory.setMarketMode(false);
      stash.close();
      character.setMode("full");
      character.open();
    },

    openInventory() {
      inventory.open();
    },

    closeInventory() {
      inventory.close();
    },

    isInventoryOpen() {
      return inventory.isOpen();
    },

    toggleInventory() {
      if (inventory.isOpen()) inventory.close();
      else inventory.open();
    },

    openStash(bag) {
      prepareOpen("character");
      inventory.setMarketMode(false);
      inventory.setStashBag(bag);
      stash.setBag(bag);
      character.setMode("gear");
      character.open();
      stash.open();
    },

    isStashOpen() {
      return stash.isOpen();
    },

    openMarketSide() {
      prepareOpen("character");
      inventory.setStashBag(null);
      stash.close();
      inventory.setMarketMode(true);
      character.setMode("gear");
      character.open();
    },

    setMarketMode(active) {
      inventory.setMarketMode(active);
    },

    setOnMarketSell(fn) {
      inventory.setOnMarketSell(fn);
    },

    setOnPanelsClosed(fn) {
      onPanelsClosed = fn;
    },

    openBestiary() {
      itemGenerator.openTab("bestiary");
    },

    openGrimoire() {
      itemGenerator.openTab("grimoire");
    },

    openItemGenerator() {
      itemGenerator.open();
    },

    closeOverlays() {
      hideTooltip();
      character.close();
      inventory.close();
      inventory.setStashBag(null);
      inventory.setMarketMode(false);
      stash.close();
      if (itemGenerator.isOpen()) itemGenerator.close();
      closeMenu();
    },
  };
}
