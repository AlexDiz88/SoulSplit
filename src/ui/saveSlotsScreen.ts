import { ASPECT_LABEL } from "../abilities/definitions";
import {
  SAVE_SLOT_COUNT,
  type SaveSlotSummary,
} from "../meta/save";
import "./hubScreen.css";
import "./startMenu.css";

export interface SaveSlotsScreenApi {
  show(slots: SaveSlotSummary[]): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface SaveSlotsScreenHandlers {
  onBack: () => void;
  onSelectSlot: (index: number) => void;
  onInfo: (index: number) => void;
  onDelete: (index: number) => void;
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

export function mountSaveSlotsScreen(handlers: SaveSlotsScreenHandlers): SaveSlotsScreenApi {
  const root = el("div", "meta-screen slots-screen");
  root.id = "save-slots-screen";
  root.hidden = true;

  const wrap = el("div", "slots-wrap");
  const head = el("div", "slots-head");
  head.append(el("h1", undefined, "Выбор персонажа"));
  const btnBack = el("button", "meta-btn", "Назад");
  btnBack.type = "button";
  head.append(btnBack);

  const grid = el("div", "slots-grid");
  wrap.append(head, grid);
  root.append(wrap);

  const confirm = el("div", "confirm-overlay");
  confirm.hidden = true;
  confirm.setAttribute("role", "dialog");
  confirm.setAttribute("aria-modal", "true");
  const confirmPanel = el("div", "confirm-panel");
  const confirmTitle = el("h2", undefined, "Удалить персонажа?");
  const confirmText = el("p", undefined, "");
  const confirmActions = el("div", "confirm-actions");
  const btnCancel = el("button", "meta-btn", "Отмена");
  btnCancel.type = "button";
  const btnConfirm = el("button", "meta-btn meta-btn-danger", "Удалить");
  btnConfirm.type = "button";
  confirmActions.append(btnCancel, btnConfirm);
  confirmPanel.append(confirmTitle, confirmText, confirmActions);
  confirm.append(confirmPanel);
  root.append(confirm);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let pendingDelete = -1;
  let selectedIndex = -1;

  const closeConfirm = (): void => {
    pendingDelete = -1;
    confirm.hidden = true;
  };

  const openConfirm = (slot: Extract<SaveSlotSummary, { empty: false }>): void => {
    pendingDelete = slot.index;
    confirmText.textContent = `Слот "${slot.name}" (ур. ${slot.level}) будет стёрт без возможности восстановления.`;
    confirm.hidden = false;
  };

  btnBack.addEventListener("click", () => {
    closeConfirm();
    handlers.onBack();
  });
  btnCancel.addEventListener("click", () => closeConfirm());
  btnConfirm.addEventListener("click", () => {
    const idx = pendingDelete;
    closeConfirm();
    if (idx >= 0) handlers.onDelete(idx);
  });
  confirm.addEventListener("click", (ev) => {
    if (ev.target === confirm) closeConfirm();
  });

  const render = (slots: SaveSlotSummary[]): void => {
    grid.replaceChildren();
    const list = slots.length === SAVE_SLOT_COUNT ? slots : padSlots(slots);

    for (const slot of list) {
      const card = el("div", "slot-card");
      const frame = el("button", "slot-frame");
      frame.type = "button";
      frame.dataset.slot = String(slot.index);
      if (slot.index === selectedIndex) frame.classList.add("is-selected");

      if (slot.empty) {
        frame.append(el("div", "slot-name", `Слот ${slot.index + 1}`));
        const mid = el("div", "slot-portrait-wrap");
        mid.append(el("div", "slot-empty-label", "Пустой"));
        frame.append(mid);
        frame.append(el("div", "slot-meta"));
      } else {
        frame.append(el("div", "slot-name", slot.name));
        const mid = el("div", "slot-portrait-wrap");
        const img = el("img", "slot-portrait");
        img.src = slot.portraitUrl;
        img.alt = slot.name;
        img.draggable = false;
        mid.append(img);
        frame.append(mid);
        const meta = el("div", "slot-meta");
        meta.append(el("div", "slot-level", `Ур. ${slot.level}`));
        meta.append(el("div", "slot-aspect", ASPECT_LABEL[slot.aspect]));
        frame.append(meta);
      }

      frame.addEventListener("click", () => {
        selectedIndex = slot.index;
        for (const btn of grid.querySelectorAll(".slot-frame")) {
          btn.classList.toggle("is-selected", (btn as HTMLElement).dataset.slot === String(slot.index));
        }
        handlers.onSelectSlot(slot.index);
      });

      const actions = el("div", "slot-actions");
      const btnInfo = el("button", "slot-action", "Инфо");
      btnInfo.type = "button";
      btnInfo.disabled = slot.empty;
      btnInfo.title = "Статистика персонажа";
      btnInfo.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!slot.empty) handlers.onInfo(slot.index);
      });

      const btnDel = el("button", "slot-action slot-action-danger", "Корзина");
      btnDel.type = "button";
      btnDel.disabled = slot.empty;
      btnDel.title = "Удалить персонажа";
      btnDel.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!slot.empty) openConfirm(slot);
      });

      actions.append(btnInfo, btnDel);
      card.append(frame, actions);
      grid.append(card);
    }
  };

  return {
    show(slots) {
      closeConfirm();
      selectedIndex = -1;
      render(slots);
      root.hidden = false;
    },
    hide() {
      closeConfirm();
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

function padSlots(slots: SaveSlotSummary[]): SaveSlotSummary[] {
  const out: SaveSlotSummary[] = Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => ({
    index,
    empty: true as const,
  }));
  for (const s of slots) {
    if (s.index >= 0 && s.index < SAVE_SLOT_COUNT) out[s.index] = s;
  }
  return out;
}
