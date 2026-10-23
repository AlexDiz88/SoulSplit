import "./hubScreen.css";

export interface DefeatScreenApi {
  show(): void;
  hide(): void;
  isOpen(): boolean;
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

export function mountDefeatScreen(onHub: () => void): DefeatScreenApi {
  const root = el("div", "meta-screen");
  root.id = "defeat-screen";
  root.hidden = true;
  const panel = el("div", "meta-panel");
  panel.append(el("h1", "meta-brand", "Поражение"));
  panel.append(el("p", "meta-summary", "Айра пала. Лут и опыт не получены."));
  const btn = el("button", "meta-btn meta-btn-primary", "В хаб");
  btn.type = "button";
  btn.addEventListener("click", onHub);
  panel.append(btn);
  root.append(panel);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

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
