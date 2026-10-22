import { ABILITIES } from "../abilities/definitions";
import { mountGrimoire } from "./grimoire";
import { ABILITY_ICON_URLS } from "../art/abilityIcons";
import { ENEMY_KINDS, rowsLabel, type EnemyKind } from "../combat/enemies";
import type { Unit } from "../combat/Unit";
import type { AbilityId } from "../types";

export interface SkillBarState {
  selectedAbility: AbilityId | null;
  /** Оставшееся время ГКД в секундах. */
  gcdRemaining: number;
  /** Длительность ГКД (для визуала). */
  gcdDuration: number;
}

export type BattleBannerMode = "start" | "pause" | "hidden";

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

  let toastTimer = 0;
  let startHandler: (() => void) | null = null;

  const setBattleBanner = (mode: BattleBannerMode): void => {
    btnStart.hidden = mode !== "start";
    pauseLabel.hidden = mode !== "pause";
    battleBanner.hidden = mode === "hidden";
  };

  setBattleBanner("start");
  btnStart.addEventListener("click", () => startHandler?.());

  const tooltip = document.createElement("div");
  tooltip.id = "skill-tooltip";
  tooltip.className = "skill-tooltip";
  tooltip.hidden = true;
  document.getElementById("hud")!.appendChild(tooltip);

  const hideTooltip = (): void => {
    tooltip.hidden = true;
  };

  const showTooltip = (btn: HTMLElement, id: AbilityId): void => {
    const def = ABILITIES[id];
    const reachLabel = def.reach <= 0 ? "на себя" : `${def.reach}`;
    const damageLabel =
      def.damage > 0
        ? def.targetMode === "enemy_blast"
          ? `${def.damage} / рядом ${Math.round(def.damage * 0.55)}`
          : String(def.damage)
        : "—";

    tooltip.className = `skill-tooltip school-${def.school}`;
    tooltip.innerHTML = `
      <div class="tt-name">${def.name}</div>
      <div class="tt-desc">${def.description}</div>
      <div class="tt-stats">
        <div class="tt-stat"><span>Урон</span><b>${damageLabel}</b></div>
        <div class="tt-stat"><span>Кулдаун</span><b>${def.cooldown.toFixed(1)} с</b></div>
        <div class="tt-stat"><span>Радиус</span><b>${reachLabel}</b></div>
      </div>
    `;
    tooltip.hidden = false;

    const rect = btn.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
    const top = rect.top - tipRect.height - 10;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
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
    for (const id of unit.abilities) {
      const def = ABILITIES[id];
      const iconUrl = ABILITY_ICON_URLS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.ability = id;
      btn.className = `skill-btn school-${def.school}${iconUrl ? " has-art" : ""}`;
      btn.innerHTML = iconUrl
        ? `<img class="skill-icon" src="${iconUrl}" alt="${def.name}" draggable="false" />`
        : `<span class="glyph">${def.glyph}</span>`;
      applySkillVisual(btn, unit, id, state);
      btn.addEventListener("click", () => onSelectAbility(id));
      btn.addEventListener("mouseenter", () => showTooltip(btn, id));
      btn.addEventListener("mouseleave", hideTooltip);
      btn.addEventListener("focus", () => showTooltip(btn, id));
      btn.addEventListener("blur", hideTooltip);
      skillBar.appendChild(btn);
    }
  };

  const syncSkills = (unit: Unit, state: SkillBarState): void => {
    const buttons = [...skillBar.querySelectorAll<HTMLButtonElement>("button.skill-btn")];
    if (buttons.length !== unit.abilities.length) {
      renderSkills(unit, state);
      return;
    }
    unit.abilities.forEach((id, index) => {
      const btn = buttons[index];
      if (!btn) return;
      applySkillVisual(btn, unit, id, state);
    });
  };

  const closeMenu = (): void => {
    sideMenu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  };
  const grimoire = mountGrimoire(closeMenu);

  const openMenu = (): void => {
    sideMenu.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
  };

  const showDetail = (kind: EnemyKind): void => {
    bestiaryDetail.replaceChildren();
    const title = document.createElement("div");
    title.className = "bestiary-detail-name";
    title.textContent = kind.name;
    const role = document.createElement("div");
    role.className = "bestiary-type";
    role.textContent = kind.role;
    bestiaryDetail.append(title, role, statLine("Здоровье", String(kind.hp)), statLine("Урон", String(kind.atk)), statLine("Кулдаун", `${kind.cd.toFixed(1)} с`), statLine("Дистанция", String(kind.reach)), statLine("Появление", rowsLabel(kind.spawnRows)));
  };

  const clearDetail = (): void => {
    bestiaryDetail.textContent = "Наведите на врага, чтобы увидеть характеристики.";
  };

  const fillBestiary = (): void => {
    bestiaryList.replaceChildren();
    for (const kind of ENEMY_KINDS) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "bestiary-row";
      const img = document.createElement("img");
      img.src = kind.portraitUrl;
      img.alt = kind.name;
      const text = document.createElement("span");
      text.className = "bestiary-copy";
      const name = document.createElement("span");
      name.className = "bestiary-name";
      name.textContent = kind.name;
      const type = document.createElement("span");
      type.className = "bestiary-type";
      type.textContent = `${kind.role} · ${rowsLabel(kind.spawnRows)}`;
      text.append(name, type);
      row.append(img, text);
      row.addEventListener("mouseenter", () => showDetail(kind));
      row.addEventListener("focus", () => showDetail(kind));
      bestiaryList.append(row);
    }
    clearDetail();
  };

  menuBtn.addEventListener("click", () => {
    if (sideMenu.hidden) openMenu();
    else closeMenu();
  });
  bestiaryBtn.addEventListener("click", () => {
    closeMenu();
    fillBestiary();
    bestiary.hidden = false;
  });
  bestiaryClose.addEventListener("click", () => {
    bestiary.hidden = true;
  });
  bestiary.addEventListener("click", (ev) => {
    if (ev.target === bestiary) bestiary.hidden = true;
  });
  bestiaryList.addEventListener("mouseleave", clearDetail);
  document.addEventListener("pointerdown", (ev) => {
    if (sideMenu.hidden) return;
    const target = ev.target;
    if (!(target instanceof Node)) return;
    if (sideMenu.contains(target) || menuBtn.contains(target)) return;
    closeMenu();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.code !== "Escape") return;
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
      toast.hidden = false;
      toast.textContent = text;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, 1400);
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
