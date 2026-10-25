import {
  abilityDisplayName,
  abilityIconUrlForRef,
  combatAbilityIdForRef,
  findAbilityCard,
  type AbilityCard,
} from "../abilities/catalog";
import { ABILITIES, ASPECT_HEX, describeAbility, zoneSecondaryDamage } from "../abilities/definitions";
import { mountCharacterSheet } from "./characterSheet";
import { mountGrimoire } from "./grimoire";
import { mountInventoryWindow } from "./inventoryWindow";
import { mountItemGenerator } from "./itemGenerator";
import { mountStashWindow } from "./stashWindow";
import type { InventoryBag } from "../items/inventory";
import type { ItemDef } from "../items/types";
import { ABILITY_ICON_URLS, EMPTY_SKILL_ICON_URL } from "../art/abilityIcons";
import { enemyPortraitUrl, loadEnemyCards, type EnemyCard } from "../combat/enemyCatalog";
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

export type BattleBannerMode = "start" | "pause" | "hidden";

/** Режим оболочки HUD: хаб прячет бойцовые контролы, title - стартовое меню. */
export type HudShellMode = "hub" | "battle" | "title";

export interface BattleHudApi {
  renderSkills(unit: Unit | null, state: SkillBarState): void;
  syncSkills(unit: Unit, state: SkillBarState): void;
  setHint(text: string): void;
  showToast(text: string): void;
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
  const skillBar = document.getElementById("skill-bar")!;
  const toast = document.getElementById("toast")!;
  const btnPause = document.getElementById("btn-pause")!;
  const btnSpeed = document.getElementById("btn-speed")!;
  const btnStart = document.getElementById("btn-start")!;
  const pauseLabel = document.getElementById("battle-pause-label")!;
  const battleBanner = document.getElementById("battle-banner")!;
  const menuBtn = document.getElementById("btn-menu")!;
  const sideMenu = document.getElementById("side-menu")!;
  const bestiaryBtn = document.getElementById("btn-bestiary")!;
  const bestiary = document.getElementById("bestiary")!;
  const bestiaryList = document.getElementById("bestiary-list")!;
  const bestiaryDetail = document.getElementById("bestiary-detail")!;
  const bestiaryClose = document.getElementById("bestiary-close")!;
  const bestiaryFilterGroup = document.getElementById("bestiary-filter-group") as HTMLSelectElement;
  const bestiaryFilterLevel = document.getElementById("bestiary-filter-level") as HTMLSelectElement;
  const bestiaryFilterRegion = document.getElementById("bestiary-filter-region") as HTMLSelectElement;
  const bestiaryFilterReset = document.getElementById("bestiary-filter-reset")!;

  let toastTimer = 0;
  let startHandler: (() => void) | null = null;

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

  const showTooltip = (btn: HTMLElement, id: AbilityId): void => {
    const def = ABILITIES[id];
    const reachLabel = def.reach <= 0 ? "на себя" : `${def.reach}`;
    const damageLabel =
      def.damage > 0
        ? def.targetMode === "zone"
          ? `${def.damage} / выше ${zoneSecondaryDamage(def)}`
          : String(def.damage)
        : "-";

    tooltip.className = `skill-tooltip aspect-${def.aspect}`;
    tooltip.style.setProperty("--aspect-color", ASPECT_HEX[def.aspect]);
    tooltip.innerHTML = `
      <div class="tt-name">${def.name}</div>
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
      <div class="tt-desc">Нет описания способности.</div>
    `;
    tooltip.hidden = false;
    placeTooltip(anchor);
  };

  const canHoverTooltip = (): boolean => window.matchMedia(HOVER_TOOLTIP_MQ).matches;

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

  type PanelId = "character" | "grimoire" | "bestiary" | "item-generator";

  let character!: ReturnType<typeof mountCharacterSheet>;
  let grimoire!: ReturnType<typeof mountGrimoire>;
  let itemGenerator!: ReturnType<typeof mountItemGenerator>;

  /** Перед открытием панели закрывает остальные (хоткеи и меню переключают окна). */
  const prepareOpen = (except: PanelId): void => {
    hideTooltip();
    closeMenu();
    if (except !== "character" && character.isOpen()) character.close();
    if (except !== "grimoire" && grimoire.isOpen()) grimoire.close();
    if (except !== "bestiary") bestiary.hidden = true;
    if (except !== "item-generator" && itemGenerator.isOpen()) itemGenerator.close();
  };

  grimoire = mountGrimoire(() => prepareOpen("grimoire"));
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

  const showDetail = (card: EnemyCard): void => {
    hideTooltip();
    bestiaryDetail.replaceChildren();
    const portrait = document.createElement("img");
    portrait.className = "bestiary-detail-portrait";
    portrait.src = enemyPortraitUrl(card);
    portrait.alt = card.name;
    const title = document.createElement("div");
    title.className = "bestiary-detail-name";
    title.textContent = card.name;
    const portraitId = document.createElement("div");
    portraitId.className = "grimoire-icon-id";
    portraitId.textContent = card.portrait;
    const status = document.createElement("span");
    const statusLabel = displayEnemyStatus(card.status);
    status.className = `grimoire-status${enemyStatusClass(statusLabel)}`;
    status.textContent = statusLabel;
    bestiaryDetail.append(
      portrait,
      title,
      portraitId,
      status,
      statLine("Уровень", String(card.baseLevel)),
      statLine("Здоровье", String(card.hp)),
      statLine("Урон", String(card.atk)),
      statLine("Кулдаун", card.cd),
      statLine("Дистанция", String(card.reach)),
      statLine("Появление", card.spawnRowsLabel),
    );
    if (card.group) bestiaryDetail.append(statLine("Группа", card.group));
    if (card.region) bestiaryDetail.append(statLine("Регион", card.region));
    if (card.abilities && card.abilities !== "-" && card.abilities !== "нет") {
      const refs = card.abilities
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part && part !== "-" && part !== "нет");
      if (refs.length) {
        bestiaryDetail.append(abilityIconsRow(refs, showAbilityRefTooltip, hideTooltip, canHoverTooltip));
      }
    }
    if (card.description) {
      const desc = document.createElement("div");
      desc.className = "bestiary-desc";
      const label = document.createElement("span");
      label.className = "bestiary-desc-label";
      label.textContent = "Описание";
      const text = document.createElement("div");
      text.className = "bestiary-desc-text";
      text.textContent = card.description;
      desc.append(label, text);
      bestiaryDetail.append(desc);
    }
  };

  const clearDetail = (): void => {
    hideTooltip();
    bestiaryDetail.textContent = "Выберите врага, чтобы увидеть характеристики.";
  };

  const fillSelectOptions = (
    select: HTMLSelectElement,
    values: string[],
    allLabel: string,
  ): void => {
    const prev = select.value;
    select.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel;
    select.append(all);
    for (const value of values) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.append(opt);
    }
    select.value = values.includes(prev) ? prev : "";
  };

  const syncBestiaryFilterOptions = (): void => {
    const cards = loadEnemyCards();
    const groups = [...new Set(cards.map((c) => c.group).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ru"),
    );
    const levels = [...new Set(cards.map((c) => String(c.baseLevel)))].sort(
      (a, b) => Number(a) - Number(b),
    );
    const regions = [...new Set(cards.map((c) => c.region).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ru"),
    );
    fillSelectOptions(bestiaryFilterGroup, groups, "Все");
    fillSelectOptions(bestiaryFilterLevel, levels, "Все");
    fillSelectOptions(bestiaryFilterRegion, regions, "Все");
  };

  const filteredEnemyCards = (): EnemyCard[] => {
    const group = bestiaryFilterGroup.value;
    const level = bestiaryFilterLevel.value;
    const region = bestiaryFilterRegion.value;
    return loadEnemyCards().filter((card) => {
      if (group && card.group !== group) return false;
      if (level && String(card.baseLevel) !== level) return false;
      if (region && card.region !== region) return false;
      return true;
    });
  };

  const fillBestiary = (): void => {
    syncBestiaryFilterOptions();
    bestiaryList.replaceChildren();
    for (const card of filteredEnemyCards()) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "bestiary-row";
      const img = document.createElement("img");
      img.src = enemyPortraitUrl(card);
      img.alt = card.name;
      const text = document.createElement("span");
      text.className = "bestiary-copy";
      const name = document.createElement("span");
      name.className = "bestiary-name";
      name.textContent = card.name;
      const status = document.createElement("span");
      const statusLabel = displayEnemyStatus(card.status);
      status.className = `grimoire-status${enemyStatusClass(statusLabel)}`;
      status.textContent = statusLabel;
      const type = document.createElement("span");
      type.className = "bestiary-type";
      type.textContent = `уровень ${card.baseLevel}`;
      text.append(name, status, type);
      row.append(img, text);
      row.addEventListener("click", () => {
        for (const other of bestiaryList.querySelectorAll(".bestiary-row")) {
          other.classList.remove("active");
        }
        row.classList.add("active");
        showDetail(card);
      });
      bestiaryList.append(row);
    }
    clearDetail();
  };

  const onBestiaryFilterChange = (): void => {
    fillBestiary();
  };

  bestiaryFilterGroup.addEventListener("change", onBestiaryFilterChange);
  bestiaryFilterLevel.addEventListener("change", onBestiaryFilterChange);
  bestiaryFilterRegion.addEventListener("change", onBestiaryFilterChange);
  bestiaryFilterReset.addEventListener("click", () => {
    bestiaryFilterGroup.value = "";
    bestiaryFilterLevel.value = "";
    bestiaryFilterRegion.value = "";
    fillBestiary();
  });

  menuBtn.addEventListener("click", () => {
    if (sideMenu.hidden) openMenu();
    else closeMenu();
  });
  const openBestiary = (): void => {
    prepareOpen("bestiary");
    fillBestiary();
    bestiary.hidden = false;
  };

  bestiaryBtn.addEventListener("click", () => {
    openBestiary();
  });
  bestiaryClose.addEventListener("click", () => {
    hideTooltip();
    bestiary.hidden = true;
  });
  bestiary.addEventListener("click", (ev) => {
    if (ev.target === bestiary) {
      hideTooltip();
      bestiary.hidden = true;
    }
  });
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
        if (bestiary.hidden) openBestiary();
        else bestiary.hidden = true;
        return;
      }
      if (ev.code === "KeyV") {
        ev.preventDefault();
        if (grimoire.isOpen()) grimoire.close();
        else grimoire.open();
        return;
      }
    }

    if (ev.code !== "Escape") return;
    if (itemGenerator.isOpen()) {
      itemGenerator.close();
      return;
    }
    if (character.isOpen()) {
      character.close();
      return;
    }
    if (grimoire.isOpen()) {
      if (!grimoire.back()) grimoire.close();
      return;
    }
    if (!bestiary.hidden) {
      bestiary.hidden = true;
      return;
    }
    closeMenu();
  });

  return {
    renderSkills,
    syncSkills,

    setHint(text: string) {
      void text;
    },

    showToast(text: string) {
      pushToast(text);
    },

    setPause(paused: boolean) {
      btnPause.textContent = paused ? "▶" : "❚❚";
      btnPause.classList.toggle("active", paused);
      btnPause.title = paused ? "Пробел - продолжить" : "Пробел - пауза";
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
      skillBar.hidden = !battle;
      if (!battle) {
        setBattleBanner("hidden");
        renderSkills(null, { selectedAbility: null, gcdRemaining: 0, gcdDuration: 1 });
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
      openBestiary();
    },

    openGrimoire() {
      grimoire.open();
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
      if (grimoire.isOpen()) grimoire.close();
      bestiary.hidden = true;
      closeMenu();
    },
  };
}

function statLine(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "bestiary-stat";
  const name = document.createElement("span");
  name.textContent = label;
  const val = document.createElement("b");
  val.textContent = value;
  row.append(name, val);
  return row;
}

function abilityIconsRow(
  refs: string[],
  showTip: (anchor: HTMLElement, ref: string) => void,
  hideTip: () => void,
  canHover: () => boolean,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "bestiary-stat bestiary-abilities-row";
  const label = document.createElement("span");
  label.textContent = "Способности";
  const icons = document.createElement("div");
  icons.className = "bestiary-ability-icons";

  for (const ref of refs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skill-btn has-art bestiary-ability-icon";
    btn.setAttribute("aria-label", abilityDisplayName(ref));
    const img = document.createElement("img");
    img.className = "skill-icon";
    img.src = abilityIconUrlForRef(ref);
    img.alt = "";
    img.draggable = false;
    btn.append(img);

    btn.addEventListener("mouseenter", () => {
      if (!canHover()) return;
      showTip(btn, ref);
    });
    btn.addEventListener("mouseleave", () => {
      if (!canHover()) return;
      hideTip();
    });
    btn.addEventListener("focus", () => {
      if (!canHover()) return;
      showTip(btn, ref);
    });
    btn.addEventListener("blur", () => {
      if (!canHover()) return;
      hideTip();
    });

    icons.append(btn);
  }

  row.append(label, icons);
  return row;
}

function displayEnemyStatus(status: string): string {
  if (status === "прототип" || status === "взято") return "одобрено";
  return status;
}

function enemyStatusClass(status: string): string {
  if (status === "черновик") return " draft";
  if (status === "одобрено") return " approved";
  if (status === "отказ") return " rejected";
  if (status === "под вопросом") return " review";
  return "";
}
