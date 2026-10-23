import type { GameState, ZoneId } from "../meta/gameState";
import { isZoneUnlocked, ZONES } from "../meta/zones";
import "./hubScreen.css";

export interface ZoneSelectApi {
  show(state: GameState): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface ZoneSelectHandlers {
  onBack: () => void;
  onStartZone: (zoneId: ZoneId) => void;
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

export function mountZoneSelectScreen(handlers: ZoneSelectHandlers): ZoneSelectApi {
  const root = el("div", "meta-screen");
  root.id = "zone-select-screen";
  root.hidden = true;
  const panel = el("div", "meta-panel");
  panel.append(el("h1", "meta-brand", "Выбор зоны"));
  const list = el("div", "meta-zone-list");
  const btnBack = el("button", "meta-btn", "Назад в хаб");
  btnBack.type = "button";
  panel.append(list, btnBack);
  root.append(panel);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  btnBack.addEventListener("click", () => handlers.onBack());

  return {
    show(state) {
      list.replaceChildren();
      for (const zone of Object.values(ZONES)) {
        const unlocked = isZoneUnlocked(zone.id, state.hero.level, state.unlockedZones);
        const card = el("div", "meta-zone-card");
        card.append(el("h3", undefined, zone.name));
        card.append(el("p", undefined, zone.description));
        card.append(
          el(
            "div",
            "meta-zone-meta",
            `ilvl ${zone.itemLevel} - рекомендуется ур. ${zone.minLevel}`,
          ),
        );
        const btn = el(
          "button",
          "meta-btn meta-btn-primary",
          unlocked ? "В бой" : zone.id === "ruins" ? "Нужен 3 уровень" : "Закрыто",
        );
        btn.type = "button";
        btn.disabled = !unlocked;
        btn.addEventListener("click", () => handlers.onStartZone(zone.id));
        card.append(btn);
        list.append(card);
      }
      root.hidden = false;
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
