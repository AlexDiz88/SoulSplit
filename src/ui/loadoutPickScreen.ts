import { approvedAbilitiesForAspect } from "../abilities/catalog";
import { ALL_ASPECTS, ASPECT_HEX, ASPECT_LABEL } from "../abilities/aspects";
import { ABILITIES, describeAbility, zoneSecondaryDamage } from "../abilities/definitions";
import { ABILITY_ICON_URLS, EMPTY_SKILL_ICON_URL } from "../art/abilityIcons";
import { hasPendingLoadoutPicks, type PendingLoadoutPick } from "../meta/abilityProgression";
import type { HeroProfile } from "../meta/heroProfile";
import {
  resolveAbilityPick,
  resolveSecondaryAspectPick,
} from "../meta/heroProfile";
import type { AbilityId, Aspect } from "../types";
import {
  createAspectIconImg,
  createAspectNameTip,
  wireAspectNameTooltip,
} from "./aspectIcon";
import "./loadoutPickScreen.css";
import "./startMenu.css";

export interface LoadoutPickScreenApi {
  /** Показать голову очереди; false если очереди нет. */
  show(profile: HeroProfile): boolean;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface LoadoutPickScreenHandlers {
  onResolved: (profile: HeroProfile) => void;
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

function canHoverTooltip(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function mountLoadoutPickScreen(
  handlers: LoadoutPickScreenHandlers,
): LoadoutPickScreenApi {
  const root = el("div", "loadout-pick-overlay");
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");

  const win = el("div", "loadout-pick-window");
  const title = el("h2", "loadout-pick-title", "Новый навык");
  const subtitle = el("p", "loadout-pick-sub");
  const body = el("div", "loadout-pick-body");
  const error = el("p", "loadout-pick-error");
  const tip = el("div", "skill-tooltip loadout-pick-tip");
  tip.hidden = true;

  win.append(title, subtitle, body, error, tip);
  root.append(win);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let profileRef: HeroProfile | null = null;
  let selectedAspect: Aspect | null = null;
  let selectedAbility: AbilityId | null = null;

  const hideTip = (): void => {
    tip.hidden = true;
    delete tip.dataset.tipId;
  };

  const showAbilityTip = (btn: HTMLElement, id: AbilityId): void => {
    const def = ABILITIES[id];
    if (!def) return;
    const reachLabel = def.reach <= 0 ? "на себя" : `${def.reach}`;
    const damageLabel =
      def.damage > 0
        ? def.targetMode === "zone"
          ? `${def.damage} / выше ${zoneSecondaryDamage(def)}`
          : String(def.damage)
        : "-";
    tip.className = `skill-tooltip loadout-pick-tip aspect-${def.aspect}`;
    tip.style.setProperty("--aspect-color", ASPECT_HEX[def.aspect]);
    tip.innerHTML = `
      <div class="tt-name">${def.name}</div>
      <div class="tt-desc">${describeAbility(def)}</div>
      <div class="tt-stats">
        <div class="tt-stat"><span>Урон</span><b>${damageLabel}</b></div>
        <div class="tt-stat"><span>Кулдаун</span><b>${def.cooldown.toFixed(1)} с</b></div>
        <div class="tt-stat"><span>Радиус</span><b>${reachLabel}</b></div>
      </div>
    `;
    tip.dataset.tipId = id;
    tip.hidden = false;
    const winRect = win.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let left = btnRect.right - winRect.left + 10;
    if (left + tipRect.width > winRect.width - 8) {
      left = btnRect.left - winRect.left - tipRect.width - 10;
    }
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, btnRect.top - winRect.top)}px`;
  };

  function headPick(): PendingLoadoutPick | null {
    if (!profileRef) return null;
    return profileRef.pendingLoadoutPicks[0] ?? null;
  }

  function renderAspectPick(): void {
    if (!profileRef) return;
    selectedAspect = null;
    title.textContent = "Вторичный аспект";
    subtitle.textContent =
      "На 5 уровне открывается вторая школа. Выберите аспект, отличный от основного. Выбор постоянный.";
    body.replaceChildren();
    error.textContent = "";

    const grid = el("div", "aspect-grid loadout-pick-aspect-grid");
    const aspectTip = createAspectNameTip();
    for (const id of ALL_ASPECTS) {
      if (id === profileRef.aspect) continue;
      const btn = el("button", "aspect-opt aspect-icon-btn");
      btn.type = "button";
      btn.append(createAspectIconImg(id, "aspect-icon"));
      btn.addEventListener("click", () => {
        selectedAspect = id;
        for (const child of grid.querySelectorAll(".aspect-opt")) {
          child.classList.toggle("is-active", child === btn);
        }
      });
      wireAspectNameTooltip(btn, id, aspectTip, { toggleOnClick: true });
      grid.append(btn);
    }
    const confirm = el("button", "loadout-pick-confirm", "Подтвердить");
    confirm.type = "button";
    confirm.addEventListener("click", () => {
      if (!profileRef || !selectedAspect) {
        error.textContent = "Выберите вторичный аспект.";
        return;
      }
      const res = resolveSecondaryAspectPick(profileRef, selectedAspect);
      if (!res.ok) {
        error.textContent = res.reason;
        return;
      }
      handlers.onResolved(profileRef);
      if (hasPendingLoadoutPicks(profileRef)) render();
      else hide();
    });
    body.append(grid, aspectTip, confirm);
  }

  function renderAbilityPick(aspect: Aspect): void {
    if (!profileRef) return;
    selectedAbility = null;
    const role =
      aspect === profileRef.aspect ? "основного аспекта" : "вторичного аспекта";
    title.textContent = "Новая способность";
    subtitle.textContent = `Выберите способность ${role} (${ASPECT_LABEL[aspect]}). Она займёт свободный слот на панели.`;
    body.replaceChildren();
    error.textContent = "";
    hideTip();

    const equipped = new Set(
      profileRef.abilityLoadout.filter((id): id is AbilityId => !!id),
    );
    const ids = approvedAbilitiesForAspect(aspect).filter((id) => !equipped.has(id));
    if (!ids.length) {
      body.append(
        el(
          "p",
          "loadout-pick-empty",
          "Нет доступных способностей для этого аспекта. Добавьте одобренные карточки в каталог.",
        ),
      );
      return;
    }

    const grid = el("div", "ability-grid loadout-pick-ability-grid");
    for (const id of ids) {
      const def = ABILITIES[id];
      const btn = el("button", "ability-opt");
      btn.type = "button";
      btn.dataset.ability = id;
      btn.setAttribute("aria-label", def.name);
      const face = el("span", "ability-opt-face");
      const img = el("img");
      img.src = ABILITY_ICON_URLS[id] ?? EMPTY_SKILL_ICON_URL;
      img.alt = "";
      img.draggable = false;
      face.append(img);
      btn.append(face);
      btn.addEventListener("click", () => {
        selectedAbility = id;
        for (const child of grid.children) {
          child.classList.toggle("is-active", child === btn);
        }
        if (!canHoverTooltip()) {
          if (!tip.hidden && tip.dataset.tipId === id) hideTip();
          else showAbilityTip(btn, id);
        }
      });
      btn.addEventListener("pointerenter", () => {
        if (!canHoverTooltip()) return;
        showAbilityTip(btn, id);
      });
      btn.addEventListener("pointerleave", () => {
        if (!canHoverTooltip()) return;
        hideTip();
      });
      grid.append(btn);
    }

    const confirm = el("button", "loadout-pick-confirm", "Выучить");
    confirm.type = "button";
    confirm.addEventListener("click", () => {
      if (!profileRef || !selectedAbility) {
        error.textContent = "Выберите способность.";
        return;
      }
      const res = resolveAbilityPick(profileRef, selectedAbility);
      if (!res.ok) {
        error.textContent = res.reason;
        return;
      }
      handlers.onResolved(profileRef);
      if (hasPendingLoadoutPicks(profileRef)) render();
      else hide();
    });
    body.append(grid, confirm);
  }

  function render(): void {
    const pick = headPick();
    if (!pick || !profileRef) {
      hide();
      return;
    }
    if (pick.kind === "choose_secondary_aspect") renderAspectPick();
    else renderAbilityPick(pick.aspect);
  }

  function hide(): void {
    hideTip();
    root.hidden = true;
    profileRef = null;
    selectedAspect = null;
    selectedAbility = null;
  }

  return {
    show(profile) {
      if (!hasPendingLoadoutPicks(profile)) {
        hide();
        return false;
      }
      profileRef = profile;
      root.hidden = false;
      render();
      return true;
    },
    hide,
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      hide();
      root.remove();
    },
  };
}
