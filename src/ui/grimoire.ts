import { abilityIconUrl, cardsInSchool, GRIMOIRE_SCHOOLS, type AbilityCard, type AbilityZone } from "../abilities/catalog";

type PhoneView = "schools" | "list" | "detail";

export interface GrimoireApi {
  isOpen(): boolean;
  close(): void;
  /** На узком портретном экране возвращает на предыдущий шаг. Иначе false. */
  back(): boolean;
}

const PORTRAIT = window.matchMedia("(max-width: 480px)");

export function mountGrimoire(onOpen: () => void): GrimoireApi {
  const root = document.getElementById("grimoire")!;
  const windowEl = root.querySelector<HTMLElement>(".grimoire-window")!;
  const title = document.getElementById("grimoire-title")!;
  const backBtn = document.getElementById("grimoire-back")!;
  const closeBtn = document.getElementById("grimoire-close")!;
  const schoolList = document.getElementById("grimoire-schools")!;
  const abilityList = document.getElementById("grimoire-list")!;
  const detail = document.getElementById("grimoire-detail")!;

  let schoolId = GRIMOIRE_SCHOOLS.find((school) => cardsInSchool(school.id).length > 0)?.id ?? GRIMOIRE_SCHOOLS[0]!.id;
  let cardId: string | null = null;
  let view: PhoneView = "schools";

  const schoolById = (id: string) => GRIMOIRE_SCHOOLS.find((school) => school.id === id) ?? GRIMOIRE_SCHOOLS[0]!;

  const syncChrome = (): void => {
    const phone = PORTRAIT.matches;
    windowEl.dataset.phoneView = view;
    const school = schoolById(schoolId);
    const card = cardsInSchool(schoolId).find((item) => item.id === cardId) ?? null;
    backBtn.hidden = !phone || view === "schools";
    if (!phone || view === "schools") title.textContent = "Гримуар";
    else if (view === "list") title.textContent = school.name;
    else title.textContent = card?.name ?? school.name;
  };

  const renderDetail = (card: AbilityCard | null): void => {
    detail.replaceChildren();
    detail.style.removeProperty("--school");
    if (!card) {
      const empty = document.createElement("p");
      empty.className = "grimoire-empty";
      empty.textContent = "Выберите способность.";
      detail.append(empty);
      return;
    }
    const school = schoolById(card.schoolId);
    detail.style.setProperty("--school", school.color);

    const head = document.createElement("div");
    head.className = "grimoire-detail-head";
    const img = document.createElement("img");
    img.src = abilityIconUrl(card);
    img.alt = "";
    const heading = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = card.name;
    const iconId = document.createElement("p");
    iconId.className = "grimoire-icon-id";
    iconId.textContent = card.icon;
    const meta = document.createElement("p");
    meta.className = "grimoire-kicker";
    meta.textContent = card.school;
    const status = document.createElement("span");
    const statusLabel = displayStatus(card.status);
    status.className = `grimoire-status${statusClass(statusLabel)}`;
    status.textContent = statusLabel;
    heading.append(name, iconId, meta, status);
    head.append(img, heading);

    const description = document.createElement("p");
    description.className = "grimoire-desc";
    description.textContent = card.description;

    const stats = document.createElement("div");
    stats.className = "grimoire-stats";
    stats.append(
      stat("Кулдаун", card.cooldown),
      stat("Мана", card.mana),
      stat("Тип", card.application),
      stat("Эффект", card.effect),
    );

    detail.append(
      head,
      description,
      stats,
      block("Зона", card.zoneLabel),
      numberBlock(card.numbers),
    );
    if (card.extra) detail.append(block("Дополнительно", card.extra));
    if (card.zone) detail.append(zoneBlock(card.zone));
  };

  const renderAbilities = (): void => {
    abilityList.replaceChildren();
    const cards = cardsInSchool(schoolId);
    if (!cards.length) {
      cardId = null;
      const empty = document.createElement("p");
      empty.className = "grimoire-empty";
      empty.textContent = "В этой школе пока нет способностей.";
      abilityList.append(empty);
      renderDetail(null);
      return;
    }
    if (!cards.some((card) => card.id === cardId)) {
      cardId = PORTRAIT.matches ? null : cards[0]!.id;
    }
    for (const card of cards) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "grimoire-row";
      row.classList.toggle("active", card.id === cardId);
      const img = document.createElement("img");
      img.src = abilityIconUrl(card);
      img.alt = "";
      const text = document.createElement("span");
      text.className = "grimoire-copy";
      const name = document.createElement("span");
      name.className = "grimoire-name";
      name.textContent = card.name;
      text.append(name);
      row.append(img, text);
      row.addEventListener("click", () => {
        cardId = card.id;
        view = "detail";
        renderAbilities();
        syncChrome();
      });
      abilityList.append(row);
    }
    renderDetail(cards.find((card) => card.id === cardId) ?? null);
  };

  const renderSchools = (): void => {
    schoolList.replaceChildren();
    for (const school of GRIMOIRE_SCHOOLS) {
      const count = cardsInSchool(school.id).length;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "grimoire-school";
      btn.classList.toggle("active", school.id === schoolId);
      btn.style.setProperty("--school", school.color);
      const name = document.createElement("span");
      name.textContent = school.name;
      const badge = document.createElement("b");
      badge.textContent = String(count);
      btn.append(name, badge);
      btn.addEventListener("click", () => {
        schoolId = school.id;
        cardId = null;
        view = "list";
        renderSchools();
        renderAbilities();
        syncChrome();
      });
      schoolList.append(btn);
    }
  };

  const open = (): void => {
    view = PORTRAIT.matches ? "schools" : "list";
    renderSchools();
    renderAbilities();
    syncChrome();
    root.hidden = false;
  };

  backBtn.addEventListener("click", () => {
    if (view === "detail") view = "list";
    else view = "schools";
    syncChrome();
  });
  closeBtn.addEventListener("click", () => {
    root.hidden = true;
  });
  root.addEventListener("click", (ev) => {
    if (ev.target === root) root.hidden = true;
  });
  PORTRAIT.addEventListener("change", () => {
    if (root.hidden) return;
    if (!PORTRAIT.matches) view = "list";
    syncChrome();
  });

  document.getElementById("btn-grimoire")!.addEventListener("click", () => {
    onOpen();
    open();
  });

  return {
    isOpen: () => !root.hidden,
    close: () => {
      root.hidden = true;
    },
    back: () => {
      if (root.hidden || !PORTRAIT.matches || view === "schools") return false;
      if (view === "detail") view = "list";
      else view = "schools";
      syncChrome();
      return true;
    },
  };
}

/** Старые метки прототип/взято показываем как "одобрено". */
function displayStatus(status: string): string {
  if (status === "прототип" || status === "взято") return "одобрено";
  return status;
}

function statusClass(status: string): string {
  if (status === "черновик") return " draft";
  if (status === "одобрено") return " approved";
  if (status === "отказ") return " rejected";
  return "";
}

function stat(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "grimoire-stat";
  const name = document.createElement("span");
  name.textContent = label;
  const val = document.createElement("b");
  val.textContent = value || "-";
  row.append(name, val);
  return row;
}

function block(label: string, value: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "grimoire-block";
  const name = document.createElement("span");
  name.textContent = label;
  const text = document.createElement("p");
  text.textContent = value || "-";
  wrap.append(name, text);
  return wrap;
}

function numberBlock(lines: string[]): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "grimoire-block";
  const name = document.createElement("span");
  name.textContent = "Числа";
  wrap.append(name);
  if (!lines.length) {
    const text = document.createElement("p");
    text.textContent = "-";
    wrap.append(text);
    return wrap;
  }
  const list = document.createElement("ul");
  for (const line of lines) {
    const item = document.createElement("li");
    item.textContent = line;
    list.append(item);
  }
  wrap.append(list);
  return wrap;
}

function zoneBlock(zone: AbilityZone): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "grimoire-zone";
  const name = document.createElement("span");
  name.textContent = "Поле";
  const far = document.createElement("div");
  far.className = "zone-caption";
  far.textContent = "дальний ряд";
  const board = document.createElement("div");
  board.className = "zone-board";
  const corner = document.createElement("span");
  board.append(corner);
  for (let col = 0; col < 4; col++) {
    const label = document.createElement("span");
    label.className = "zone-index";
    label.textContent = String(col);
    board.append(label);
  }
  zone.rows.forEach((row, rowIndex) => {
    const label = document.createElement("span");
    label.className = "zone-index";
    label.textContent = String(rowIndex);
    board.append(label);
    for (const token of row) {
      const cell = document.createElement("span");
      cell.className = cellClass(token);
      cell.textContent = token === "." ? "" : token;
      board.append(cell);
    }
  });
  const near = document.createElement("div");
  near.className = "zone-caption";
  near.textContent = "ближний ряд · к герою";
  wrap.append(name, far, board, near);
  const meta = [zone.anchor && `якорь: ${zone.anchor}`, zone.damage && `урон: ${zone.damage}`].filter(Boolean).join(" · ");
  if (meta) {
    const line = document.createElement("p");
    line.className = "zone-meta";
    line.textContent = meta;
    wrap.append(line);
  }
  if (zone.notes.length) {
    const list = document.createElement("ul");
    list.className = "zone-notes";
    for (const note of zone.notes) {
      const item = document.createElement("li");
      item.textContent = note;
      list.append(item);
    }
    wrap.append(list);
  }
  return wrap;
}

function cellClass(token: string): string {
  if (token === "+") return "zone-cell aim-empty";
  if (token === "X") return "zone-cell hit aim";
  if (token === "." ) return "zone-cell";
  return "zone-cell hit";
}
