import "./hubScreen.css";
import "./defeatScreen.css";

export interface DefeatScreenApi {
  show(): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface DefeatScreenHandlers {
  onWake: () => void;
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
  const root = el("div", "meta-screen defeat-screen");
  root.id = "defeat-screen";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "defeat-title");

  const stage = el("div", "defeat-stage");

  const title = el("h1", "defeat-title");
  title.id = "defeat-title";
  title.setAttribute("aria-label", "Поражение");
  const glow = el("span", "defeat-title-glow", "Поражение");
  glow.setAttribute("aria-hidden", "true");
  const face = el("span", "defeat-title-face", "Поражение");
  title.append(glow, face);

  const summary = el(
    "p",
    "defeat-summary defeat-line",
    "Тьма отступает медленно. Каждое поражение не проходит бесследно. Но это ещё не конец.",
  );
  const penalty = el(
    "p",
    "defeat-penalty defeat-line",
    "(Пока вы были без сознания, вас ограбили. Потеряно 10% золота)",
  );

  const actions = el("div", "defeat-actions");
  const btnWake = el("button", "title-btn title-btn-primary defeat-wake-btn", "Очнуться");
  btnWake.type = "button";
  actions.append(btnWake);

  stage.append(title, summary, penalty, actions);
  root.append(stage);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  const onWakeClick = (): void => {
    handlers.onWake();
  };

  /** Пока экран открыт - глотаем хоткеи; алерт поверх может обработать свои клавиши. */
  const onKeyDown = (ev: KeyboardEvent): void => {
    if (root.hidden) return;
    const alertOpen = document.querySelector(".confirm-overlay:not([hidden])");
    if (alertOpen) return;
    if (ev.code === "Enter" || ev.code === "Space") {
      if (document.activeElement === btnWake) return;
      ev.preventDefault();
      ev.stopPropagation();
      btnWake.focus();
      handlers.onWake();
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
  };

  btnWake.addEventListener("click", onWakeClick);

  return {
    show() {
      root.hidden = false;
      window.addEventListener("keydown", onKeyDown, true);
      requestAnimationFrame(() => btnWake.focus());
    },
    hide() {
      root.hidden = true;
      window.removeEventListener("keydown", onKeyDown, true);
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown, true);
      btnWake.removeEventListener("click", onWakeClick);
      root.remove();
    },
  };
}
