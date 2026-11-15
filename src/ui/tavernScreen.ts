import { ABILITIES, ASPECT_HEX, ASPECT_LABEL, describeAbility } from "../abilities/definitions";
import { ABILITY_ICON_URLS } from "../art/abilityIcons";
import { resolveTavernRoomUrl } from "../art/menuBackground";
import type { Unit } from "../combat/Unit";
import { globalEffectDef } from "../effects/globalEffects";
import type { GameState } from "../meta/gameState";
import {
  countLoadoutFilledByBand,
  firstFreeBandSlot,
  isLoadoutSlotUnlocked,
  LOADOUT_MAX,
  LOADOUT_PRIMARY_MAX,
  loadoutBandForIndex,
  unlockLevelForLoadoutSlot,
} from "../meta/abilityProgression";
import {
  applyAbilityLoadout,
  availableLoadoutAbilities,
  buyRumor,
  canSleepInTavern,
  ensureTavernDay,
  isFireplaceResting,
  loadoutSlotCaps,
  normalizeAbilityLoadout,
  RUMOR_COST,
  RUMOR_MAX_PER_DAY,
  rumorsLeftToday,
  secondaryAspectOf,
  sleepInTavernRoom,
  startFireplaceRest,
  stopFireplaceRest,
  TAVERN_SLEEP_COST,
  validateAbilityLoadout,
  type AbilityLoadout,
  type TavernTabId,
} from "../meta/tavern";
import { formatWorldClock, phaseFromHour, phaseLabelRu } from "../meta/worldTime";
import type { AbilityId, Aspect } from "../types";
import { createAspectIconImg } from "./aspectIcon";
import { goldAmountNode } from "./goldIcon";
import "./tavernScreen.css";

export interface TavernScreenApi {
  show(state: GameState, unit: Unit | null): void;
  /** `force` - закрыть даже во время отдыха (выход из игры). */
  hide(force?: boolean): void;
  isOpen(): boolean;
  refresh(unit?: Unit | null): void;
  destroy(): void;
}

export interface TavernScreenHandlers {
  onClose: () => void;
  onChanged: () => void;
  onSlept: () => void;
  onLoadoutChanged: () => void;
  onFireplaceChanged: () => void;
  /** Журнал заданий поверх камина (единственный разрешённый экран во время отдыха). */
  onOpenQuestLog: () => void;
  /** Escape не должен срывать отдых, пока открыт журнал. */
  isQuestLogOpen?: () => boolean;
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

const TAB_LABEL: Record<TavernTabId, string> = Object.fromEntries(
  TABS.map((t) => [t.id, t.label]),
) as Record<TavernTabId, string>;

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
  goldLine.append(document.createTextNode("Золото: "));
  goldLine.append(goldAmountNode(0));
  const clockLine = el("div", "tavern-clock", "\u00A0");
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
  let draftLoadout: AbilityLoadout = [];
  let poolAspectFilter: Aspect | null = null;

  function close(opts?: { interruptRest?: boolean }): void {
    if (stateRef && isFireplaceResting(stateRef)) {
      if (!opts?.interruptRest) return;
      stopFireplaceRest(stateRef);
      handlers.onFireplaceChanged();
      handlers.onChanged();
    }
    hideSkillTip();
    root.hidden = true;
    stateRef = null;
    unitRef = null;
    root.classList.remove("is-rest-locked");
    handlers.onClose();
  }

  function interruptFireplaceRest(): void {
    if (!stateRef || !isFireplaceResting(stateRef)) return;
    stopFireplaceRest(stateRef);
    handlers.onFireplaceChanged();
    handlers.onChanged();
    syncRestLock();
    render();
  }

  function syncRestLock(): void {
    const resting = Boolean(stateRef && isFireplaceResting(stateRef));
    root.classList.toggle("is-rest-locked", resting);
    closeBtn.disabled = resting;
    closeBtn.hidden = resting;
    for (const [tabId, btn] of tabButtons) {
      const lockOther = resting && tabId !== "fireplace";
      btn.disabled = lockOther;
      btn.classList.toggle("is-locked", lockOther);
    }
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
    skillTip.style.transform = "";
    skillTip.style.left = `${Math.max(8, left)}px`;
    skillTip.style.top = `${top}px`;
  }

  function setTab(id: TavernTabId): void {
    if (stateRef && isFireplaceResting(stateRef) && id !== "fireplace") return;
    activeTab = id;
    for (const [tabId, btn] of tabButtons) {
      btn.classList.toggle("active", tabId === id);
    }
    panelRumors.hidden = id !== "rumors";
    panelSleep.hidden = id !== "sleep";
    panelFireplace.hidden = id !== "fireplace";
    panelLoadout.hidden = id !== "loadout";
    hideSkillTip();
    syncRestLock();
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

  function panelIntro(
    title: string,
    lead: string | HTMLElement,
    note?: string,
  ): HTMLElement {
    const intro = el("div", "tavern-panel-intro");
    intro.append(el("h3", "tavern-section-title", title));
    if (typeof lead === "string") {
      intro.append(el("p", "tavern-lead", lead));
    } else {
      intro.append(lead);
    }
    if (note) intro.append(el("p", "tavern-note", note));
    return intro;
  }

  /** Слева арт комнаты (как портрет торговца), справа контент вкладки. */
  function beginRoomPanel(panel: HTMLElement, tabId: TavernTabId): HTMLElement {
    panel.replaceChildren();
    const layout = el("div", "tavern-panel-layout");
    const art = el("aside", "tavern-room-art");
    const img = document.createElement("img");
    img.className = "tavern-room-art-img";
    img.src = resolveTavernRoomUrl(tabId);
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    const meta = el("div", "tavern-room-art-meta");
    meta.append(el("h3", "tavern-room-art-name", TAB_LABEL[tabId]));
    art.append(img, meta);
    const content = el("div", "tavern-panel-content");
    layout.append(art, content);
    panel.append(layout);
    return content;
  }

  function renderRumors(): void {
    if (!stateRef) return;
    ensureTavernDay(stateRef);
    const content = beginRoomPanel(panelRumors, "rumors");

    const left = rumorsLeftToday(stateRef);
    const rumorLead = el("p", "tavern-lead");
    rumorLead.append(
      document.createTextNode("За кружкой можно услышать многое. Слух стоит "),
      goldAmountNode(RUMOR_COST),
      document.createTextNode(
        `. Сегодня осталось: ${left} из ${RUMOR_MAX_PER_DAY}.`,
      ),
    );
    content.append(panelIntro("Слухи", rumorLead));

    const main = el("div", "tavern-panel-main");
    const buyBtn = el("button", "tavern-action-btn");
    buyBtn.type = "button";
    buyBtn.append(
      document.createTextNode("Купить слух ("),
      goldAmountNode(RUMOR_COST),
      document.createTextNode(")"),
    );
    buyBtn.disabled = left <= 0 || stateRef.hero.gold < RUMOR_COST;
    buyBtn.addEventListener("click", () => {
      if (!stateRef) return;
      const result = buyRumor(stateRef);
      if (!result.ok) return;
      handlers.onChanged();
      render();
    });
    main.append(buyBtn);

    const log = el("div", "tavern-rumor-log");
    log.append(el("h4", "tavern-subhead", "Сегодня слышали"));
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
    main.append(log);
    content.append(main);
  }

  function renderSleep(): void {
    if (!stateRef) return;
    const content = beginRoomPanel(panelSleep, "sleep");

    const sleepLead = el("p", "tavern-lead");
    sleepLead.append(
      document.createTextNode("За "),
      goldAmountNode(TAVERN_SLEEP_COST),
      document.createTextNode(
        " вас проведут в тихую комнату. В уютной комнате вы полностью восстановите здоровье и ману. Отдых длится до утра.",
      ),
    );
    content.append(
      panelIntro(
        "Отдельный номер",
        sleepLead,
        "Недоступно только утром при полном здоровье. В другое время суток можно лечь спать даже здоровым.",
      ),
    );

    const main = el("div", "tavern-panel-main");
    const card = el("div", "tavern-service-card");
    const check = canSleepInTavern(stateRef, unitRef);
    const status = el("p", "tavern-status-slot");
    if (!check.ok) {
      status.classList.add("is-warn");
      status.textContent = check.reason;
    } else {
      status.textContent = "Номер свободен.";
    }
    card.append(status);

    const sleepBtn = el("button", "tavern-action-btn");
    sleepBtn.type = "button";
    sleepBtn.append(
      document.createTextNode("Снять номер ("),
      goldAmountNode(TAVERN_SLEEP_COST),
      document.createTextNode(")"),
    );
    sleepBtn.disabled = !check.ok;
    sleepBtn.addEventListener("click", () => {
      if (!stateRef) return;
      const result = sleepInTavernRoom(stateRef, unitRef);
      if (!result.ok) {
        render();
        return;
      }
      handlers.onSlept();
      render();
    });
    card.append(sleepBtn);
    main.append(card);
    content.append(main);
  }

  function renderFireplace(): void {
    if (!stateRef) return;
    const content = beginRoomPanel(panelFireplace, "fireplace");

    const resting = isFireplaceResting(stateRef);
    const def = globalEffectDef("fireplace_rest");

    const intro = el("div", "tavern-panel-intro tavern-panel-intro-fireplace");
    intro.append(el("h3", "tavern-section-title", "Отдых у камина"));
    const top = el("div", "tavern-fireplace-top");
    const icon = el("div", "tavern-buff-icon");
    const img = el("img");
    img.src = def.iconUrl;
    img.alt = "";
    img.draggable = false;
    icon.append(img);
    top.append(
      icon,
      el(
        "p",
        "tavern-lead",
        "Устройтесь удобно у камина - чтобы быстрее восстановить ваши силы.",
      ),
    );
    intro.append(top);
    intro.append(
      el(
        "p",
        "tavern-note",
        "Во время отдыха доступен только журнал заданий. Клик за окном прерывает отдых и закрывает таверну.",
      ),
    );
    content.append(intro);

    const main = el("div", "tavern-panel-main");
    const block = el("div", `tavern-fireplace-block${resting ? " is-resting" : ""}`);

    const actions = el("div", "tavern-fireplace-actions");
    if (resting) {
      const stopBtn = el(
        "button",
        "tavern-action-btn tavern-rest-progress-btn",
        "Прервать отдых",
      );
      stopBtn.type = "button";
      stopBtn.addEventListener("click", () => interruptFireplaceRest());
      const journalBtn = el("button", "tavern-action-btn", "Журнал заданий (J)");
      journalBtn.type = "button";
      journalBtn.addEventListener("click", () => handlers.onOpenQuestLog());
      actions.append(stopBtn, journalBtn);
    } else {
      const startBtn = el("button", "tavern-action-btn", "Сесть у камина");
      startBtn.type = "button";
      startBtn.addEventListener("click", () => {
        if (!stateRef) return;
        startFireplaceRest(stateRef);
        activeTab = "fireplace";
        handlers.onFireplaceChanged();
        handlers.onChanged();
        setTab("fireplace");
      });
      actions.append(startBtn);
    }
    block.append(actions);

    // Слот статуса под кнопками, всегда занимает место.
    const badge = el("p", "tavern-resting-badge");
    if (resting) {
      badge.textContent = "Вы отдыхаете у камина...";
      badge.classList.add("is-active");
    } else {
      badge.textContent = "\u00A0";
      badge.classList.add("is-idle");
    }
    block.append(badge);
    main.append(block);
    content.append(main);
  }

  function commitDraft(next: AbilityLoadout): boolean {
    if (!stateRef) return false;
    const checked = validateAbilityLoadout(stateRef.hero, next);
    if (!checked.ok) return false;
    draftLoadout = checked.loadout;
    renderLoadout();
    return true;
  }

  function bandForAbility(id: AbilityId): "primary" | "secondary" | null {
    if (!stateRef) return null;
    const def = ABILITIES[id];
    if (!def) return null;
    if (def.aspect === stateRef.hero.aspect) return "primary";
    const secondary = secondaryAspectOf(stateRef.hero);
    if (secondary && def.aspect === secondary) return "secondary";
    return null;
  }

  function placeAbilityInDraft(id: AbilityId, atIndex?: number): void {
    if (!stateRef) return;
    const caps = loadoutSlotCaps(stateRef.hero);
    const band = bandForAbility(id);
    if (!band) return;
    const next = normalizeAbilityLoadout(draftLoadout, stateRef.hero);
    const existing = next.indexOf(id);
    if (existing >= 0) next[existing] = null;

    let slot = -1;
    if (atIndex != null && atIndex >= 0 && atIndex < LOADOUT_MAX) {
      if (isLoadoutSlotUnlocked(atIndex, caps) && loadoutBandForIndex(atIndex) === band) {
        slot = atIndex;
      }
    }
    if (slot < 0) slot = firstFreeBandSlot(next, band, caps);
    if (slot < 0) return;
    // Если целевой слот занят другой способностью той же полосы - обмен.
    const displaced = next[slot];
    next[slot] = id;
    if (displaced && displaced !== id && existing >= 0 && !next[existing]) {
      next[existing] = displaced;
    }
    commitDraft(next);
  }

  function moveAbilityInDraft(fromIndex: number, toIndex: number): void {
    if (!stateRef) return;
    if (fromIndex === toIndex) return;
    const caps = loadoutSlotCaps(stateRef.hero);
    if (!isLoadoutSlotUnlocked(fromIndex, caps) || !isLoadoutSlotUnlocked(toIndex, caps)) {
      return;
    }
    if (loadoutBandForIndex(fromIndex) !== loadoutBandForIndex(toIndex)) return;
    const next = normalizeAbilityLoadout(draftLoadout, stateRef.hero);
    const moved = next[fromIndex];
    if (!moved) return;
    next[fromIndex] = next[toIndex];
    next[toIndex] = moved;
    commitDraft(next);
  }

  function removeAbilityFromDraft(index: number): void {
    if (!stateRef) return;
    const next = normalizeAbilityLoadout(draftLoadout, stateRef.hero);
    if (index < 0 || index >= next.length || !next[index]) return;
    next[index] = null;
    draftLoadout = next;
    renderLoadout();
  }

  function showLockTip(anchor: HTMLElement, unlockLevel: number): void {
    skillTip.className = "skill-tooltip tavern-skill-tip";
    skillTip.style.removeProperty("--aspect-color");
    skillTip.innerHTML = `
      <div class="tt-name">Слот закрыт</div>
      <div class="tt-desc">Откроется на уровне ${unlockLevel}</div>
    `;
    skillTip.hidden = false;
    const winRect = win.getBoundingClientRect();
    const aRect = anchor.getBoundingClientRect();
    skillTip.style.transform = "translate(-50%, -100%)";
    skillTip.style.left = `${aRect.left - winRect.left + aRect.width / 2}px`;
    skillTip.style.top = `${aRect.top - winRect.top - 8}px`;
  }

  function renderLoadout(): void {
    if (!stateRef) return;
    const content = beginRoomPanel(panelLoadout, "loadout");

    const hero = stateRef.hero;
    const caps = loadoutSlotCaps(hero);
    const secondary = secondaryAspectOf(hero);

    const filled = countLoadoutFilledByBand(draftLoadout);
    content.append(
      panelIntro(
        "Комната подготовки",
        "Здесь можно управлять и настраивать ваши способности. Новые доступные ячейки открываются каждый уровень, вплоть до 10-го.",
      ),
    );

    const capsLine = el("p", "tavern-loadout-caps");
    const primaryLabel = `Основной (${ASPECT_LABEL[hero.aspect]}): ${filled.primary}/${caps.primaryMax}`;
    const secondaryLabel = secondary
      ? `Вторичный (${ASPECT_LABEL[secondary]}): ${filled.secondary}/${caps.secondaryMax}`
      : hero.level >= 5
        ? "Вторичный: выберите школу"
        : "Вторичный: с 5 уровня";
    capsLine.textContent = `${primaryLabel} · ${secondaryLabel} · Всего ${filled.primary + filled.secondary}/${caps.totalMax}`;
    content.append(capsLine);

    if (!poolAspectFilter || !hero.learnedAspects.includes(poolAspectFilter)) {
      poolAspectFilter = hero.aspect;
    }
    draftLoadout = normalizeAbilityLoadout(draftLoadout, hero);

    const main = el("div", "tavern-panel-main");
    const layout = el("div", "tavern-loadout-layout");
    const poolCol = el("div", "tavern-loadout-pool");
    poolCol.append(el("h4", "tavern-subhead", "Доступные способности"));

    const filters = el("div", "tavern-aspect-filters");
    for (const aspect of hero.learnedAspects) {
      const btn = el("button", "tavern-filter-btn");
      btn.type = "button";
      btn.classList.toggle("active", poolAspectFilter === aspect);
      btn.style.setProperty("--aspect-color", ASPECT_HEX[aspect]);
      btn.setAttribute("aria-label", ASPECT_LABEL[aspect]);
      btn.append(
        createAspectIconImg(aspect, "tavern-filter-aspect-icon"),
        el("span", "tavern-filter-label", ASPECT_LABEL[aspect]),
      );
      btn.addEventListener("click", () => {
        poolAspectFilter = aspect;
        renderLoadout();
      });
      filters.append(btn);
    }
    poolCol.append(filters);

    const pool = el("div", "tavern-ability-pool");
    const equipped = new Set(draftLoadout.filter((id): id is AbilityId => !!id));
    const available = availableLoadoutAbilities(hero).filter(
      (id) => ABILITIES[id]?.aspect === poolAspectFilter,
    );

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
        chip.setAttribute("aria-label", def.name);
        const iconUrl = ABILITY_ICON_URLS[id];
        if (iconUrl) {
          const img = el("img");
          img.src = iconUrl;
          img.alt = "";
          img.draggable = false;
          chip.append(img);
        }
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
          if (!equipped.has(id)) placeAbilityInDraft(id);
        });
        pool.append(chip);
      }
    }
    poolCol.append(pool);

    const footer = el("div", "tavern-loadout-footer");
    const barCol = el("div", "tavern-loadout-bar");
    barCol.append(el("h4", "tavern-subhead", "Панель навыков"));
    barCol.append(
      el(
        "p",
        "tavern-note tavern-loadout-hint",
        "Слева слоты основного аспекта, справа - вторичного. Двойной клик снимает / добавляет.",
      ),
    );

    const bands = el("div", "tavern-skill-bands");
    const primaryRow = el("div", "tavern-skill-slots tavern-skill-slots-primary");
    const secondaryRow = el("div", "tavern-skill-slots tavern-skill-slots-secondary");

    function mountSlot(i: number, host: HTMLElement): void {
      const unlocked = isLoadoutSlotUnlocked(i, caps);
      const slot = el("div", "tavern-skill-slot");
      const id = draftLoadout[i];
      slot.append(el("span", "tavern-slot-hotkey", hotkeyLabel(i)));

      if (!unlocked) {
        slot.classList.add("locked");
        const unlockAt = unlockLevelForLoadoutSlot(i) ?? 10;
        slot.setAttribute("aria-label", `Слот откроется на уровне ${unlockAt}`);
        slot.addEventListener("pointerenter", () => showLockTip(slot, unlockAt));
        slot.addEventListener("pointerleave", hideSkillTip);
        host.append(slot);
        return;
      }

      if (id && ABILITIES[id]) {
        const def = ABILITIES[id];
        slot.classList.add("filled");
        slot.style.setProperty("--aspect-color", ASPECT_HEX[def.aspect]);
        slot.draggable = true;
        const iconUrl = ABILITY_ICON_URLS[id];
        if (iconUrl) {
          const img = el("img");
          img.src = iconUrl;
          img.alt = "";
          img.draggable = false;
          slot.append(img);
        }
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
        if (i < LOADOUT_PRIMARY_MAX) {
          slot.style.setProperty("--aspect-color", ASPECT_HEX[hero.aspect]);
        } else if (secondary) {
          slot.style.setProperty("--aspect-color", ASPECT_HEX[secondary]);
        }
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
          placeAbilityInDraft(abilityId, i);
        }
      });
      host.append(slot);
    }

    for (let i = 0; i < LOADOUT_PRIMARY_MAX; i++) mountSlot(i, primaryRow);
    for (let i = LOADOUT_PRIMARY_MAX; i < LOADOUT_MAX; i++) mountSlot(i, secondaryRow);
    bands.append(primaryRow, secondaryRow);
    barCol.append(bands);

    const actions = el("div", "tavern-loadout-actions");
    const applyBtn = el("button", "tavern-action-btn", "Применить");
    applyBtn.type = "button";
    applyBtn.addEventListener("click", () => {
      if (!stateRef) return;
      const result = applyAbilityLoadout(stateRef.hero, draftLoadout);
      if (!result.ok) return;
      handlers.onLoadoutChanged();
      handlers.onChanged();
      draftLoadout = normalizeAbilityLoadout(stateRef.hero.abilityLoadout, stateRef.hero);
      renderLoadout();
    });
    const resetBtn = el("button", "tavern-action-btn tavern-action-muted", "Сбросить");
    resetBtn.type = "button";
    resetBtn.addEventListener("click", () => {
      if (!stateRef) return;
      draftLoadout = normalizeAbilityLoadout(stateRef.hero.abilityLoadout, stateRef.hero);
      renderLoadout();
    });
    actions.append(applyBtn, resetBtn);

    footer.append(barCol, actions);
    layout.append(poolCol, footer);
    main.append(layout);
    content.append(main);
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
    if (isFireplaceResting(stateRef) && activeTab !== "fireplace") {
      activeTab = "fireplace";
    }
    renderGold();
    renderClock();
    syncRestLock();
    for (const [tabId, btn] of tabButtons) {
      btn.classList.toggle("active", tabId === activeTab);
    }
    panelRumors.hidden = activeTab !== "rumors";
    panelSleep.hidden = activeTab !== "sleep";
    panelFireplace.hidden = activeTab !== "fireplace";
    panelLoadout.hidden = activeTab !== "loadout";
    renderActivePanel();
  }

  closeBtn.addEventListener("click", () => close());
  root.addEventListener("click", (ev) => {
    if (ev.target !== root) return;
    // Клик за окном: во время отдыха прерывает отдых и закрывает таверну.
    close({ interruptRest: true });
  });

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (root.hidden) return;
    if (ev.code === "Escape") {
      // Сначала закрывается журнал (свой listener); отдых не трогаем.
      if (handlers.isQuestLogOpen?.()) return;
      ev.preventDefault();
      if (stateRef && isFireplaceResting(stateRef)) {
        interruptFireplaceRest();
        return;
      }
      close();
    }
  };

  return {
    show(state: GameState, unit: Unit | null) {
      stateRef = state;
      unitRef = unit;
      ensureTavernDay(state);
      draftLoadout = normalizeAbilityLoadout(state.hero.abilityLoadout, state.hero);
      poolAspectFilter = state.hero.aspect;
      if (isFireplaceResting(state)) activeTab = "fireplace";
      // Сначала заполняем шапку и панель, потом показываем - без скачка золота/времени.
      setTab(activeTab);
      root.hidden = false;
      window.addEventListener("keydown", onKeyDown);
    },
    hide(force = false) {
      if (!force && stateRef && isFireplaceResting(stateRef)) return;
      hideSkillTip();
      root.hidden = true;
      stateRef = null;
      unitRef = null;
      root.classList.remove("is-rest-locked");
      window.removeEventListener("keydown", onKeyDown);
    },
    isOpen() {
      return !root.hidden;
    },
    refresh(unit?: Unit | null) {
      if (root.hidden || !stateRef) return;
      if (unit !== undefined) unitRef = unit;
      // Тик HP не пересобирает панели - только шапка, иначе дергается верх.
      renderGold();
      renderClock();
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      root.remove();
    },
  };
}
