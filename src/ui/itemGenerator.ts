import { SCHOOL_LABEL } from "../abilities/definitions";
import { AFFIX_CATALOG } from "../items/affixCatalog";
import { generateItem } from "../items/generate";
import { deniedStatsForSlot, familiesForSlot, isStatAllowedOnSlot } from "../items/slotRules";
import { ALL_EQUIP_SLOTS, isSchoolItemSlot, SLOT_LABEL, type EquipSlotId } from "../items/slots";
import {
  RARITY_AFFIX_COUNT,
  RARITY_LABEL,
  type ItemDef,
  type ItemRarity,
} from "../items/types";
import {
  CORE_STAT_IDS,
  FAMILY_LABEL,
  STAT_CAPS,
  STAT_DESC,
  STAT_LABEL,
  capLabelForStat,
  formatStatValue,
  isSchoolDamageStat,
  type AffixFamily,
  type StatId,
} from "../stats/statIds";
import "./itemGenerator.css";

export interface ItemGeneratorApi {
  isOpen(): boolean;
  close(): void;
}

const RARITIES: ItemRarity[] = ["common", "uncommon", "rare", "yellow", "epic"];

const FAMILY_OF_STAT: Partial<Record<StatId, AffixFamily>> = Object.fromEntries(
  AFFIX_CATALOG.filter((a) => !isSchoolDamageStat(a.statId)).map((a) => [a.statId, a.family]),
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

function formatStatName(id: StatId): string {
  if (isSchoolDamageStat(id)) {
    const school = id.slice("schoolDamage:".length) as keyof typeof SCHOOL_LABEL;
    return `Урон школы (${SCHOOL_LABEL[school] ?? school})`;
  }
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
  const title = el("h2", "igen-title", "Генератор предметов");
  title.id = "igen-title";
  const closeBtn = el("button", "ctrl-btn", "Закрыть");
  closeBtn.type = "button";
  head.append(title, closeBtn);

  const body = el("div", "igen-body");
  const bench = buildBench();
  const reference = el("div", "igen-reference");
  const side = el("div", "igen-side");
  side.append(buildSlotsSection(), buildRulesSection());
  reference.append(buildParamsSection(), side);
  body.append(bench.root, reference);

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
    if (root.hidden) {
      if (
        !document.getElementById("grimoire")?.hidden ||
        !document.getElementById("bestiary")?.hidden ||
        !document.getElementById("character")?.hidden
      ) {
        return;
      }
      ev.preventDefault();
      onOpen();
      open();
    } else {
      ev.preventDefault();
      close();
    }
  });

  return {
    isOpen: () => !root.hidden,
    close,
  };
}

function buildBench(): { root: HTMLElement } {
  const root = el("section", "igen-bench");
  root.append(el("h3", "igen-section-title", "Тестовый стенд"));

  const controls = el("div", "igen-controls");

  const slotSelect = el("select", "igen-select") as HTMLSelectElement;
  for (const slot of ALL_EQUIP_SLOTS) {
    const opt = el("option", "", SLOT_LABEL[slot]);
    opt.value = slot;
    slotSelect.append(opt);
  }
  slotSelect.value = "mainhand";

  const raritySelect = el("select", "igen-select") as HTMLSelectElement;
  for (const rarity of RARITIES) {
    const [lo, hi] = RARITY_AFFIX_COUNT[rarity];
    const count = lo === hi ? `${lo}` : `${lo}-${hi}`;
    const opt = el("option", "", `${RARITY_LABEL[rarity]} (${count} афф.)`);
    opt.value = rarity;
    raritySelect.append(opt);
  }
  raritySelect.value = "rare";

  const ilvlInput = el("input", "igen-input") as HTMLInputElement;
  ilvlInput.type = "number";
  ilvlInput.min = "1";
  ilvlInput.max = "100";
  ilvlInput.value = "10";

  const genBtn = el("button", "igen-gen-btn", "Сгенерировать");
  genBtn.type = "button";

  controls.append(
    field("Слот", slotSelect),
    field("Редкость", raritySelect),
    field("Уровень предмета", ilvlInput),
    genBtn,
  );

  const result = el("div", "igen-result");
  result.append(el("p", "igen-empty", "Нажми \"Сгенерировать\", чтобы увидеть предмет."));

  const note = el(
    "p",
    "igen-note",
    "Каждая генерация создаёт новый предмет в памяти стенда. На экипировку героя не влияет.",
  );

  genBtn.addEventListener("click", () => {
    const slot = slotSelect.value as EquipSlotId;
    const rarity = raritySelect.value as ItemRarity;
    const itemLevel = Math.max(1, Math.min(100, Number(ilvlInput.value) || 1));
    ilvlInput.value = String(itemLevel);
    const item = generateItem({
      slot,
      rarity,
      itemLevel,
      learnedSchools: ["air", "ice"],
    });
    result.replaceChildren(renderItemCard(item));
  });

  root.append(controls, note, result);
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

  card.append(
    el("h4", "igen-card-name", item.name),
    el(
      "div",
      "igen-card-meta",
      `${RARITY_LABEL[item.rarity]} · ${SLOT_LABEL[item.slot]} · ур. ${item.itemLevel}`,
    ),
  );

  if (item.schoolTag) {
    card.append(el("div", "igen-card-meta", `Школа: ${SCHOOL_LABEL[item.schoolTag]}`));
  }
  if (item.weapon) {
    card.append(
      el(
        "div",
        "igen-card-line",
        `Базовый урон оружия: ${item.weapon.damageMin}-${item.weapon.damageMax}`,
      ),
      el("div", "igen-card-line", `Базовый кулдаун: ${item.weapon.baseCd.toFixed(1)} с`),
      el(
        "div",
        "igen-card-line",
        `Дальность: ${item.weapon.reach} · ${item.weapon.range === "melee" ? "ближний" : "дальний"}`,
      ),
    );
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
        el("div", "igen-card-affix prefix", `${a.label}: ${formatStatValue(a.statId, a.value)}`),
      );
    }
  }
  if (suffixes.length) {
    card.append(el("div", "igen-card-group", "Suffix"));
    for (const a of suffixes) {
      card.append(
        el("div", "igen-card-affix suffix", `${a.label}: ${formatStatValue(a.statId, a.value)}`),
      );
    }
  }
  return card;
}

function buildParamsSection(): HTMLElement {
  const section = el("section", "igen-section");
  section.append(el("h3", "igen-section-title", "Параметры героя"));
  section.append(
    el(
      "p",
      "igen-note",
      "Все % складываются плоско. Нет local % на предмете. Нет брони-rating. Энергощит вне v1.",
    ),
  );

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

  // School damage row (summary)
  const schoolRow = el("tr");
  schoolRow.append(
    el("td", "", "Урон школы (по школам)"),
    el("td", "", "плоский %"),
    el("td", "", FAMILY_LABEL.school),
    el("td", "", capLabelForStat("schoolDamage:air")),
    el(
      "td",
      "igen-desc",
      "Только на оружии и аксессуаре. Складывается с уроном способностей до капа 100% на пакет. Дроп оружия изученных школ весит выше.",
    ),
  );
  tbody.append(schoolRow);
  table.append(tbody);
  scroll.append(table);
  section.classList.add("igen-section-params");
  section.append(scroll);
  return section;
}

function typeLabel(id: StatId): string {
  if (id === "hpRegen" || id === "manaRegen") return "flat / сек";
  if (STAT_CAPS[id] !== undefined || id === "abilityDamage" || id.startsWith("school")) return "плоский %";
  return "flat";
}

function buildSlotsSection(): HTMLElement {
  const section = el("section", "igen-section");
  section.append(el("h3", "igen-section-title", "Правила по слотам"));
  section.append(
    el(
      "p",
      "igen-note",
      "Категория задаёт пул аффиксов слота. Отдельный deny-лист режет конкретные статы даже внутри разрешённой категории.",
    ),
  );

  const table = el("table", "igen-table igen-table-slots");
  const thead = el("thead");
  const headRow = el("tr");
  for (const h of ["Слот", "Категории", "Может роллить", "Запрещено", "Школа"]) {
    headRow.append(el("th", "", h));
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = el("tbody");
  for (const slot of ALL_EQUIP_SLOTS) {
    const allowed = affixesForSlot(slot);
    const denied = deniedStatsForSlot(slot);
    const families = familiesForSlot(slot).map((f) => FAMILY_LABEL[f]).join(", ");
    const allowedNames = uniqueLabels(allowed.map((a) => formatStatName(a.statId))).join(", ");
    const deniedNames = denied.map((id) => formatStatName(id as StatId)).join(", ") || "-";
    const school = isSchoolItemSlot(slot) ? "да" : "нет";

    const tr = el("tr");
    tr.append(
      el("td", "igen-slot-name", SLOT_LABEL[slot]),
      el("td", "", families),
      el("td", "igen-allow", allowedNames || "-"),
      el("td", "igen-deny", deniedNames),
      el("td", "", school),
    );
    tbody.append(tr);
  }
  table.append(tbody);
  section.append(table);
  return section;
}

function buildRulesSection(): HTMLElement {
  const section = el("section", "igen-section");
  section.append(el("h3", "igen-section-title", "Редкость и роллы"));

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
    rare: "Два ролла. На школьном предмете с blue+ стараемся дать school-аффикс.",
    yellow: "3-4 ролла.",
    epic: "4-5 роллов. Легендарки в генератор не входят.",
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
    "Школьные предметы: основная рука, левая рука, аксессуар.",
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
