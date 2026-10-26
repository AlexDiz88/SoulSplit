import "./itemIconPreview.css";

export interface ItemIconPreviewApi {
  isOpen(): boolean;
  open(): void;
  close(): void;
}

const PAGE_SIZE = 100;
const GRID_COLS = 10;
const GRID_ROWS = 10;

/** Заглушки стилей: `assets/art/items/image*`. */
const previewModules = import.meta.glob<{ default: string }>(
  "../../assets/art/items/image*.{png,webp,jpg,jpeg}",
  { eager: true },
);

interface PreviewEntry {
  name: string;
  url: string;
  sortKey: number;
}

function extractSortKey(name: string): number {
  const match = name.match(/(\d+)(?=\.[^.]+$)/);
  return match ? Number(match[1]) : -1;
}

function collectEntries(): PreviewEntry[] {
  const entries: PreviewEntry[] = [];
  for (const [path, mod] of Object.entries(previewModules)) {
    const name = path.split(/[/\\]/).pop() ?? path;
    entries.push({ name, url: mod.default, sortKey: extractSortKey(name) });
  }
  // Сначала самые свежие (больший номер в имени).
  entries.sort((a, b) => {
    if (b.sortKey !== a.sortKey) return b.sortKey - a.sortKey;
    return b.name.localeCompare(a.name, "en");
  });
  return entries;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function mountItemIconPreview(): ItemIconPreviewApi {
  const hud = document.getElementById("hud")!;
  const root = el("div", "iip-root");
  root.id = "item-icon-preview";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-labelledby", "iip-title");
  root.style.setProperty("--iip-cols", String(GRID_COLS));
  root.style.setProperty("--iip-rows", String(GRID_ROWS));

  const head = el("header", "iip-head");
  const title = el("h2", "iip-title", "Стили иконок");
  title.id = "iip-title";
  const count = el("span", "iip-count", "0");
  const closeBtn = el("button", "ctrl-btn", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Закрыть");
  head.append(title, count, closeBtn);

  const grid = el("div", "iip-grid");
  const empty = el("p", "iip-empty", "Нет файлов image* в assets/art/items/");

  const pager = el("div", "iip-pager");
  pager.hidden = true;
  const prevBtn = el("button", "ctrl-btn iip-page-btn", "‹");
  prevBtn.type = "button";
  prevBtn.setAttribute("aria-label", "Предыдущая страница");
  const pageLabel = el("span", "iip-page-label", "1 / 1");
  const nextBtn = el("button", "ctrl-btn iip-page-btn", "›");
  nextBtn.type = "button";
  nextBtn.setAttribute("aria-label", "Следующая страница");
  pager.append(prevBtn, pageLabel, nextBtn);

  root.append(head, grid, empty, pager);
  hud.append(root);

  let page = 0;
  let pageCount = 1;

  const render = (): void => {
    const entries = collectEntries();
    count.textContent = String(entries.length);
    pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    if (page >= pageCount) page = pageCount - 1;
    if (page < 0) page = 0;

    const start = page * PAGE_SIZE;
    const slice = entries.slice(start, start + PAGE_SIZE);

    grid.replaceChildren();
    empty.hidden = entries.length > 0;
    for (const entry of slice) {
      const cell = el("div", "iip-cell");
      cell.setAttribute("aria-label", entry.name);
      const face = el("span", "iip-cell-face");
      const img = el("img", "iip-cell-icon") as HTMLImageElement;
      img.src = entry.url;
      img.alt = entry.name;
      img.draggable = false;
      face.append(img);
      const label = el("span", "iip-cell-name", entry.name);
      cell.append(face, label);
      grid.append(cell);
    }

    const multi = pageCount > 1;
    pager.hidden = !multi;
    pageLabel.textContent = `${page + 1} / ${pageCount}`;
    prevBtn.disabled = page <= 0;
    nextBtn.disabled = page >= pageCount - 1;
  };

  const open = (): void => {
    page = 0;
    render();
    root.hidden = false;
  };
  const close = (): void => {
    root.hidden = true;
  };

  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", () => {
    if (page <= 0) return;
    page -= 1;
    render();
  });
  nextBtn.addEventListener("click", () => {
    if (page >= pageCount - 1) return;
    page += 1;
    render();
  });

  window.addEventListener("keydown", (ev) => {
    const target = ev.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return;
    }
    if (!root.hidden && pageCount > 1) {
      if (ev.code === "ArrowLeft" && !ev.repeat) {
        ev.preventDefault();
        if (page > 0) {
          page -= 1;
          render();
        }
        return;
      }
      if (ev.code === "ArrowRight" && !ev.repeat) {
        ev.preventDefault();
        if (page < pageCount - 1) {
          page += 1;
          render();
        }
        return;
      }
    }
    if (ev.code !== "KeyB" || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    ev.preventDefault();
    if (root.hidden) open();
    else close();
  });

  return {
    isOpen: () => !root.hidden,
    open,
    close,
  };
}
