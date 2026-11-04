import type { GameState } from "../meta/gameState";
import {
  getQuestDetailView,
  listJournalQuests,
  toggleTrack,
  type QuestDetailView,
} from "../quests/questLog";
import type { QuestId } from "../quests/types";
import { goldAmountNode } from "./goldIcon";
import { createQuestRewardIcon } from "./questRewardIcon";
import "./questLogScreen.css";

export interface QuestLogScreenApi {
  show(state: GameState): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface QuestLogScreenHandlers {
  onClose: () => void;
  onChanged: () => void;
  showToast: (text: string) => void;
}

type JournalTab = "active" | "completed";

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

export function mountQuestLogScreen(handlers: QuestLogScreenHandlers): QuestLogScreenApi {
  const root = el("div", "questlog-overlay");
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "questlog-title");

  const win = el("div", "questlog-window");
  win.style.position = "relative";

  const closeBtn = el("button", "questlog-x");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.innerHTML = '<span aria-hidden="true"></span>';

  const head = el("div", "questlog-head");
  const title = el("h2", "questlog-title", "Журнал заданий");
  title.id = "questlog-title";
  head.append(title);

  const tabs = el("div", "questlog-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Разделы журнала");
  const tabActive = el("button", "questlog-tab is-active", "Активные");
  tabActive.type = "button";
  tabActive.setAttribute("role", "tab");
  tabActive.setAttribute("aria-selected", "true");
  const tabDone = el("button", "questlog-tab", "Завершенные");
  tabDone.type = "button";
  tabDone.setAttribute("role", "tab");
  tabDone.setAttribute("aria-selected", "false");
  tabs.append(tabActive, tabDone);

  const body = el("div", "questlog-body");
  const list = el("div", "questlog-list");
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Задания");
  const detail = el("div", "questlog-detail");
  body.append(list, detail);
  win.append(closeBtn, head, tabs, body);
  root.append(win);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let stateRef: GameState | null = null;
  let selectedId: QuestId | null = null;
  let activeTab: JournalTab = "active";

  function close(): void {
    root.hidden = true;
    stateRef = null;
    selectedId = null;
    handlers.onClose();
  }

  function setTab(tab: JournalTab): void {
    activeTab = tab;
    tabActive.classList.toggle("is-active", tab === "active");
    tabDone.classList.toggle("is-active", tab === "completed");
    tabActive.setAttribute("aria-selected", tab === "active" ? "true" : "false");
    tabDone.setAttribute("aria-selected", tab === "completed" ? "true" : "false");
    selectedId = null;
    render();
  }

  function renderDetail(view: QuestDetailView | null): void {
    detail.replaceChildren();
    if (!view || view.status === "available") {
      detail.append(el("p", "questlog-detail-empty", "Выберите задание"));
      return;
    }

    detail.append(el("h3", "questlog-detail-name", view.name));
    detail.append(el("p", "questlog-detail-desc", view.description));

    detail.append(el("h4", "questlog-block-title", "Цели"));
    const objList = el("ul", "questlog-objectives");
    for (const o of view.objectives) {
      const li = el("li", `questlog-objective${o.done ? " is-done" : ""}`);
      li.append(el("span", undefined, o.label));
      li.append(el("span", undefined, `${o.current}/${o.target}`));
      objList.append(li);
    }
    detail.append(objList);

    detail.append(el("h4", "questlog-block-title", "Награда"));
    const rewards = el("ul", "questlog-rewards");
    rewards.append(el("li", undefined, `Опыт: ${view.rewards.xp}`));
    const goldLi = el("li");
    goldLi.append(document.createTextNode("Золото: "));
    goldLi.append(goldAmountNode(view.rewards.gold));
    rewards.append(goldLi);
    detail.append(rewards);
    if (view.rewards.rewardItem) {
      detail.append(createQuestRewardIcon(view.rewards.rewardItem));
    }

    const actions = el("div", "questlog-actions");
    if (view.status === "active" || view.status === "ready") {
      const trackLabel = el(
        "button",
        `questlog-track${view.tracked ? " is-checked" : ""}${!view.canTrack && !view.tracked ? " is-disabled" : ""}`,
      );
      trackLabel.type = "button";
      trackLabel.setAttribute("role", "checkbox");
      trackLabel.setAttribute("aria-checked", view.tracked ? "true" : "false");
      trackLabel.setAttribute("aria-label", "Отслеживать");
      if (!view.canTrack && !view.tracked) {
        trackLabel.disabled = true;
      }
      const box = el("span", "questlog-track-box");
      box.setAttribute("aria-hidden", "true");
      box.append(el("span", "questlog-track-mark"));
      trackLabel.append(box, el("span", "questlog-track-text", "Отслеживать"));
      trackLabel.addEventListener("click", () => {
        if (!stateRef) return;
        const res = toggleTrack(stateRef, view.id);
        if (!res.ok) {
          handlers.showToast(res.reason);
          return;
        }
        handlers.onChanged();
        render();
      });
      actions.append(trackLabel);
      if (view.status === "ready") {
        actions.append(el("p", "questlog-hint", "Сдайте в ратуше"));
      }
    }
    if (actions.childNodes.length > 0) detail.append(actions);
  }

  function render(): void {
    if (!stateRef) return;
    const all = listJournalQuests(stateRef);
    const rows =
      activeTab === "completed"
        ? all.filter((r) => r.status === "completed")
        : all.filter((r) => r.status === "active" || r.status === "ready");

    if (selectedId && !rows.some((r) => r.id === selectedId)) selectedId = null;
    if (!selectedId && rows.length > 0) {
      selectedId =
        rows.find((r) => r.status === "ready")?.id ?? rows[0]!.id;
    }

    list.replaceChildren();
    if (rows.length === 0) {
      list.append(
        el(
          "p",
          "questlog-list-empty",
          activeTab === "completed"
            ? "Пока нет завершенных заданий."
            : "Пока нет активных заданий. Загляните в ратушу.",
        ),
      );
    } else {
      const ready = rows.filter((r) => r.status === "ready");
      const active = rows.filter((r) => r.status === "active");
      const completed = rows.filter((r) => r.status === "completed");
      const groups: { label: string | null; items: typeof rows }[] =
        activeTab === "completed"
          ? [{ label: null, items: completed }]
          : [
              { label: ready.length && active.length ? "Готовы к сдаче" : null, items: ready },
              { label: ready.length && active.length ? "Активные" : null, items: active },
            ];

      for (const group of groups) {
        if (group.items.length === 0) continue;
        if (group.label) list.append(el("div", "questlog-section-label", group.label));
        for (const row of group.items) {
          const btn = el(
            "button",
            `questlog-quest-btn${row.status === "ready" ? " is-ready" : ""}${row.id === selectedId ? " is-selected" : ""}`,
          );
          btn.type = "button";
          btn.setAttribute("role", "option");
          btn.setAttribute("aria-selected", row.id === selectedId ? "true" : "false");
          btn.append(el("span", "questlog-quest-name", row.name));
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

  tabActive.addEventListener("click", () => setTab("active"));
  tabDone.addEventListener("click", () => setTab("completed"));
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
