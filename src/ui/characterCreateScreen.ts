import { ASPECT_LABEL } from "../abilities/definitions";
import { listHeroPortraitUrls } from "../art/portraits";
import type { NewHeroOptions } from "../meta/heroProfile";
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

export function mountCharacterCreateScreen(
  handlers: CharacterCreateScreenHandlers,
): CharacterCreateScreenApi {
  const portraits = [...listHeroPortraitUrls()];
  let slotIndex = 0;
  let aspect: Aspect = "air";
  let portraitUrl = portraits[0] ?? "";

  const root = el("div", "meta-screen create-screen");
  root.id = "character-create-screen";
  root.hidden = true;

  const panel = el("div", "meta-panel create-panel");
  panel.append(el("h1", undefined, "Создание персонажа"));
  const hint = el("p", "create-hint", "Слот 1");
  panel.append(hint);

  const nameField = el("div", "create-field");
  const nameLabel = el("label", undefined, "Имя");
  nameLabel.htmlFor = "hero-name-input";
  const nameInput = el("input");
  nameInput.type = "text";
  nameInput.id = "hero-name-input";
  nameInput.maxLength = 24;
  nameInput.autocomplete = "off";
  nameInput.placeholder = "Имя героя";
  nameField.append(nameLabel, nameInput);
  panel.append(nameField);

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
  panel.append(aspectField);

  const portraitField = el("div", "create-field");
  portraitField.append(el("label", undefined, "Портрет"));
  const portraitGrid = el("div", "portrait-grid");
  const portraitButtons: HTMLButtonElement[] = [];
  for (const url of portraits) {
    const btn = el("button", "portrait-opt");
    btn.type = "button";
    const img = el("img");
    img.src = url;
    img.alt = "Портрет";
    img.draggable = false;
    btn.append(img);
    btn.addEventListener("click", () => {
      portraitUrl = url;
      for (const b of portraitButtons) {
        b.classList.toggle("is-active", b === btn);
      }
    });
    portraitButtons.push(btn);
    portraitGrid.append(btn);
  }
  portraitField.append(portraitGrid);
  panel.append(portraitField);

  const error = el("p", "create-error");
  panel.append(error);

  const actions = el("div", "create-actions");
  const btnBack = el("button", "meta-btn", "Назад");
  btnBack.type = "button";
  const btnCreate = el("button", "meta-btn meta-btn-primary", "Создать");
  btnCreate.type = "button";
  actions.append(btnBack, btnCreate);
  panel.append(actions);
  root.append(panel);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  const resetForm = (): void => {
    nameInput.value = "";
    aspect = "air";
    portraitUrl = portraits[0] ?? "";
    error.textContent = "";
    for (const [a, b] of aspectButtons) b.classList.toggle("is-active", a === aspect);
    for (let i = 0; i < portraitButtons.length; i++) {
      portraitButtons[i]!.classList.toggle("is-active", i === 0);
    }
  };

  btnBack.addEventListener("click", () => handlers.onBack());
  btnCreate.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (name.length < 2) {
      error.textContent = "Имя должно быть не короче 2 символов.";
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
