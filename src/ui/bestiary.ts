import {
  abilityDisplayName,
  abilityIconUrlForRef,
  isPassiveAbilityRef,
} from "../abilities/catalog";
import { enemyAtkRange } from "../combat/enemies";
import { enemyPortraitUrl, loadEnemyCards, type EnemyCard } from "../combat/enemyCatalog";

export interface BestiaryTooltipHost {
  showAbilityRef(anchor: HTMLElement, ref: string): void;
  hideAbilityRef(): void;
  canHoverAbilityRef(): boolean;
}

export interface BestiaryApi {
  refresh(): void;
  /** На узком экране: из карточки врага назад к списку. */
  back(): boolean;
}

const PORTRAIT = window.matchMedia("(max-width: 480px)");

type PhoneView = "list" | "detail";

function displayEnemyStatus(status: string): string {
  if (status === "прототип" || status === "взято") return "одобрено";
  return status;
}

function enemyStatusClass(status: string): string {
  if (status === "черновик") return " draft";
  if (status === "одобрено") return " approved";
  if (status === "отказ") return " rejected";
  if (status === "под вопросом") return " review";
  return "";
}

function statLine(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "bestiary-stat";
  const name = document.createElement("span");
  name.textContent = label;
  const val = document.createElement("b");
  val.textContent = value;
  row.append(name, val);
  return row;
}

function abilityIconsRow(
  refs: string[],
  host: BestiaryTooltipHost,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "bestiary-stat bestiary-abilities-row";
  const label = document.createElement("span");
  label.textContent = "Способности";
  const icons = document.createElement("div");
  icons.className = "bestiary-ability-icons";

  for (const ref of refs) {
    const btn = document.createElement("button");
    btn.type = "button";
    const passive = isPassiveAbilityRef(ref);
    btn.className = `skill-btn has-art bestiary-ability-icon${passive ? " skill-passive" : ""}`;
    btn.setAttribute("aria-label", abilityDisplayName(ref));
    const img = document.createElement("img");
    img.className = "skill-icon";
    img.src = abilityIconUrlForRef(ref);
    img.alt = "";
    img.draggable = false;
    btn.append(img);

    btn.addEventListener("mouseenter", () => {
      if (!host.canHoverAbilityRef()) return;
      host.showAbilityRef(btn, ref);
    });
    btn.addEventListener("mouseleave", () => {
      if (!host.canHoverAbilityRef()) return;
      host.hideAbilityRef();
    });
    btn.addEventListener("focus", () => {
      if (!host.canHoverAbilityRef()) return;
      host.showAbilityRef(btn, ref);
    });
    btn.addEventListener("blur", () => {
      if (!host.canHoverAbilityRef()) return;
      host.hideAbilityRef();
    });

    icons.append(btn);
  }

  row.append(label, icons);
  return row;
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

export function mountBestiary(mountEl: HTMLElement, tooltipHost: BestiaryTooltipHost): BestiaryApi {
  mountEl.classList.add("bestiary-embedded");

  const shell = el("div", "bestiary-window bestiary-embedded-window");
  shell.dataset.phoneView = "list";

  const subhead = el("div", "bestiary-subhead");
  const backBtn = el("button", "ctrl-btn bestiary-back", "Назад") as HTMLButtonElement;
  backBtn.type = "button";
  backBtn.hidden = true;
  const subTitle = el("span", "bestiary-subtitle", "Бестиарий");
  subhead.append(backBtn, subTitle);

  const filters = el("div", "bestiary-filters");
  filters.setAttribute("role", "search");
  filters.setAttribute("aria-label", "Фильтры бестиария");

  const filterGroup = el("select", "bestiary-filter-select") as HTMLSelectElement;
  filterGroup.id = "bestiary-filter-group";
  const filterLevel = el("select", "bestiary-filter-select") as HTMLSelectElement;
  filterLevel.id = "bestiary-filter-level";
  const filterRegion = el("select", "bestiary-filter-select") as HTMLSelectElement;
  filterRegion.id = "bestiary-filter-region";
  const filterReset = el("button", "ctrl-btn bestiary-filter-reset", "Сброс фильтров") as HTMLButtonElement;
  filterReset.type = "button";

  filters.append(
    labelField("Группа", filterGroup),
    labelField("Уровень", filterLevel),
    labelField("Регион", filterRegion),
    filterReset,
  );

  const body = el("div", "bestiary-body");
  const list = el("div", "bestiary-list");
  list.id = "bestiary-list";
  const detail = el("aside", "bestiary-detail", "Выберите врага, чтобы увидеть характеристики.");
  detail.id = "bestiary-detail";
  body.append(list, detail);

  shell.append(subhead, filters, body);
  mountEl.append(shell);

  let view: PhoneView = "list";
  let activeCard: EnemyCard | null = null;

  const syncChrome = (): void => {
    const phone = PORTRAIT.matches;
    shell.dataset.phoneView = phone ? view : "list";
    backBtn.hidden = !phone || view === "list";
    subTitle.textContent =
      phone && view === "detail" && activeCard ? activeCard.name : "Бестиарий";
  };

  const fillSelectOptions = (select: HTMLSelectElement, values: string[], allLabel: string): void => {
    const prev = select.value;
    select.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel;
    select.append(all);
    for (const value of values) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.append(opt);
    }
    select.value = values.includes(prev) ? prev : "";
  };

  const syncFilterOptions = (): void => {
    const cards = loadEnemyCards();
    const groups = [...new Set(cards.map((c) => c.group).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ru"),
    );
    const levels = [...new Set(cards.map((c) => String(c.baseLevel)))].sort(
      (a, b) => Number(a) - Number(b),
    );
    const regions = [...new Set(cards.map((c) => c.region).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ru"),
    );
    fillSelectOptions(filterGroup, groups, "Все");
    fillSelectOptions(filterLevel, levels, "Все");
    fillSelectOptions(filterRegion, regions, "Все");
  };

  const filteredCards = (): EnemyCard[] => {
    const group = filterGroup.value;
    const level = filterLevel.value;
    const region = filterRegion.value;
    return loadEnemyCards().filter((card) => {
      if (group && card.group !== group) return false;
      if (level && String(card.baseLevel) !== level) return false;
      if (region && card.region !== region) return false;
      return true;
    });
  };

  const clearDetail = (): void => {
    tooltipHost.hideAbilityRef();
    activeCard = null;
    detail.textContent = "Выберите врага, чтобы увидеть характеристики.";
    syncChrome();
  };

  const showDetail = (card: EnemyCard): void => {
    tooltipHost.hideAbilityRef();
    activeCard = card;
    detail.replaceChildren();
    const portrait = document.createElement("img");
    portrait.className = "bestiary-detail-portrait";
    portrait.src = enemyPortraitUrl(card);
    portrait.alt = card.name;
    const title = document.createElement("div");
    title.className = "bestiary-detail-name";
    title.textContent = card.name;
    const portraitId = document.createElement("div");
    portraitId.className = "grimoire-icon-id";
    portraitId.textContent = card.portrait;
    const status = document.createElement("span");
    const statusLabel = displayEnemyStatus(card.status);
    status.className = `grimoire-status${enemyStatusClass(statusLabel)}`;
    status.textContent = statusLabel;
    const atkRange = enemyAtkRange(card.atk);
    const atkLabel =
      atkRange.min === atkRange.max ? String(atkRange.min) : `${atkRange.min}-${atkRange.max}`;
    detail.append(
      portrait,
      title,
      portraitId,
      status,
      statLine("Уровень", String(card.baseLevel)),
      statLine("Здоровье", String(card.hp)),
      statLine("Урон", atkLabel),
      statLine("Кулдаун", card.cd),
      statLine("Дистанция", String(card.reach)),
      statLine("Появление", card.spawnRowsLabel),
    );
    if (card.group) detail.append(statLine("Группа", card.group));
    if (card.region) detail.append(statLine("Регион", card.region));
    if (card.abilities && card.abilities !== "-" && card.abilities !== "нет") {
      const refs = card.abilities
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part && part !== "-" && part !== "нет");
      if (refs.length) {
        detail.append(abilityIconsRow(refs, tooltipHost));
      }
    }
    if (card.description) {
      const desc = document.createElement("div");
      desc.className = "bestiary-desc";
      const label = document.createElement("span");
      label.className = "bestiary-desc-label";
      label.textContent = "Описание";
      const text = document.createElement("div");
      text.className = "bestiary-desc-text";
      text.textContent = card.description;
      desc.append(label, text);
      detail.append(desc);
    }
    if (PORTRAIT.matches) {
      view = "detail";
    }
    syncChrome();
  };

  const fillList = (): void => {
    syncFilterOptions();
    list.replaceChildren();
    for (const card of filteredCards()) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "bestiary-row";
      const img = document.createElement("img");
      img.src = enemyPortraitUrl(card);
      img.alt = card.name;
      const text = document.createElement("span");
      text.className = "bestiary-copy";
      const name = document.createElement("span");
      name.className = "bestiary-name";
      name.textContent = card.name;
      const status = document.createElement("span");
      const statusLabel = displayEnemyStatus(card.status);
      status.className = `grimoire-status${enemyStatusClass(statusLabel)}`;
      status.textContent = statusLabel;
      const type = document.createElement("span");
      type.className = "bestiary-type";
      type.textContent = `уровень ${card.baseLevel}`;
      text.append(name, status, type);
      row.append(img, text);
      row.addEventListener("click", () => {
        for (const other of list.querySelectorAll(".bestiary-row")) {
          other.classList.remove("active");
        }
        row.classList.add("active");
        showDetail(card);
      });
      list.append(row);
    }
    clearDetail();
    view = "list";
    syncChrome();
  };

  const onFilterChange = (): void => {
    fillList();
  };

  filterGroup.addEventListener("change", onFilterChange);
  filterLevel.addEventListener("change", onFilterChange);
  filterRegion.addEventListener("change", onFilterChange);
  filterReset.addEventListener("click", () => {
    filterGroup.value = "";
    filterLevel.value = "";
    filterRegion.value = "";
    fillList();
  });

  backBtn.addEventListener("click", () => {
    view = "list";
    syncChrome();
  });

  PORTRAIT.addEventListener("change", () => {
    if (!PORTRAIT.matches) view = "list";
    syncChrome();
  });

  return {
    refresh() {
      fillList();
    },
    back() {
      if (!PORTRAIT.matches || view === "list") return false;
      view = "list";
      syncChrome();
      return true;
    },
  };
}

function labelField(label: string, control: HTMLElement): HTMLElement {
  const wrap = el("label", "bestiary-filter");
  wrap.append(el("span", "", label), control);
  return wrap;
}
