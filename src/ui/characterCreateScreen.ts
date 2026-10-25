import {
  ABILITIES,
  ALL_ASPECTS,
  ASPECT_HEX,
  ASPECT_LABEL,
  abilitiesForAspect,
  describeAbility,
  zoneSecondaryDamage,
} from "../abilities/definitions";
import { ABILITY_ICON_URLS, EMPTY_SKILL_ICON_URL } from "../art/abilityIcons";
import { listHeroPortraitUrls, type HeroGender } from "../art/portraits";
import {
  createStarterWeapon,
  DEFAULT_STARTER_WEAPON,
  STARTER_WEAPONS,
  type StarterWeaponId,
} from "../items/starterWeapons";
import { pickRandomHeroName } from "../meta/heroNames";
import {
  HERO_NAME_MAX_LENGTH,
  type NewHeroOptions,
  validateHeroName,
} from "../meta/heroProfile";
import type { AbilityId, Aspect } from "../types";
import { fillItemTooltip } from "./itemTooltip";
import "./hubScreen.css";
import "./startMenu.css";
import "./itemTooltip.css";

export interface CharacterCreateScreenApi {
  show(slotIndex: number): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface CharacterCreateScreenHandlers {
  onBack: () => void;
  onCreate: (slotIndex: number, opts: NewHeroOptions) => void;
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

function diceIconSvg(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "name-dice-icon");
  svg.innerHTML =
    '<rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="1.75"/>' +
    '<circle cx="8.2" cy="8.2" r="1.35" fill="currentColor"/>' +
    '<circle cx="15.8" cy="8.2" r="1.35" fill="currentColor"/>' +
    '<circle cx="12" cy="12" r="1.35" fill="currentColor"/>' +
    '<circle cx="8.2" cy="15.8" r="1.35" fill="currentColor"/>' +
    '<circle cx="15.8" cy="15.8" r="1.35" fill="currentColor"/>';
  return svg;
}

export function mountCharacterCreateScreen(
  handlers: CharacterCreateScreenHandlers,
): CharacterCreateScreenApi {
  let slotIndex = 0;
  let aspect: Aspect = "air";
  let gender: HeroGender = "male";
  let starterWeapon: StarterWeaponId = DEFAULT_STARTER_WEAPON;
  let starterAbility: AbilityId | null = null;
  let portraitUrl = "";

  const root = el("div", "meta-screen create-screen");
  root.id = "character-create-screen";
  root.hidden = true;

  const wrap = el("div", "create-wrap");
  const head = el("div", "create-head");
  const titles = el("div", "create-titles");
  titles.append(el("h1", undefined, "Создание персонажа"));
  const hint = el("p", "create-hint", "Слот 1");
  titles.append(hint);
  const btnBack = el("button", "meta-btn", "Назад");
  btnBack.type = "button";
  head.append(titles, btnBack);
  wrap.append(head);

  const body = el("div", "create-body");

  const nameField = el("div", "create-field create-field-name");
  const nameLabel = el("label", undefined, "Имя");
  nameLabel.htmlFor = "hero-name-input";
  const nameRow = el("div", "create-name-row");
  const nameInput = el("input");
  nameInput.type = "text";
  nameInput.id = "hero-name-input";
  nameInput.maxLength = HERO_NAME_MAX_LENGTH;
  nameInput.autocomplete = "off";
  nameInput.placeholder = "Имя героя";
  nameInput.spellcheck = false;
  const btnDice = el("button", "name-dice-btn");
  btnDice.type = "button";
  btnDice.title = "Случайное имя";
  btnDice.setAttribute("aria-label", "Случайное имя");
  btnDice.append(diceIconSvg());
  nameRow.append(nameInput, btnDice);
  nameField.append(nameLabel, nameRow);
  body.append(nameField);

  const genderField = el("div", "create-field");
  genderField.append(el("label", undefined, "Пол"));
  const genderToggle = el("div", "gender-toggle");
  genderToggle.setAttribute("role", "group");
  genderToggle.setAttribute("aria-label", "Пол");
  const genderButtons = new Map<HeroGender, HTMLButtonElement>();
  for (const [id, label] of [
    ["male", "Мужской"],
    ["female", "Женский"],
  ] as const) {
    const btn = el("button", "gender-opt", label);
    btn.type = "button";
    btn.dataset.gender = id;
    btn.addEventListener("click", () => setGender(id));
    genderButtons.set(id, btn);
    genderToggle.append(btn);
  }
  genderField.append(genderToggle);
  body.append(genderField);

  const aspectField = el("div", "create-field");
  aspectField.append(el("label", undefined, "Первичный аспект"));
  const aspectGrid = el("div", "aspect-grid");
  const aspectButtons = new Map<Aspect, HTMLButtonElement>();
  for (const id of ALL_ASPECTS) {
    const btn = el("button", "aspect-opt", ASPECT_LABEL[id]);
    btn.type = "button";
    btn.addEventListener("click", () => setAspect(id));
    aspectButtons.set(id, btn);
    aspectGrid.append(btn);
  }
  aspectField.append(aspectGrid);
  body.append(aspectField);

  const abilityField = el("div", "create-field create-field-abilities");
  abilityField.append(el("label", undefined, "Стартовая способность"));
  const abilityEmpty = el(
    "p",
    "create-ability-empty",
    "Для этого аспекта пока нет способностей.",
  );
  abilityEmpty.hidden = true;
  const abilityGrid = el("div", "ability-grid");
  abilityGrid.setAttribute("role", "group");
  abilityGrid.setAttribute("aria-label", "Стартовая способность");
  const abilityTip = el("div", "skill-tooltip create-ability-tip");
  abilityTip.hidden = true;
  abilityField.append(abilityEmpty, abilityGrid, abilityTip);
  body.append(abilityField);

  const weaponField = el("div", "create-field create-field-weapons");
  weaponField.append(el("label", undefined, "Стартовое оружие"));
  const weaponGrid = el("div", "weapon-grid");
  weaponGrid.setAttribute("role", "group");
  weaponGrid.setAttribute("aria-label", "Стартовое оружие");
  const weaponTip = el("div", "item-tip create-weapon-tip");
  weaponTip.hidden = true;
  const weaponButtons = new Map<StarterWeaponId, HTMLButtonElement>();
  const weaponItems = new Map(
    STARTER_WEAPONS.map((def) => [def.id, createStarterWeapon(def.id)] as const),
  );

  const showWeaponTip = (btn: HTMLButtonElement, id: StarterWeaponId): void => {
    const item = weaponItems.get(id);
    if (!item) return;
    fillItemTooltip(weaponTip, item, { showSellPrice: false });
    weaponTip.hidden = false;
    const fieldRect = weaponField.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const tipRect = weaponTip.getBoundingClientRect();
    let left = btnRect.right - fieldRect.left + 10;
    if (left + tipRect.width > fieldRect.width - 4) {
      left = btnRect.left - fieldRect.left - tipRect.width - 10;
    }
    const top = Math.min(
      Math.max(0, btnRect.top - fieldRect.top),
      Math.max(0, fieldRect.height - tipRect.height),
    );
    weaponTip.style.left = `${Math.max(0, left)}px`;
    weaponTip.style.top = `${top}px`;
  };

  for (const def of STARTER_WEAPONS) {
    const item = weaponItems.get(def.id)!;
    const btn = el("button", "weapon-opt");
    btn.type = "button";
    btn.dataset.weapon = def.id;
    btn.setAttribute("aria-label", def.name);
    const face = el("span", "weapon-opt-face");
    if (item.icon) {
      const img = el("img");
      img.src = item.icon;
      img.alt = "";
      img.draggable = false;
      face.append(img);
    } else {
      face.append(el("span", "weapon-opt-fallback", def.name));
    }
    btn.append(face);
    btn.addEventListener("click", () => {
      starterWeapon = def.id;
      for (const [id, b] of weaponButtons) b.classList.toggle("is-active", id === starterWeapon);
    });
    btn.addEventListener("pointerenter", () => showWeaponTip(btn, def.id));
    btn.addEventListener("pointerleave", () => {
      weaponTip.hidden = true;
    });
    btn.addEventListener("focus", () => showWeaponTip(btn, def.id));
    btn.addEventListener("blur", () => {
      weaponTip.hidden = true;
    });
    weaponButtons.set(def.id, btn);
    weaponGrid.append(btn);
  }
  weaponField.append(weaponGrid, weaponTip);
  body.append(weaponField);

  const portraitField = el("div", "create-field create-field-portraits");
  portraitField.append(el("label", undefined, "Портрет"));
  const portraitGrid = el("div", "portrait-grid");
  portraitField.append(portraitGrid);
  body.append(portraitField);

  const footer = el("div", "create-footer");
  const error = el("p", "create-error");
  const actions = el("div", "create-actions");
  const btnCreate = el("button", "meta-btn meta-btn-primary", "Создать");
  btnCreate.type = "button";
  actions.append(btnCreate);
  footer.append(error, actions);
  body.append(footer);

  wrap.append(body);
  root.append(wrap);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  const rebuildPortraits = (): void => {
    const portraits = [...listHeroPortraitUrls(gender)];
    portraitGrid.replaceChildren();
    portraitUrl = portraits[0] ?? "";
    portraits.forEach((url, i) => {
      const btn = el("button", "portrait-opt");
      btn.type = "button";
      if (i === 0) btn.classList.add("is-active");
      const img = el("img");
      img.src = url;
      img.alt = "Портрет";
      img.draggable = false;
      btn.append(img);
      btn.addEventListener("click", () => {
        portraitUrl = url;
        for (const child of portraitGrid.children) {
          child.classList.toggle("is-active", child === btn);
        }
      });
      portraitGrid.append(btn);
    });
  };

  const showAbilityTip = (btn: HTMLButtonElement, id: AbilityId): void => {
    const def = ABILITIES[id];
    const reachLabel = def.reach <= 0 ? "на себя" : `${def.reach}`;
    const damageLabel =
      def.damage > 0
        ? def.targetMode === "zone"
          ? `${def.damage} / выше ${zoneSecondaryDamage(def)}`
          : String(def.damage)
        : "-";

    abilityTip.className = `skill-tooltip create-ability-tip aspect-${def.aspect}`;
    abilityTip.style.setProperty("--aspect-color", ASPECT_HEX[def.aspect]);
    abilityTip.innerHTML = `
      <div class="tt-name">${def.name}</div>
      <div class="tt-desc">${describeAbility(def)}</div>
      <div class="tt-stats">
        <div class="tt-stat"><span>Урон</span><b>${damageLabel}</b></div>
        <div class="tt-stat"><span>Кулдаун</span><b>${def.cooldown.toFixed(1)} с</b></div>
        <div class="tt-stat"><span>Радиус</span><b>${reachLabel}</b></div>
      </div>
    `;
    abilityTip.hidden = false;

    const fieldRect = abilityField.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const tipRect = abilityTip.getBoundingClientRect();
    let left = btnRect.right - fieldRect.left + 10;
    if (left + tipRect.width > fieldRect.width - 4) {
      left = btnRect.left - fieldRect.left - tipRect.width - 10;
    }
    const top = Math.min(
      Math.max(0, btnRect.top - fieldRect.top),
      Math.max(0, fieldRect.height - tipRect.height),
    );
    abilityTip.style.left = `${Math.max(0, left)}px`;
    abilityTip.style.top = `${top}px`;
  };

  const hideAbilityTip = (): void => {
    abilityTip.hidden = true;
  };

  const setStarterAbility = (id: AbilityId | null): void => {
    starterAbility = id;
    for (const child of abilityGrid.children) {
      const btn = child as HTMLButtonElement;
      btn.classList.toggle("is-active", btn.dataset.ability === id);
    }
  };

  const rebuildAbilities = (): void => {
    hideAbilityTip();
    const ids = abilitiesForAspect(aspect);
    abilityGrid.replaceChildren();
    if (ids.length === 0) {
      starterAbility = null;
      abilityEmpty.hidden = false;
      abilityGrid.hidden = true;
      return;
    }
    abilityEmpty.hidden = true;
    abilityGrid.hidden = false;
    starterAbility = ids[0]!;
    for (const id of ids) {
      const def = ABILITIES[id];
      const btn = el("button", "ability-opt");
      btn.type = "button";
      btn.dataset.ability = id;
      btn.setAttribute("aria-label", def.name);
      if (id === starterAbility) btn.classList.add("is-active");
      const face = el("span", "ability-opt-face");
      const img = el("img");
      img.src = ABILITY_ICON_URLS[id] ?? EMPTY_SKILL_ICON_URL;
      img.alt = "";
      img.draggable = false;
      face.append(img);
      btn.append(face);
      btn.addEventListener("click", () => setStarterAbility(id));
      btn.addEventListener("pointerenter", () => showAbilityTip(btn, id));
      btn.addEventListener("pointerleave", hideAbilityTip);
      btn.addEventListener("focus", () => showAbilityTip(btn, id));
      btn.addEventListener("blur", hideAbilityTip);
      abilityGrid.append(btn);
    }
  };

  const syncGenderButtons = (): void => {
    for (const [g, b] of genderButtons) b.classList.toggle("is-active", g === gender);
  };

  const setAspect = (next: Aspect): void => {
    aspect = next;
    for (const [a, b] of aspectButtons) b.classList.toggle("is-active", a === aspect);
    rebuildAbilities();
  };

  const setGender = (next: HeroGender): void => {
    if (gender === next) return;
    gender = next;
    syncGenderButtons();
    rebuildPortraits();
  };

  const resetForm = (): void => {
    nameInput.value = "";
    aspect = "air";
    gender = "male";
    starterWeapon = DEFAULT_STARTER_WEAPON;
    starterAbility = null;
    error.textContent = "";
    syncGenderButtons();
    for (const [a, b] of aspectButtons) b.classList.toggle("is-active", a === aspect);
    for (const [id, b] of weaponButtons) b.classList.toggle("is-active", id === starterWeapon);
    rebuildAbilities();
    rebuildPortraits();
  };

  btnDice.addEventListener("click", () => {
    nameInput.value = pickRandomHeroName(gender, nameInput.value);
    error.textContent = "";
    nameInput.focus();
  });

  btnBack.addEventListener("click", () => handlers.onBack());
  btnCreate.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const nameError = validateHeroName(name);
    if (nameError) {
      error.textContent = nameError;
      nameInput.focus();
      return;
    }
    if (!portraitUrl) {
      error.textContent = "Нет доступных портретов.";
      return;
    }
    const aspectAbilities = abilitiesForAspect(aspect);
    if (aspectAbilities.length > 0 && !starterAbility) {
      error.textContent = "Выберите стартовую способность.";
      return;
    }
    if (starterAbility && !aspectAbilities.includes(starterAbility)) {
      error.textContent = "Выберите способность выбранного аспекта.";
      return;
    }
    error.textContent = "";
    handlers.onCreate(slotIndex, {
      name,
      aspect,
      portraitUrl,
      starterWeapon,
      ...(starterAbility ? { starterAbility } : {}),
    });
  });

  return {
    show(index) {
      slotIndex = index;
      hint.textContent = `Слот ${index + 1}`;
      resetForm();
      root.hidden = false;
      nameInput.focus();
    },
    hide() {
      weaponTip.hidden = true;
      hideAbilityTip();
      root.hidden = true;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      root.remove();
    },
  };
}
