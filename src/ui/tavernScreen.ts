import { ABILITIES, ASPECT_HEX, ASPECT_LABEL, describeAbility } from "../abilities/definitions";
import { ABILITY_ICON_URLS, EMPTY_SKILL_ICON_URL } from "../art/abilityIcons";
import type { Unit } from "../combat/Unit";
import { globalEffectDef } from "../effects/globalEffects";
import type { GameState } from "../meta/gameState";
import {
  applyAbilityLoadout,
  availableLoadoutAbilities,
  buyRumor,
  canSleepInTavern,
  ensureTavernDay,
  isFireplaceResting,
  loadoutSlotCaps,
  RUMOR_COST,
  RUMOR_MAX_PER_DAY,
  rumorsLeftToday,
  secondaryAspectOf,
  sleepInTavernRoom,
  startFireplaceRest,
  stopFireplaceRest,
  TAVERN_SLEEP_COST,
  validateAbilityLoadout,
  type TavernTabId,
} from "../meta/tavern";
import { formatWorldClock, phaseFromHour, phaseLabelRu } from "../meta/worldTime";
import type { AbilityId, Aspect } from "../types";
import { goldAmountNode } from "./goldIcon";
import "./tavernScreen.css";

export interface TavernScreenApi {
  show(state: GameState, unit: Unit | null): void;
  hide(): void;
  isOpen(): boolean;
  refresh(unit?: Unit | null): void;
  destroy(): void;
}

export interface TavernScreenHandlers {
  onClose: () => void;
  onChanged: () => void;
  onSlept: () => void;
  onLoadoutChanged: () => void;
  showToast: (text: string) => void;
  onFireplaceChanged: () => void;
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

const TABS: { id: TavernTabId; label: string }[] = [
  { id: "rumors", label: "Слухи" },
  { id: "sleep", label: "Номер" },
  { id: "fireplace", label: "Камин" },
  { id: "loadout", label: "Комната подготовки" },
];

function hotkeyLabel(index: number): string {
  return index === 9 ? "0" : String(index + 1);
}

export function mountTavernScreen(handlers: TavernScreenHandlers): TavernScreenApi {
  const root = el("div", "tavern-overlay");
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "tavern-title");

  const win = el("div", "tavern-window");

  const closeBtn = el("button", "tavern-x");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.innerHTML = '<span aria-hidden="true"></span>';

  const head = el("div", "tavern-head");
  const title = el("h2", "tavern-title", "Таверна");
  title.id = "tavern-title";
  const subtitle = el(
    "p",
    "tavern-subtitle",
    "Слухи, отдых и подготовка перед вылазкой",
  );
  const goldLine = el("div", "tavern-gold");
  const clockLine = el("div", "tavern-clock");
  head.append(title, subtitle, goldLine, clockLine);

  const tabsRow = el("div", "tavern-tabs");
  const tabButtons = new Map<TavernTabId, HTMLButtonElement>();
  for (const tab of TABS) {
    const btn = el("button", "tavern-tab", tab.label);
    btn.type = "button";
    btn.dataset.tab = tab.id;
    btn.addEventListener("click", () => setTab(tab.id));
    tabButtons.set(tab.id, btn);
    tabsRow.append(btn);
  }

  const body = el("div", "tavern-body");
  const panelRumors = el("div", "tavern-panel");
  const panelSleep = el("div", "tavern-panel");
  const panelFireplace = el("div", "tavern-panel");
  const panelLoadout = el("div", "tavern-panel");
  body.append(panelRumors, panelSleep, panelFireplace, panelLoadout);

  const skillTip = el("div", "skill-tooltip tavern-skill-tip");
  skillTip.hidden = true;

  win.append(closeBtn, head, tabsRow, body, skillTip);
  root.append(win);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let stateRef: GameState | null = null;
  let unitRef: Unit | null = null;
  let activeTab: TavernTabId = "rumors";
  let draftLoadout: AbilityId[] = [];
  let poolAspectFilter: Aspect | "all" = "all";

  function close(): void {
    hideSkillTip();
    root.hidden = true;
    stateRef = null;
    unitRef = null;
    handlers.onClose();
  }

  function interruptFireplaceIfNeeded(toast = true): void {
    if (!stateRef || !isFireplaceResting(stateRef)) return;
    stopFireplaceRest(stateRef);
    handlers.onFireplaceChanged();
    if (toast) handlers.showToast("Отдых у камина прерван");
  }

  function hideSkillTip(): void {
    skillTip.hidden = true;
    delete skillTip.dataset.tipId;
  }

  function showSkillTip(anchor: HTMLElement, id: AbilityId): void {
    const def = ABILITIES[id];
    if (!def) return;
    skillTip.className = `skill-tooltip tavern-skill-tip aspect-${def.aspect}`;
    skillTip.style.setProperty("--aspect-color", ASPECT_HEX[def.aspect]);
    skillTip.innerHTML = `
      <div class="tt-name">${def.name}</div>
      <div class="tt-desc">${describeAbility(def)}</div>
    `;
    skillTip.dataset.tipId = id;
    skillTip.hidden = false;
    const winRect = win.getBoundingClientRect();
    const aRect = anchor.getBoundingClientRect();
    const tipRect = skillTip.getBoundingClientRect();
    let left = aRect.right - winRect.left + 10;
    if (left + tipRect.width > winRect.width - 8) {
      left = aRect.left - winRect.left - tipRect.width - 10;
    }
    const top = Math.min(
      Math.max(8, aRect.top - winRect.top),
      Math.max(8, winRect.height - tipRect.height - 8),
    );
    skillTip.style.left = `${Math.max(8, left)}px`;
    skillTip.style.top = `${top}px`;
  }

  function setTab(id: TavernTabId): void {
    activeTab = id;
    for (const [tabId, btn] of tabButtons) {
      btn.classList.toggle("active", tabId === id);
    }
    panelRumors.hidden = id !== "rumors";
    panelSleep.hidden = id !== "sleep";
    panelFireplace.hidden = id !== "fireplace";
    panelLoadout.hidden = id !== "loadout";
    hideSkillTip();
    renderActivePanel();
  }

  function renderGold(): void {
    if (!stateRef) return;
    goldLine.replaceChildren();
    goldLine.append(document.createTextNode("Золото: "));
    goldLine.append(goldAmountNode(stateRef.hero.gold));
  }

  function renderClock(): void {
    if (!stateRef) return;
    const phase = phaseFromHour(stateRef.hour);
    clockLine.textContent = `${formatWorldClock(stateRef.hour)} · ${phaseLabelRu(phase)} · день ${stateRef.dayIndex}`;
  }

  function renderRumors(): void {
    if (!stateRef) return;
    ensureTavernDay(stateRef);
    panelRumors.replaceChildren();

    const left = rumorsLeftToday(stateRef);
    panelRumors.append(
      el(
        "p",
        "tavern-lead",
        `За кружкой можно услышать многое. Слух стоит ${RUMOR_COST}. Сегодня осталось: ${left} из ${RUMOR_MAX_PER_DAY}.`,
      ),
    );

    const buyBtn = el("button", "tavern-action-btn", `Купить слух (${RUMOR_COST})`);
    buyBtn.type = "button";
    buyBtn.disabled = left <= 0 || stateRef.hero.gold < RUMOR_COST;
    buyBtn.addEventListener("click", () => {
      if (!stateRef) return;
      interruptFireplaceIfNeeded();
      const result = buyRumor(stateRef);
      if (!result.ok) {
        handlers.showToast(result.reason);
        return;
      }
      const kindLabel =
        result.outcome.kind === "quest"
          ? "Задание"
          : result.outcome.kind === "tip"
            ? "Подсказка"
            : "Трёп";
      const short =
        result.outcome.text.length > 90
          ? `${result.outcome.text.slice(0, 90)}...`
          : result.outcome.text;
      handlers.showToast(`${kindLabel}: ${short}`);
      handlers.onChanged();
      render();
    });
    panelRumors.append(buyBtn);

    const log = el("div", "tavern-rumor-log");
    log.append(el("h3", "tavern-section-title", "Сегодня слышали"));
    const entries = stateRef.tavern.rumorLog;
    if (!entries.length) {
      log.append(
        el("p", "tavern-empty", "Пока тихо. Купите слух - или дождитесь болтливых гостей."),
      );
    } else {
      for (const entry of entries) {
        const card = el("div", `tavern-rumor-card kind-${entry.kind}`);
        const tag = entry.kind === "quest" ? "Квест" : entry.kind === "tip" ? "Подсказка" : "Трёп";
        card.append(el("span", "tavern-rumor-tag", tag));
        card.append(el("p", "tavern-rumor-text", entry.text));
        log.append(card);
      }
    }
    panelRumors.append(log);
  }

  function renderSleep(): void {
    if (!stateRef) return;
    panelSleep.replaceChildren();

    const card = el("div", "tavern-service-card");
    card.append(el("h3", "tavern-section-title", "Отдельный номер"));
    card.append(
      el(
        "p",
        "tavern-lead",
        `За ${TAVERN_SLEEP_COST} монет вас проведут в тихую комнату. Полное восстановление здоровья и маны. Пробуждение в 7:00 следующего дня.`,
      ),
    );
    card.append(
      el(
        "p",
        "tavern-note",
        "Доступно только при неполном здоровье и не утром - так нельзя крутить дни ради товаров торговцев.",
      ),
    );

    const check = canSleepInTavern(stateRef, unitRef);
    if (!check.ok) {
      card.append(el("p", "tavern-warn", check.reason));
    }

    const sleepBtn = el("button", "tavern-action-btn", `Снять номер (${TAVERN_SLEEP_COST})`);
    sleepBtn.type = "button";
    sleepBtn.disabled = !check.ok;
    sleepBtn.addEventListener("click", () => {
      if (!stateRef) return;
      const result = sleepInTavernRoom(stateRef, unitRef);
      if (!result.ok) {
        handlers.showToast(result.reason);
        render();
        return;
      }
      handlers.showToast("Вы выспались. Утро, торговцы обновили товар.");
      handlers.onSlept();
      render();
    });
    card.append(sleepBtn);
    panelSleep.append(card);
  }

  function renderFireplace(): void {
    if (!stateRef) return;
    panelFireplace.replaceChildren();

    const resting = isFireplaceResting(stateRef);
    const def = globalEffectDef("fireplace_rest");
    const card = el("div", `tavern-service-card${resting ? " is-resting" : ""}`);

    const top = el("div", "tavern-fireplace-top");
    const icon = el("div", "tavern-buff-icon");
    const img = el("img");
    img.src = def.iconUrl;
    img.alt = "";
    img.draggable = false;
    icon.append(img);
    const text = el("div");
    text.append(el("h3", "tavern-section-title", "Отдых у камина"));
    text.append(
      el(
        "p",
        "tavern-lead",
        'Бесплатно. Даёт бафф "Отдых у камина" вместо "Восстановление сил": +3 здоровья и маны в секунду.',
      ),
    );
    top.append(icon, text);
    card.append(top);

    card.append(
      el(
        "p",
        "tavern-note",
        "Во время отдыха нельзя ничего делать. Инвентарь и журнал квестов не прерывают отдых. Любое другое действие - прерывает.",
      ),
    );

    if (resting) {
      card.append(el("p", "tavern-resting-badge", "Вы отдыхаете у камина..."));
      const stopBtn = el("button", "tavern-action-btn tavern-action-muted", "Прервать отдых");
      stopBtn.type = "button";
      stopBtn.addEventListener("click", () => {
        if (!stateRef) return;
        stopFireplaceRest(stateRef);
        handlers.onFireplaceChanged();
        handlers.showToast("Отдых у камина прерван");
        handlers.onChanged();
        render();
      });
      card.append(stopBtn);
    } else {
      const startBtn = el("button", "tavern-action-btn", "Сесть у камина");
      startBtn.type = "button";
      startBtn.addEventListener("click", () => {
        if (!stateRef) return;
        startFireplaceRest(stateRef);
        handlers.onFireplaceChanged();
        handlers.showToast("Отдых у камина");
        handlers.onChanged();
        render();
      });
      card.append(startBtn);
    }
    panelFireplace.append(card);
  }

  function commitDraft(next: AbilityId[]): boolean {
    if (!stateRef) return false;
    const checked = validateAbilityLoadout(stateRef.hero, next);
    if (!checked.ok) {
      handlers.showToast(checked.reason);
      return false;
    }
    draftLoadout = checked.loadout;
    renderLoadout();
    return true;
  }

  function addAbilityToDraft(id: AbilityId, atIndex?: number): void {
    if (!stateRef) return;
    if (draftLoadout.includes(id)) {
      handlers.showToast("Способность уже на панели");
      return;
    }
    const next = [...draftLoadout];
    if (atIndex == null || atIndex >= next.length) next.push(id);
    else next.splice(atIndex, 0, id);
    commitDraft(next);
  }

  function moveAbilityInDraft(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= draftLoadout.length) return;
    const next = [...draftLoadout];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    const target = Math.min(Math.max(0, toIndex), next.length);
    next.splice(target, 0, moved);
    commitDraft(next);
  }

  function removeAbilityFromDraft(index: number): void {
    const next = draftLoadout.filter((_, i) => i !== index);
    draftLoadout = next;
    renderLoadout();
  }

  function renderLoadout(): void {
    if (!stateRef) return;
    panelLoadout.replaceChildren();

    const hero = stateRef.hero;
    const caps = loadoutSlotCaps(hero);
    const secondary = secondaryAspectOf(hero);

    panelLoadout.append(
      el(
        "p",
        "tavern-lead",
        secondary
          ? `Перетащите способности на панель. Основной (${ASPECT_LABEL[hero.aspect]}): до ${caps.primaryMax}. Вторичный (${ASPECT_LABEL[secondary]}): до ${caps.secondaryMax}. Всего: ${caps.totalMax}.`
          : `Перетащите способности на панель. Пока выучен один аспект - до ${caps.totalMax} навыков школы "${ASPECT_LABEL[hero.aspect]}".`,
      ),
    );

    const layout = el("div", "tavern-loadout-layout");
    const poolCol = el("div", "tavern-loadout-pool");
    poolCol.append(el("h3", "tavern-section-title", "Доступные способности"));

    const filters = el("div", "tavern-aspect-filters");
    const allBtn = el("button", "tavern-filter-btn", "Все");
    allBtn.type = "button";
    allBtn.classList.toggle("active", poolAspectFilter === "all");
    allBtn.addEventListener("click", () => {
      poolAspectFilter = "all";
      renderLoadout();
    });
    filters.append(allBtn);
    for (const aspect of hero.learnedAspects) {
      const btn = el("button", "tavern-filter-btn", ASPECT_LABEL[aspect]);
      btn.type = "button";
      btn.classList.toggle("active", poolAspectFilter === aspect);
      btn.addEventListener("click", () => {
        poolAspectFilter = aspect;
        renderLoadout();
      });
      filters.append(btn);
    }
    poolCol.append(filters);

    const pool = el("div", "tavern-ability-pool");
    const equipped = new Set(draftLoadout);
    const available = availableLoadoutAbilities(hero).filter((id) => {
      if (poolAspectFilter === "all") return true;
      return ABILITIES[id]?.aspect === poolAspectFilter;
    });

    if (!available.length) {
      pool.append(el("p", "tavern-empty", "Нет одобренных способностей для смены."));
    } else {
      for (const id of available) {
        const def = ABILITIES[id];
        if (!def) continue;
        const chip = el("button", "tavern-ability-chip");
        chip.type = "button";
        chip.draggable = !equipped.has(id);
        chip.classList.toggle("is-equipped", equipped.has(id));
        chip.style.setProperty("--aspect-color", ASPECT_HEX[def.aspect]);
        const iconUrl = ABILITY_ICON_URLS[id];
        if (iconUrl) {
          const img = el("img");
          img.src = iconUrl;
          img.alt = "";
          img.draggable = false;
          chip.append(img);
        }
        chip.append(el("span", "tavern-ability-name", def.name));
        chip.addEventListener("pointerenter", () => showSkillTip(chip, id));
        chip.addEventListener("pointerleave", hideSkillTip);
        chip.addEventListener("dragstart", (ev) => {
          if (equipped.has(id)) {
            ev.preventDefault();
            return;
          }
          ev.dataTransfer?.setData("text/ability", id);
          if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "copy";
        });
        chip.addEventListener("dblclick", () => {
          if (!equipped.has(id)) addAbilityToDraft(id);
        });
        pool.append(chip);
      }
    }
    poolCol.append(pool);

    const barCol = el("div", "tavern-loadout-bar");
    barCol.append(el("h3", "tavern-section-title", "Панель навыков"));
    const slots = el("div", "tavern-skill-slots");

    for (let i = 0; i < caps.totalMax; i++) {
      const slot = el("div", "tavern-skill-slot");
      const id = draftLoadout[i];
      if (id && ABILITIES[id]) {
        const def = ABILITIES[id];
        slot.classList.add("filled");
        slot.style.setProperty("--aspect-color", ASPECT_HEX[def.aspect]);
        slot.draggable = true;
        const img = el("img");
        img.src = ABILITY_ICON_URLS[id] ?? EMPTY_SKILL_ICON_URL;
        img.alt = "";
        img.draggable = false;
        slot.append(img);
        slot.append(el("span", "tavern-slot-hotkey", hotkeyLabel(i)));
        slot.addEventListener("pointerenter", () => showSkillTip(slot, id));
        slot.addEventListener("pointerleave", hideSkillTip);
        slot.addEventListener("dragstart", (ev) => {
          ev.dataTransfer?.setData("text/ability", id);
          ev.dataTransfer?.setData("text/slot", String(i));
          if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "move";
        });
        slot.addEventListener("dblclick", () => removeAbilityFromDraft(i));
      } else {
        slot.classList.add("empty");
        const img = el("img");
        img.src = EMPTY_SKILL_ICON_URL;
        img.alt = "";
        img.draggable = false;
        slot.append(img);
        slot.append(el("span", "tavern-slot-hotkey", hotkeyLabel(i)));
      }

      slot.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", (ev) => {
        ev.preventDefault();
        slot.classList.remove("drag-over");
        const abilityId = ev.dataTransfer?.getData("text/ability") as AbilityId | undefined;
        if (!abilityId) return;
        const fromRaw = ev.dataTransfer?.getData("text/slot");
        const fromSlot = fromRaw === "" || fromRaw == null ? -1 : Number(fromRaw);
        if (Number.isFinite(fromSlot) && fromSlot >= 0) {
          moveAbilityInDraft(fromSlot, i);
        } else {
          addAbilityToDraft(abilityId, i);
        }
      });
      slots.append(slot);
    }
    barCol.append(slots);

    const actions = el("div", "tavern-loadout-actions");
    const applyBtn = el("button", "tavern-action-btn", "Применить");
    applyBtn.type = "button";
    applyBtn.addEventListener("click", () => {
      if (!stateRef) return;
      interruptFireplaceIfNeeded();
      const result = applyAbilityLoadout(stateRef.hero, draftLoadout);
      if (!result.ok) {
        handlers.showToast(result.reason);
        return;
      }
      handlers.showToast("Панель навыков обновлена");
      handlers.onLoadoutChanged();
      handlers.onChanged();
      draftLoadout = [...stateRef.hero.abilityLoadout];
      renderLoadout();
    });
    const resetBtn = el("button", "tavern-action-btn tavern-action-muted", "Сбросить черновик");
    resetBtn.type = "button";
    resetBtn.addEventListener("click", () => {
      if (!stateRef) return;
      draftLoadout = [...stateRef.hero.abilityLoadout];
      renderLoadout();
    });
    actions.append(applyBtn, resetBtn);
    barCol.append(
      el("p", "tavern-note", "Двойной клик по слоту снимает навык. Двойной клик по списку - добавляет."),
    );
    barCol.append(actions);

    layout.append(poolCol, barCol);
    panelLoadout.append(layout);
  }

  function renderActivePanel(): void {
    if (activeTab === "rumors") renderRumors();
    else if (activeTab === "sleep") renderSleep();
    else if (activeTab === "fireplace") renderFireplace();
    else renderLoadout();
  }

  function render(): void {
    if (!stateRef) return;
    ensureTavernDay(stateRef);
    renderGold();
    renderClock();
    renderActivePanel();
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
    show(state: GameState, unit: Unit | null) {
      stateRef = state;
      unitRef = unit;
      ensureTavernDay(state);
      draftLoadout = [...state.hero.abilityLoadout];
      poolAspectFilter = "all";
      root.hidden = false;
      setTab(activeTab);
      window.addEventListener("keydown", onKeyDown);
    },
    hide() {
      hideSkillTip();
      root.hidden = true;
      stateRef = null;
      unitRef = null;
      window.removeEventListener("keydown", onKeyDown);
    },
    isOpen() {
      return !root.hidden;
    },
    refresh(unit?: Unit | null) {
      if (root.hidden || !stateRef) return;
      if (unit !== undefined) unitRef = unit;
      render();
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      root.remove();
    },
  };
}
