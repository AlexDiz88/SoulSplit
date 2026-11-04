import type { GameState } from "../meta/gameState";
import { trackedQuestViews } from "../quests/questLog";
import "./questTracker.css";

export interface QuestTrackerApi {
  refresh(state: GameState | null): void;
  setVisible(visible: boolean): void;
  destroy(): void;
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

export function mountQuestTracker(): QuestTrackerApi {
  const side = el("div", "quest-side");
  side.hidden = true;

  const tracker = el("div", "quest-tracker");
  tracker.setAttribute("aria-label", "Трекер заданий");
  side.append(tracker);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(side);

  let allowVisible = false;
  let lastState: GameState | null = null;

  function paint(): void {
    if (!allowVisible || !lastState) {
      side.hidden = true;
      tracker.replaceChildren();
      return;
    }
    const views = trackedQuestViews(lastState);
    if (views.length === 0) {
      side.hidden = true;
      tracker.replaceChildren();
      return;
    }
    tracker.replaceChildren();
    for (const v of views) {
      const card = el("article", `quest-tracker-card${v.ready ? " is-ready" : ""}`);
      card.append(el("h3", "quest-tracker-name", v.name));
      if (v.ready) {
        card.append(el("p", "quest-tracker-ready-hint", "Сдать в ратуше"));
      }
      const lines = el("ul", "quest-tracker-lines");
      for (const line of v.lines) {
        lines.append(
          el("li", `quest-tracker-line${line.done ? " is-done" : ""}`, line.text),
        );
      }
      card.append(lines);
      tracker.append(card);
    }
    side.hidden = false;
  }

  return {
    refresh(state) {
      lastState = state;
      paint();
    },
    setVisible(visible) {
      allowVisible = visible;
      paint();
    },
    destroy() {
      side.remove();
    },
  };
}
