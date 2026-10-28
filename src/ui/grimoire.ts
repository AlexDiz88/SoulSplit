import { abilityIconUrl, cardsInAspect, GRIMOIRE_ASPECTS, type AbilityCard, type AbilityZone } from "../abilities/catalog";

type PhoneView = "aspects" | "list" | "detail";

export interface GrimoireApi {
  refresh(): void;
  /** На узком портретном экране возвращает на предыдущий шаг. Иначе false. */
  back(): boolean;
}

const PORTRAIT = window.matchMedia("(max-width: 480px)");

export function mountGrimoire(mountEl: HTMLElement): GrimoireApi {
  mountEl.classList.add("grimoire-embedded");

  const windowEl = document.createElement("div");
  windowEl.className = "grimoire-window grimoire-embedded-window";
  windowEl.dataset.phoneView = "aspects";

  const head = document.createElement("div");
  head.className = "grimoire-head grimoire-embedded-head";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.id = "grimoire-back";
  backBtn.className = "ctrl-btn grimoire-back";
  backBtn.textContent = "Назад";
  backBtn.hidden = true;
  const title = document.createElement("h2");
  title.id = "grimoire-title";
  title.className = "grimoire-embedded-title";
  title.textContent = "Гримуар";
  head.append(backBtn, title);

  const body = document.createElement("div");
  body.className = "grimoire-body";
  const aspectList = document.createElement("div");
  aspectList.id = "grimoire-aspects";
  aspectList.className = "grimoire-aspects";
  const abilityList = document.createElement("div");
  abilityList.id = "grimoire-list";
  abilityList.className = "grimoire-list";
  const detail = document.createElement("aside");
  detail.id = "grimoire-detail";
  detail.className = "grimoire-detail";
  body.append(aspectList, abilityList, detail);
  windowEl.append(head, body);
  mountEl.append(windowEl);

  let aspectId = GRIMOIRE_ASPECTS.find((aspect) => cardsInAspect(aspect.id).length > 0)?.id ?? GRIMOIRE_ASPECTS[0]!.id;
  let cardId: string | null = null;
  let view: PhoneView = "aspects";

  const aspectById = (id: string) => GRIMOIRE_ASPECTS.find((aspect) => aspect.id === id) ?? GRIMOIRE_ASPECTS[0]!;

  const syncChrome = (): void => {
    const phone = PORTRAIT.matches;
    windowEl.dataset.phoneView = view;
    const aspect = aspectById(aspectId);
    const card = cardsInAspect(aspectId).find((item) => item.id === cardId) ?? null;
    backBtn.hidden = !phone || view === "aspects";
    if (!phone || view === "aspects") title.textContent = "Гримуар";
    else if (view === "list") title.textContent = aspect.name;
    else title.textContent = card?.name ?? aspect.name;
  };

  const renderDetail = (card: AbilityCard | null): void => {
    detail.replaceChildren();
    detail.style.removeProperty("--aspect");
    if (!card) {
      const empty = document.createElement("p");
      empty.className = "grimoire-empty";
      empty.textContent = "Выберите способность.";
      detail.append(empty);
      return;
    }
    const aspect = aspectById(card.aspectId);
    detail.style.setProperty("--aspect", aspect.color);

    const detailHead = document.createElement("div");
    detailHead.className = "grimoire-detail-head";
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
    meta.textContent = card.aspect;
    heading.append(name, iconId, meta);
    detailHead.append(img, heading);

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
      detailHead,
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
    const cards = cardsInAspect(aspectId);
    if (!cards.length) {
      cardId = null;
      const empty = document.createElement("p");
      empty.className = "grimoire-empty";
      empty.textContent = "В этом аспекте пока нет способностей.";
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
      const rowImg = document.createElement("img");
      rowImg.src = abilityIconUrl(card);
      rowImg.alt = "";
      const text = document.createElement("span");
      text.className = "grimoire-copy";
      const rowName = document.createElement("span");
      rowName.className = "grimoire-name";
      rowName.textContent = card.name;
      const status = document.createElement("span");
      const statusLabel = displayStatus(card.status);
      status.className = `grimoire-status${statusClass(statusLabel)}`;
      status.textContent = statusLabel;
      text.append(rowName, status);
      row.append(rowImg, text);
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

  const renderAspects = (): void => {
    aspectList.replaceChildren();
    for (const aspect of GRIMOIRE_ASPECTS) {
      const count = cardsInAspect(aspect.id).length;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "grimoire-aspect";
      btn.classList.toggle("active", aspect.id === aspectId);
      btn.style.setProperty("--aspect", aspect.color);
      const aspectName = document.createElement("span");
      aspectName.textContent = aspect.name;
      const badge = document.createElement("b");
      badge.textContent = String(count);
      btn.append(aspectName, badge);
      btn.addEventListener("click", () => {
        aspectId = aspect.id;
        cardId = null;
        view = "list";
        renderAspects();
        renderAbilities();
        syncChrome();
      });
      aspectList.append(btn);
    }
  };

  const refresh = (): void => {
    view = PORTRAIT.matches ? "aspects" : "list";
    renderAspects();
    renderAbilities();
    syncChrome();
  };

  backBtn.addEventListener("click", () => {
    if (view === "detail") view = "list";
    else view = "aspects";
    syncChrome();
  });

  PORTRAIT.addEventListener("change", () => {
    if (!PORTRAIT.matches) view = "list";
    syncChrome();
  });

  return {
    refresh,
    back() {
      if (!PORTRAIT.matches || view === "aspects") return false;
      if (view === "detail") view = "list";
      else view = "aspects";
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
  if (status === "под вопросом") return " review";
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
  if (token === ".") return "zone-cell";
  return "zone-cell hit";
}
