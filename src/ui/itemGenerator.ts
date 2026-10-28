import type { Unit } from "../combat/Unit";
import { AFFIX_CATALOG, formatRolledAffix } from "../items/affixCatalog";
import {
  baseVariantLabel,
  formatRolledItemBase,
  ITEM_BASE_CATALOG,
  type ItemBaseDef,
  type ItemBaseVariantKey,
} from "../items/baseCatalog";
import { generateItem, itemDisplayName } from "../items/generate";
import { addItemToInventory } from "../items/inventory";
import { OFFHAND_TYPES } from "../items/offhandTypes";
import { deniedStatsForSlot, familiesForSlot, isStatAllowedOnSlot } from "../items/slotRules";
import { ALL_EQUIP_SLOTS, isAspectItemSlot, SLOT_LABEL, type EquipSlotId } from "../items/slots";
import {
  RARITY_AFFIX_COUNT,
  RARITY_LABEL,
  type ItemDef,
  type ItemRarity,
} from "../items/types";
import {
  WEAPON_TYPES,
  WEAPON_TYPE_BY_ID,
  isWeaponTypeId,
  type WeaponTypeId,
} from "../items/weaponTypes";
import {
  ASPECT_PILLAR_ROWS,
  aspectSchoolLabel,
} from "../abilities/aspectPillars";
import { ASPECT_HEX } from "../abilities/aspects";
import {
  CORE_STAT_IDS,
  FAMILY_LABEL,
  STAT_CAPS,
  STAT_DESC,
  STAT_LABEL,
  capLabelForStat,
  isAspectDamageStat,
  type AffixFamily,
  type StatId,
} from "../stats/statIds";
import "./itemGenerator.css";

export interface ItemGeneratorApi {
  isOpen(): boolean;
  open(): void;
  close(): void;
  setHero(hero: Unit): void;
  setOnInventoryChanged(fn: () => void): void;
  setShowToast(fn: (text: string) => void): void;
}

const RARITIES: ItemRarity[] = ["common", "uncommon", "magic", "rare", "epic"];

const FAMILY_OF_STAT: Partial<Record<StatId, AffixFamily>> = Object.fromEntries(
  AFFIX_CATALOG.filter((a) => !isAspectDamageStat(a.statId)).map((a) => [a.statId, a.family]),
);

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

function affixesForSlot(slot: EquipSlotId) {
  const families = new Set(familiesForSlot(slot));
  return AFFIX_CATALOG.filter((a) => {
    if (!families.has(a.family)) return false;
    return isStatAllowedOnSlot(slot, a.statId);
  });
}

const ASPECT_BONUS_LABEL = "Урон/Бонус к способностям аспекта";

function formatStatName(id: StatId): string {
  if (isAspectDamageStat(id)) return ASPECT_BONUS_LABEL;
  return STAT_LABEL[id as keyof typeof STAT_LABEL] ?? id;
}

export function mountItemGenerator(onOpen: () => void): ItemGeneratorApi {
  const hud = document.getElementById("hud")!;
  const root = el("div", "igen-overlay");
  root.id = "item-generator";
  root.hidden = true;

  const win = el("div", "igen-window");
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-labelledby", "igen-title");

  const head = el("header", "igen-head");
  const title = el("h2", "igen-title", "Панель разработчика");
  title.id = "igen-title";
  const closeBtn = el("button", "ctrl-btn", "Закрыть");
  closeBtn.type = "button";
  head.append(title, closeBtn);

  let hero: Unit | null = null;
  let onInventoryChanged: (() => void) | null = null;
  let showToast: ((text: string) => void) | null = null;

  const body = el("div", "igen-body");
  const bench = buildBench({
    getHero: () => hero,
    onInventoryChanged: () => onInventoryChanged?.(),
    showToast: (text) => showToast?.(text),
  });
  const tabs = buildTabs();
  body.append(bench.root, tabs);

  win.append(head, body);
  root.append(win);
  hud.append(root);

  const open = (): void => {
    root.hidden = false;
  };
  const close = (): void => {
    root.hidden = true;
  };

  closeBtn.addEventListener("click", close);
  root.addEventListener("click", (ev) => {
    if (ev.target === root) close();
  });

  document.getElementById("btn-item-generator")!.addEventListener("click", () => {
    onOpen();
    open();
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
    if (ev.code !== "KeyG" || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    ev.preventDefault();
    if (root.hidden) {
      onOpen();
      open();
    } else {
      close();
    }
  });

  return {
    isOpen: () => !root.hidden,
    open: () => {
      onOpen();
      open();
    },
    close,
    setHero(next) {
      hero = next;
    },
    setOnInventoryChanged(fn) {
      onInventoryChanged = fn;
    },
    setShowToast(fn) {
      showToast = fn;
    },
  };
}

function buildBench(hooks: {
  getHero: () => Unit | null;
  onInventoryChanged: () => void;
  showToast: (text: string) => void;
}): { root: HTMLElement } {
  const root = el("section", "igen-bench");

  const controls = el("div", "igen-controls");

  const slotSelect = el("select", "igen-select") as HTMLSelectElement;
  for (const slot of ALL_EQUIP_SLOTS) {
    const opt = el("option", "", SLOT_LABEL[slot]);
    opt.value = slot;
    slotSelect.append(opt);
  }
  slotSelect.value = "feet";

  const weaponSelect = el("select", "igen-select") as HTMLSelectElement;
  const randomWeaponOpt = el("option", "", "Случайно");
  randomWeaponOpt.value = "";
  weaponSelect.append(randomWeaponOpt);
  for (const type of WEAPON_TYPES) {
    const opt = el("option", "", type.name);
    opt.value = type.id;
    weaponSelect.append(opt);
  }
  const weaponField = field("Вид оружия", weaponSelect);
  weaponField.hidden = true;

  const syncWeaponField = (): void => {
    const isWeapon = slotSelect.value === "mainhand";
    weaponField.hidden = !isWeapon;
    if (!isWeapon) weaponSelect.value = "";
  };
  slotSelect.addEventListener("change", syncWeaponField);

  const raritySelect = el("select", "igen-select") as HTMLSelectElement;
  for (const rarity of RARITIES) {
    const [lo, hi] = RARITY_AFFIX_COUNT[rarity];
    const count = lo === hi ? `${lo}` : `${lo}-${hi}`;
    const opt = el("option", "", `${RARITY_LABEL[rarity]} (${count})`);
    opt.value = rarity;
    raritySelect.append(opt);
  }
  raritySelect.value = "magic";

  const ilvlInput = el("input", "igen-input") as HTMLInputElement;
  ilvlInput.type = "number";
  ilvlInput.min = "1";
  ilvlInput.max = "100";
  ilvlInput.value = "10";

  const genBtn = el("button", "igen-gen-btn", "Сгенерировать");
  genBtn.type = "button";

  controls.append(
    field("Слот", slotSelect),
    weaponField,
    field("Редкость", raritySelect),
    field("Уровень предмета", ilvlInput),
    genBtn,
  );

  const result = el("div", "igen-result");
  let pendingItem: ItemDef | null = null;

  const addBtn = el("button", "igen-add-btn", "Добавить в инвентарь") as HTMLButtonElement;
  addBtn.type = "button";
  addBtn.hidden = true;
  addBtn.disabled = true;

  const resetAddBtn = (): void => {
    addBtn.textContent = "Добавить в инвентарь";
    addBtn.disabled = false;
    addBtn.hidden = false;
  };

  const markAdded = (): void => {
    addBtn.textContent = "Добавлено";
    addBtn.disabled = true;
  };

  genBtn.addEventListener("click", () => {
    const slot = slotSelect.value as EquipSlotId;
    const rarity = raritySelect.value as ItemRarity;
    const itemLevel = Math.max(1, Math.min(100, Number(ilvlInput.value) || 1));
    ilvlInput.value = String(itemLevel);
    const forceWeaponType: WeaponTypeId | undefined =
      slot === "mainhand" && isWeaponTypeId(weaponSelect.value)
        ? weaponSelect.value
        : undefined;
    pendingItem = generateItem({
      slot,
      rarity,
      itemLevel,
      forceWeaponType,
      learnedAspects: ["air", "ice"],
    });
    result.replaceChildren(renderItemCard(pendingItem), addBtn);
    resetAddBtn();
  });

  addBtn.addEventListener("click", () => {
    if (!pendingItem || addBtn.disabled) return;
    const hero = hooks.getHero();
    if (!hero) {
      hooks.showToast("Герой ещё не создан");
      return;
    }
    const idx = addItemToInventory(hero.inventory, pendingItem);
    if (idx < 0) {
      hooks.showToast("Инвентарь полон");
      return;
    }
    hooks.onInventoryChanged();
    markAdded();
  });

  root.append(controls, result);
  return { root };
}

function field(label: string, control: HTMLElement): HTMLElement {
  const wrap = el("label", "igen-field");
  wrap.append(el("span", "", label), control);
  return wrap;
}

function renderItemCard(item: ItemDef): HTMLElement {
  const card = el("article", "igen-card");
  card.dataset.rarity = item.rarity;

  const head = el("div", "igen-card-head");
  if (item.icon) {
    const iconFace = el("div", "igen-card-icon");
    const img = el("img", "igen-card-icon-img") as HTMLImageElement;
    img.src = item.icon;
    img.alt = "";
    img.draggable = false;
    iconFace.append(img);
    head.append(iconFace);
  }
  const text = el("div", "igen-card-head-text");
  const slotMeta = item.weapon?.typeId
    ? (WEAPON_TYPE_BY_ID[item.weapon.typeId]?.name ?? SLOT_LABEL[item.slot])
    : SLOT_LABEL[item.slot];
  text.append(
    el("h4", "igen-card-name", itemDisplayName(item)),
    el(
      "div",
      "igen-card-meta",
      `${RARITY_LABEL[item.rarity]} · ${slotMeta} · ур. ${item.itemLevel}`,
    ),
  );
  head.append(text);
  card.append(head);

  if (item.weapon) {
    card.append(
      el(
        "div",
        "igen-card-line",
        item.weapon.tierId
          ? `Базовый урон оружия: ${item.weapon.damageMin}-${item.weapon.damageMax} (${item.weapon.tierId})`
          : `Базовый урон оружия: ${item.weapon.damageMin}-${item.weapon.damageMax}`,
      ),
      el("div", "igen-card-line", `Базовый кулдаун: ${item.weapon.baseCd.toFixed(1)} с`),
      el(
        "div",
        "igen-card-line",
        `Дальность: ${item.weapon.reach} · ${item.weapon.range === "melee" ? "ближний" : "дальний"}`,
      ),
    );
  } else if (item.base) {
    card.append(el("div", "igen-card-group", "База"));
    card.append(el("div", "igen-card-affix base", formatRolledItemBase(item.base)));
  }

  if (!item.affixes.length) {
    card.append(el("div", "igen-card-meta", "Без аффиксов (обычный)"));
    return card;
  }

  const prefixes = item.affixes.filter((a) => a.affixSlot === "prefix");
  const suffixes = item.affixes.filter((a) => a.affixSlot === "suffix");

  if (prefixes.length) {
    card.append(el("div", "igen-card-group", "Prefix"));
    for (const a of prefixes) {
      card.append(
        el("div", "igen-card-affix prefix", formatRolledAffix(a)),
      );
    }
  }
  if (suffixes.length) {
    card.append(el("div", "igen-card-group", "Suffix"));
    for (const a of suffixes) {
      card.append(
        el("div", "igen-card-affix suffix", formatRolledAffix(a)),
      );
    }
  }
  return card;
}

function buildTabs(): HTMLElement {
  const wrap = el("div", "igen-tabs");
  const bar = el("div", "igen-tab-bar");

  type TabId = "params" | "aspects" | "weapons" | "bases" | "slots" | "rarity";
  const tabs: { id: TabId; label: string; active?: boolean }[] = [
    { id: "params", label: "Параметры героя", active: true },
    { id: "aspects", label: "Аспекты" },
    { id: "weapons", label: "Таблица оружия" },
    { id: "bases", label: "Базы предметов" },
    { id: "slots", label: "Правила по слотам" },
    { id: "rarity", label: "Редкость и роллы" },
  ];

  const buttons = new Map<TabId, HTMLButtonElement>();
  const panels = new Map<TabId, HTMLElement>();

  for (const tab of tabs) {
    const btn = el("button", `igen-tab${tab.active ? " active" : ""}`, tab.label) as HTMLButtonElement;
    btn.type = "button";
    btn.dataset.tab = tab.id;
    buttons.set(tab.id, btn);
    bar.append(btn);
  }

  const panelParams = el("div", "igen-tab-panel active");
  panelParams.dataset.panel = "params";
  panelParams.append(buildParamsSection());
  panels.set("params", panelParams);

  const panelAspects = el("div", "igen-tab-panel");
  panelAspects.dataset.panel = "aspects";
  panelAspects.hidden = true;
  panelAspects.append(buildAspectsSection());
  panels.set("aspects", panelAspects);

  const panelWeapons = el("div", "igen-tab-panel");
  panelWeapons.dataset.panel = "weapons";
  panelWeapons.hidden = true;
  panelWeapons.append(buildWeaponsSection());
  panels.set("weapons", panelWeapons);

  const panelBases = el("div", "igen-tab-panel");
  panelBases.dataset.panel = "bases";
  panelBases.hidden = true;
  panelBases.append(buildBasesSection());
  panels.set("bases", panelBases);

  const panelSlots = el("div", "igen-tab-panel");
  panelSlots.dataset.panel = "slots";
  panelSlots.hidden = true;
  panelSlots.append(buildSlotsSection());
  panels.set("slots", panelSlots);

  const panelRarity = el("div", "igen-tab-panel");
  panelRarity.dataset.panel = "rarity";
  panelRarity.hidden = true;
  panelRarity.append(buildRulesSection());
  panels.set("rarity", panelRarity);

  const setTab = (id: TabId): void => {
    for (const [tabId, btn] of buttons) {
      btn.classList.toggle("active", tabId === id);
    }
    for (const [tabId, panel] of panels) {
      const on = tabId === id;
      panel.classList.toggle("active", on);
      panel.hidden = !on;
    }
  };

  for (const [id, btn] of buttons) {
    btn.addEventListener("click", () => setTab(id));
  }

  wrap.append(
    bar,
    panelParams,
    panelAspects,
    panelWeapons,
    panelBases,
    panelSlots,
    panelRarity,
  );
  return wrap;
}

function buildAspectsSection(): HTMLElement {
  const section = el("section", "igen-section igen-section-aspects");
  section.append(
    el("h3", "igen-section-title", "Столбы школ"),
    el(
      "p",
      "igen-note",
      'Ориентир для генерации и отбора способностей (design/meta/ASPECTS.md). "-" = не столб школы, отдельные карточки могут быть исключением.',
    ),
  );

  const scroll = el("div", "igen-table-scroll");
  const table = el("table", "igen-table igen-table-aspects");
  const thead = el("thead");
  const headRow = el("tr");
  for (const h of [
    "Школа",
    "aspect_id",
    "Урон (тег)",
    "DoT / длительное",
    "Контроль / темп",
    "Защита / себя",
    "Метки и крючки",
  ]) {
    headRow.append(el("th", "", h));
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = el("tbody");
  for (const row of ASPECT_PILLAR_ROWS) {
    const tr = el("tr");
    const schoolCell = el("td", "igen-aspect-school");
    const swatch = el("span", "igen-aspect-swatch");
    swatch.style.backgroundColor = ASPECT_HEX[row.aspectId];
    schoolCell.append(swatch, document.createTextNode(aspectSchoolLabel(row.aspectId)));
    tr.append(
      schoolCell,
      el("td", "igen-mono", row.aspectId),
      el("td", "", row.damageTag),
      el("td", "", row.dot),
      el("td", "", row.control),
      el("td", "", row.defense),
      el("td", "igen-desc", row.hooks),
    );
    tbody.append(tr);
  }
  table.append(tbody);
  scroll.append(table);
  section.append(scroll);
  return section;
}

function variantKeyId(key: ItemBaseVariantKey): string {
  return key;
}

function buildBasesSection(): HTMLElement {
  const section = el("section", "igen-section");
  section.append(
    el("h3", "igen-section-title", "Базы предметов"),
    el(
      "p",
      "igen-note",
      "На предмете всегда ровно 1 база из пула слота/типа. Тиры F…A5 как у аффиксов. Дубли база↔аффикс разрешены. Оружие: урон + кулдаун (см. «Таблица оружия»).",
    ),
  );

  const scroll = el("div", "igen-table-scroll");
  const table = el("table", "igen-table");
  const thead = el("thead");
  const hr = el("tr");
  for (const h of ["Слот / тип", "Варианты базы", "variantKey", "Примечание"]) {
    hr.append(el("th", "", h));
  }
  thead.append(hr);
  table.append(thead);

  const tbody = el("tbody");

  type Group = { label: string; note: string; defs: ItemBaseDef[] };
  const groups: Group[] = [];

  const armorSlots: EquipSlotId[] = [
    "head",
    "chest",
    "shoulders",
    "hands",
    "waist",
    "legs",
    "feet",
    "neck",
    "ring1",
    "trinket",
  ];
  for (const slot of armorSlots) {
    const defs = ITEM_BASE_CATALOG.filter(
      (b) => b.pool.kind === "slot" && b.pool.slot === slot,
    );
    if (!defs.length) continue;
    const note =
      slot === "waist"
        ? "Заглушка: кол-во зелий (в sheet пока не суммируется)"
        : slot === "trinket"
          ? "aspectDamage задаёт aspectTag на любой редкости"
          : "";
    groups.push({
      label: slot === "ring1" ? "Кольцо (ring1/ring2)" : SLOT_LABEL[slot],
      note,
      defs,
    });
  }

  for (const oh of OFFHAND_TYPES) {
    const defs = ITEM_BASE_CATALOG.filter(
      (b) => b.pool.kind === "offhand" && b.pool.typeId === oh.id,
    );
    groups.push({
      label: oh.name,
      note:
        oh.id === "tome"
          ? "aspectDamage задаёт aspectTag на любой редкости"
          : "",
      defs,
    });
  }

  groups.push({
    label: "Оружие (mainhand)",
    note: "База = диапазон урона + кулдаун атаки по типу; тиры F…A5. См. вкладку «Таблица оружия».",
    defs: [],
  });

  for (const g of groups) {
    const tr = el("tr");
    tr.append(el("td", "", g.label));
    if (g.defs.length) {
      tr.append(
        el(
          "td",
          "",
          g.defs.map((d) => baseVariantLabel(d)).join(" / "),
        ),
        el(
          "td",
          "igen-mono",
          g.defs.map((d) => variantKeyId(d.variantKey)).join(", "),
        ),
      );
    } else {
      tr.append(el("td", "", "урон + кулдаун"), el("td", "igen-mono", "weapon"));
    }
    tr.append(el("td", "", g.note));
    tbody.append(tr);
  }

  table.append(tbody);
  scroll.append(table);
  section.append(scroll);
  return section;
}

function formatBaseWeaponDps(damageMin: number, damageMax: number, baseCd: number): string {
  if (baseCd <= 0) return "0.0";
  const dps = (damageMin + damageMax) / 2 / baseCd;
  return (Math.round(dps * 10) / 10).toFixed(1);
}

function baseWeaponDps(damageMin: number, damageMax: number, baseCd: number): number {
  if (baseCd <= 0) return 0;
  return (damageMin + damageMax) / 2 / baseCd;
}

type WeaponSortKey = "name" | "baseCd" | "damage" | "dps" | "reach";

function compareWeapons(
  a: (typeof WEAPON_TYPES)[number],
  b: (typeof WEAPON_TYPES)[number],
  key: WeaponSortKey,
  dir: 1 | -1,
): number {
  let cmp = 0;
  switch (key) {
    case "name":
      cmp = a.name.localeCompare(b.name, "ru");
      break;
    case "baseCd":
      cmp = a.baseCd - b.baseCd;
      break;
    case "damage":
      cmp = (a.damageMin + a.damageMax) / 2 - (b.damageMin + b.damageMax) / 2;
      break;
    case "dps":
      cmp =
        baseWeaponDps(a.damageMin, a.damageMax, a.baseCd) -
        baseWeaponDps(b.damageMin, b.damageMax, b.baseCd);
      break;
    case "reach":
      cmp = a.reach - b.reach;
      break;
  }
  if (cmp === 0) cmp = a.name.localeCompare(b.name, "ru");
  return cmp * dir;
}

function buildWeaponsSection(): HTMLElement {
  const section = el("section", "igen-section igen-section-weapons");
  section.append(
    el(
      "p",
      "igen-note",
      "Базовые значения на уровне предмета 1. Урон растёт с itemLevel, кулдаун фиксирован. Клик по заголовку - сортировка.",
    ),
  );

  const scroll = el("div", "igen-table-scroll");
  const table = el("table", "igen-table igen-table-sortable");
  const thead = el("thead");
  const headRow = el("tr");

  const columns: { key: WeaponSortKey; label: string }[] = [
    { key: "name", label: "Оружие" },
    { key: "baseCd", label: "Кулдаун" },
    { key: "damage", label: "Урон" },
    { key: "dps", label: "DPS" },
    { key: "reach", label: "Дистанция" },
  ];

  let sortKey: WeaponSortKey = "name";
  let sortDir: 1 | -1 = 1;
  const headerCells = new Map<WeaponSortKey, HTMLTableCellElement>();

  const syncHeaderMarks = (): void => {
    for (const [key, th] of headerCells) {
      const active = key === sortKey;
      th.classList.toggle("sorted", active);
      th.dataset.sortDir = active ? (sortDir === 1 ? "asc" : "desc") : "";
      const mark = th.querySelector(".igen-sort-mark");
      if (mark) mark.textContent = active ? (sortDir === 1 ? "▲" : "▼") : "";
    }
  };

  for (const col of columns) {
    const th = el("th", "igen-sort-th") as HTMLTableCellElement;
    th.tabIndex = 0;
    th.setAttribute("role", "button");
    th.setAttribute("aria-label", `Сортировать: ${col.label}`);
    th.append(document.createTextNode(col.label), el("span", "igen-sort-mark"));
    headerCells.set(col.key, th);
    th.addEventListener("click", () => {
      if (sortKey === col.key) sortDir = sortDir === 1 ? -1 : 1;
      else {
        sortKey = col.key;
        sortDir = 1;
      }
      renderRows();
    });
    th.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        th.click();
      }
    });
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = el("tbody");

  const renderRows = (): void => {
    const rows = [...WEAPON_TYPES].sort((a, b) => compareWeapons(a, b, sortKey, sortDir));
    tbody.replaceChildren();
    for (const type of rows) {
      const tr = el("tr");
      tr.append(
        el("td", "", type.name),
        el("td", "", `${type.baseCd.toFixed(1)} с`),
        el("td", "", `${type.damageMin}-${type.damageMax}`),
        el("td", "", formatBaseWeaponDps(type.damageMin, type.damageMax, type.baseCd)),
        el("td", "", String(type.reach)),
      );
      tbody.append(tr);
    }
    syncHeaderMarks();
  };

  table.append(tbody);
  scroll.append(table);
  section.append(scroll);
  renderRows();
  return section;
}

function buildParamsSection(): HTMLElement {
  const section = el("section", "igen-section igen-section-params");

  const scroll = el("div", "igen-table-scroll");
  const table = el("table", "igen-table");
  const thead = el("thead");
  const headRow = el("tr");
  for (const h of ["Параметр", "Тип", "Категория", "Кап", "Описание"]) {
    headRow.append(el("th", "", h));
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = el("tbody");
  for (const id of CORE_STAT_IDS) {
    const tr = el("tr");
    const family = FAMILY_OF_STAT[id];
    tr.append(
      el("td", "", STAT_LABEL[id]),
      el("td", "", typeLabel(id)),
      el("td", "", family ? FAMILY_LABEL[family] : "-"),
      el("td", "", capLabelForStat(id)),
      el("td", "igen-desc", STAT_DESC[id]),
    );
    tbody.append(tr);
  }

  const aspectRow = el("tr");
  aspectRow.append(
    el("td", "", ASPECT_BONUS_LABEL),
    el("td", "", "плоский %"),
    el("td", "", FAMILY_LABEL.aspect),
    el("td", "", capLabelForStat("aspectDamage:air")),
    el(
      "td",
      "igen-desc",
      "Только на оружии и аксессуаре, и только с редкости rare+. Складывается с уроном способностей до капа 100% на пакет. Дроп оружия изученных аспектов весит выше.",
    ),
  );
  tbody.append(aspectRow);
  table.append(tbody);
  scroll.append(table);
  section.append(scroll);
  return section;
}

function typeLabel(id: StatId): string {
  if (id === "hpRegen" || id === "manaRegen") return "flat / сек";
  if (STAT_CAPS[id] !== undefined || id === "abilityDamage" || id.startsWith("aspect")) return "плоский %";
  return "flat";
}

function buildSlotsSection(): HTMLElement {
  const section = el("section", "igen-section igen-section-slots");
  section.append(
    el(
      "p",
      "igen-note",
      "Категория задаёт пул аффиксов слота. Отдельный deny-лист режет конкретные статы даже внутри разрешённой категории.",
    ),
  );

  const grid = el("div", "igen-slot-grid");
  for (const slot of ALL_EQUIP_SLOTS) {
    const allowed = affixesForSlot(slot);
    const denied = deniedStatsForSlot(slot);
    const families = familiesForSlot(slot).map((f) => FAMILY_LABEL[f]);
    const allowedNames = uniqueLabels(allowed.map((a) => formatStatName(a.statId)));
    const deniedNames = denied.map((id) => formatStatName(id as StatId));
    const aspect = isAspectItemSlot(slot) ? "да" : "нет";

    const card = el("article", "igen-slot-card");
    const title = el("div", "igen-slot-card-head");
    title.append(
      el("h4", "igen-slot-card-title", SLOT_LABEL[slot]),
      el("span", "igen-slot-card-aspect", aspect === "да" ? "Аспект: да" : "Аспект: нет"),
    );
    card.append(title);
    card.append(slotBlock("Категории", families, ""));
    card.append(slotBlock("Может роллить", allowedNames, "igen-allow"));
    card.append(slotBlock("Запрещено", deniedNames, "igen-deny"));
    grid.append(card);
  }
  section.append(grid);
  return section;
}

function slotBlock(label: string, names: string[], className: string): HTMLElement {
  const block = el("div", "igen-slot-block");
  block.append(el("div", "igen-slot-block-label", label));
  if (!names.length) {
    block.append(el("div", className, "-"));
    return block;
  }
  const list = el("ul", `igen-stat-list ${className}`.trim());
  for (const name of names) {
    list.append(el("li", "", name));
  }
  block.append(list);
  return block;
}

function buildRulesSection(): HTMLElement {
  const section = el("section", "igen-section igen-section-rarity");

  const table = el("table", "igen-table");
  const thead = el("thead");
  const hr = el("tr");
  for (const h of ["Редкость", "Аффиксов", "Заметка"]) {
    hr.append(el("th", "", h));
  }
  thead.append(hr);
  table.append(thead);
  const tbody = el("tbody");
  const notes: Record<ItemRarity, string> = {
    common: "Белый. Только implicit оружия, если слот оружейный.",
    uncommon: "Один ролл. Prefix или suffix случайно.",
    magic: "Два ролла. Без бонуса аспекта.",
    rare: "3-4 ролла. На оружии/аксессуаре появляется aspectTag и aspect-аффикс.",
    epic: "4-5 роллов. Aspect как у rare. Легендарки в генератор не входят.",
  };
  for (const rarity of RARITIES) {
    const [lo, hi] = RARITY_AFFIX_COUNT[rarity];
    const tr = el("tr");
    tr.append(
      el("td", "", RARITY_LABEL[rarity]),
      el("td", "", lo === hi ? String(lo) : `${lo}-${hi}`),
      el("td", "igen-desc", notes[rarity]),
    );
    tbody.append(tr);
  }
  table.append(tbody);
  section.append(table);

  const list = el("ul", "igen-bullets");
  const bullets = [
    "Аффикс = statId + roll(min, max) по itemLevel (tiers в каталоге).",
    "Prefix / suffix заложены: в v1 любой аффикс может быть обоими.",
    "Базовый урон оружия и бонус атаки оружия - разные сущности.",
    "Аспектные предметы: оружие, левая рука, аксессуар.",
  ];
  for (const text of bullets) {
    list.append(el("li", "", text));
  }
  section.append(list);
  return section;
}

function uniqueLabels(labels: string[]): string[] {
  return [...new Set(labels)];
}
