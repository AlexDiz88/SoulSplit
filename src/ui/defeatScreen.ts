import "./hubScreen.css";

export interface DefeatScreenApi {
  show(): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface DefeatScreenHandlers {
  onHub: () => void;
  onRetry: () => void;
  onCharacter: () => void;
  onInventory: () => void;
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

export function mountDefeatScreen(handlers: DefeatScreenHandlers): DefeatScreenApi {
  const root = el("div", "meta-screen");
  root.id = "defeat-screen";
  root.hidden = true;
  const panel = el("div", "meta-panel");
  panel.append(el("h1", "meta-brand", "Поражение"));
  panel.append(
    el("p", "meta-summary", "Герой пал. Лут и опыт не получены. Экип можно сменить перед повтором."),
  );
  const actions = el("div", "meta-actions");
  const btnRetry = el("button", "meta-btn meta-btn-primary", "Повторить зону");
  btnRetry.type = "button";
  const btnChar = el("button", "meta-btn", "Персонаж");
  btnChar.type = "button";
  const btnInv = el("button", "meta-btn", "Инвентарь");
  btnInv.type = "button";
  const btnHub = el("button", "meta-btn", "В хаб");
  btnHub.type = "button";
  actions.append(btnRetry, btnChar, btnInv, btnHub);
  panel.append(actions);
  root.append(panel);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  btnRetry.addEventListener("click", () => handlers.onRetry());
  btnChar.addEventListener("click", () => handlers.onCharacter());
  btnInv.addEventListener("click", () => handlers.onInventory());
  btnHub.addEventListener("click", () => handlers.onHub());

  return {
    show() {
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
