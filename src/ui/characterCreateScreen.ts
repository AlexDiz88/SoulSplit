import { ASPECT_LABEL } from "../abilities/definitions";
import { listHeroPortraitUrls, type HeroGender } from "../art/portraits";
import { pickRandomHeroName } from "../meta/heroNames";
import {
  HERO_NAME_MAX_LENGTH,
  type NewHeroOptions,
  validateHeroName,
} from "../meta/heroProfile";
import type { Aspect } from "../types";
import "./hubScreen.css";
import "./startMenu.css";

const ASPECTS: Aspect[] = ["air", "ice", "fire", "iron", "stealth", "light"];

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
  for (const id of ASPECTS) {
    const btn = el("button", "aspect-opt", ASPECT_LABEL[id]);
    btn.type = "button";
    btn.addEventListener("click", () => {
      aspect = id;
      for (const [a, b] of aspectButtons) b.classList.toggle("is-active", a === aspect);
    });
    aspectButtons.set(id, btn);
    aspectGrid.append(btn);
  }
  aspectField.append(aspectGrid);
  body.append(aspectField);

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

  const syncGenderButtons = (): void => {
    for (const [g, b] of genderButtons) b.classList.toggle("is-active", g === gender);
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
    error.textContent = "";
    syncGenderButtons();
    for (const [a, b] of aspectButtons) b.classList.toggle("is-active", a === aspect);
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
    error.textContent = "";
    handlers.onCreate(slotIndex, { name, aspect, portraitUrl });
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
