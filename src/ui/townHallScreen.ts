import type { GameState } from "../meta/gameState";
import {
  acceptQuest,
  getQuestDetailView,
  listTownHallQuests,
  turnInQuest,
  type QuestDetailView,
} from "../quests/questLog";
import type { QuestId } from "../quests/types";
import { goldAmountNode } from "./goldIcon";
import { createQuestRewardIcon } from "./questRewardIcon";
import "./townHallScreen.css";

export interface TownHallScreenApi {
  show(state: GameState): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface TownHallScreenHandlers {
  onClose: () => void;
  onChanged: () => void;
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

function appendRewards(host: HTMLElement, view: QuestDetailView): void {
  host.append(el("h4", "townhall-block-title", "Награда"));
  const rewards = el("ul", "townhall-rewards");
  rewards.append(el("li", undefined, `Опыт: ${view.rewards.xp}`));
  const goldLi = el("li");
  goldLi.append(document.createTextNode("Золото: "));
  goldLi.append(goldAmountNode(view.rewards.gold));
  rewards.append(goldLi);
  host.append(rewards);
  if (view.rewards.rewardItem) {
    host.append(createQuestRewardIcon(view.rewards.rewardItem));
  }
}

export function mountTownHallScreen(handlers: TownHallScreenHandlers): TownHallScreenApi {
  const root = el("div", "townhall-overlay");
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "townhall-title");

  const win = el("div", "townhall-window");

  const closeBtn = el("button", "townhall-x");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.innerHTML = '<span aria-hidden="true"></span>';

  const head = el("div", "townhall-head");
  const title = el("h2", "townhall-title", "Ратуша");
  title.id = "townhall-title";
  const subtitle = el("p", "townhall-subtitle", "Доска объявлений");
  head.append(title, subtitle);

  const body = el("div", "townhall-body");
  const list = el("div", "townhall-list");
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Объявления");
  const detail = el("div", "townhall-detail");
  body.append(list, detail);
  win.append(closeBtn, head, body);
  root.append(win);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let stateRef: GameState | null = null;
  let selectedId: QuestId | null = null;

  function close(): void {
    root.hidden = true;
    stateRef = null;
    selectedId = null;
    handlers.onClose();
  }

  function renderDetail(view: QuestDetailView | null): void {
    detail.replaceChildren();
    if (!view || (view.status !== "available" && view.status !== "ready")) {
      detail.append(
        el("p", "townhall-detail-empty", "Выберите объявление слева"),
      );
      return;
    }

    detail.append(el("h3", "townhall-detail-name", view.name));
    detail.append(el("p", "townhall-detail-desc", view.description));

    detail.append(el("h4", "townhall-block-title", "Цели"));
    const objList = el("ul", "townhall-objectives");
    for (const o of view.objectives) {
      const li = el("li", `townhall-objective${o.done ? " is-done" : ""}`);
      if (view.status === "ready") {
        li.append(el("span", undefined, o.label));
        li.append(el("span", undefined, `${o.current}/${o.target}`));
      } else {
        li.append(el("span", undefined, o.label));
        li.append(el("span", undefined, `0/${o.target}`));
      }
      objList.append(li);
    }
    detail.append(objList);
    appendRewards(detail, view);

    const actions = el("div", "townhall-actions");
    if (view.status === "available") {
      const acceptBtn = el("button", "meta-btn meta-btn-primary", "Взять квест");
      acceptBtn.type = "button";
      acceptBtn.addEventListener("click", () => {
        if (!stateRef) return;
        const res = acceptQuest(stateRef, view.id);
        if (!res.ok) {
          handlers.showToast(res.reason);
          return;
        }
        selectedId = null;
        handlers.onChanged();
        render();
      });
      actions.append(acceptBtn);
    } else {
      const turnBtn = el("button", "meta-btn meta-btn-primary", "Сдать квест");
      turnBtn.type = "button";
      turnBtn.addEventListener("click", () => {
        if (!stateRef) return;
        const res = turnInQuest(stateRef, view.id);
        if (!res.ok) {
          handlers.showToast(res.reason);
          return;
        }
        const parts = [`+${res.xp} опыта`, `+${res.gold} золота`];
        if (res.itemName) parts.push(res.itemName);
        handlers.showToast(`Награда: ${parts.join(", ")}`);
        if (res.levelsGained > 0) handlers.showToast(`Уровень ${res.newLevel}!`);
        selectedId = null;
        handlers.onChanged();
        render();
      });
      actions.append(turnBtn);
    }
    detail.append(actions);
  }

  function render(): void {
    if (!stateRef) return;
    const rows = listTownHallQuests(stateRef);

    if (selectedId && !rows.some((r) => r.id === selectedId)) selectedId = null;
    if (!selectedId && rows.length > 0) selectedId = rows[0]!.id;

    list.replaceChildren();
    if (rows.length === 0) {
      list.append(el("p", "townhall-list-empty", "Сейчас нет объявлений"));
    } else {
      const ready = rows.filter((r) => r.status === "ready");
      const available = rows.filter((r) => r.status === "available");
      const sections: { label: string; items: typeof rows }[] = [
        { label: "Сдать", items: ready },
        { label: "Доступные задания", items: available },
      ];
      for (const section of sections) {
        if (section.items.length === 0) continue;
        list.append(el("div", "townhall-section-label", section.label));
        for (const row of section.items) {
          const btn = el(
            "button",
            `townhall-quest-btn${row.status === "ready" ? " is-ready" : ""}${row.id === selectedId ? " is-selected" : ""}`,
          );
          btn.type = "button";
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", row.id === selectedId ? "true" : "false");
          btn.append(el("span", "townhall-quest-name", row.name));
          if (row.status === "ready") {
            btn.append(el("span", "townhall-quest-status", "Готово к сдаче"));
          }
          btn.addEventListener("click", () => {
            selectedId = row.id;
            render();
          });
          list.append(btn);
        }
      }
    }

    renderDetail(selectedId ? getQuestDetailView(stateRef, selectedId) : null);
  }

  closeBtn.addEventListener("click", () => close());
  root.addEventListener("click", (ev) => {
    if (ev.target === root) close();
  });
  window.addEventListener("keydown", (ev) => {
    if (root.hidden) return;
    if (ev.code !== "Escape" || ev.repeat) return;
    ev.preventDefault();
    close();
  });

  return {
    show(state) {
      stateRef = state;
      root.hidden = false;
      render();
    },
    hide() {
      root.hidden = true;
      stateRef = null;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      root.remove();
    },
  };
}
