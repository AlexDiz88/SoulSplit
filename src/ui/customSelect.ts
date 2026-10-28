import { isPhoneUi } from "../art/menuBackground";

const WRAP_CLASS = "ui-custom-select";

function closeAllExcept(except: HTMLElement | null): void {
  for (const node of document.querySelectorAll(`.${WRAP_CLASS}.is-open`)) {
    if (!(node instanceof HTMLElement)) continue;
    if (except && node === except) continue;
    node.classList.remove("is-open");
    const list = node.querySelector<HTMLElement>(".ui-custom-select-list");
    const trigger = node.querySelector<HTMLButtonElement>(".ui-custom-select-trigger");
    if (list) list.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }
}

let docCloseBound = false;

function ensureDocCloseListener(): void {
  if (docCloseBound) return;
  docCloseBound = true;
  document.addEventListener(
    "pointerdown",
    (ev) => {
      const target = ev.target;
      if (!(target instanceof Node)) return;
      for (const open of document.querySelectorAll(`.${WRAP_CLASS}.is-open`)) {
        if (open.contains(target)) return;
      }
      closeAllExcept(null);
    },
    true,
  );
  window.addEventListener("keydown", (ev) => {
    if (ev.code === "Escape") closeAllExcept(null);
  });
}

function refreshList(select: HTMLSelectElement, wrap: HTMLElement): void {
  const list = wrap.querySelector<HTMLElement>(".ui-custom-select-list");
  const trigger = wrap.querySelector<HTMLButtonElement>(".ui-custom-select-trigger");
  if (!list || !trigger) return;

  list.replaceChildren();
  const current = select.value;
  for (const opt of select.options) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ui-custom-select-option";
    item.textContent = opt.textContent ?? "";
    item.dataset.value = opt.value;
    item.setAttribute("role", "option");
    const selected = opt.value === current;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-selected", selected ? "true" : "false");
    item.addEventListener("click", (ev) => {
      ev.stopPropagation();
      select.value = opt.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      wrap.classList.remove("is-open");
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.textContent = select.selectedOptions[0]?.textContent ?? "—";
      refreshList(select, wrap);
    });
    list.append(item);
  }
  trigger.textContent = select.selectedOptions[0]?.textContent ?? "—";
}

export function mountCustomSelect(select: HTMLSelectElement): void {
  if (!isPhoneUi()) return;
  if (select.closest(`.${WRAP_CLASS}`)) return;

  ensureDocCloseListener();

  const wrap = document.createElement("div");
  wrap.className = WRAP_CLASS;
  select.parentNode?.insertBefore(wrap, select);
  wrap.append(select);

  select.classList.add("ui-custom-select-native");
  select.tabIndex = -1;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "ui-custom-select-trigger";
  for (const cls of select.classList) {
    if (cls !== "ui-custom-select-native") trigger.classList.add(cls);
  }
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const list = document.createElement("div");
  list.className = "ui-custom-select-list";
  list.hidden = true;
  list.setAttribute("role", "listbox");

  wrap.append(trigger, list);

  trigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const open = wrap.classList.contains("is-open");
    if (open) {
      wrap.classList.remove("is-open");
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      return;
    }
    closeAllExcept(wrap);
    refreshList(select, wrap);
    wrap.classList.add("is-open");
    list.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  });

  const observer = new MutationObserver(() => refreshList(select, wrap));
  observer.observe(select, { childList: true, subtree: true });
  select.addEventListener("change", () => refreshList(select, wrap));

  refreshList(select, wrap);
}

export function syncCustomSelectsIn(container: HTMLElement): void {
  if (!isPhoneUi()) return;
  for (const node of container.querySelectorAll("select")) {
    if (node instanceof HTMLSelectElement) mountCustomSelect(node);
  }
}

export function removeCustomSelectsIn(container: HTMLElement): void {
  for (const wrap of [...container.querySelectorAll(`.${WRAP_CLASS}`)]) {
    if (!(wrap instanceof HTMLElement)) continue;
    const select = wrap.querySelector("select");
    if (!(select instanceof HTMLSelectElement)) {
      wrap.remove();
      continue;
    }
    select.classList.remove("ui-custom-select-native");
    select.tabIndex = 0;
    wrap.parentNode?.insertBefore(select, wrap);
    wrap.remove();
  }
}
