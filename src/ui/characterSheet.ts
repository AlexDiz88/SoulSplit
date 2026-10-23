import { SCHOOL_LABEL } from "../abilities/definitions";
import type { Unit } from "../combat/Unit";
import "./characterSheet.css";

export type EquipSlotId =
  | "head"
  | "chest"
  | "neck"
  | "shoulders"
  | "hands"
  | "ring1"
  | "ring2"
  | "waist"
  | "legs"
  | "feet"
  | "trinket"
  | "mainhand"
  | "offhand";

type GlyphId =
  | "head"
  | "chest"
  | "neck"
  | "shoulders"
  | "hands"
  | "ring"
  | "waist"
  | "legs"
  | "feet"
  | "trinket"
  | "mainhand"
  | "offhand";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface SlotDef {
  label: string;
  glyph: GlyphId;
}

interface ItemDef {
  name: string;
  rarity: Rarity;
  lines: string[];
}

export interface CharacterSheetApi {
  isOpen(): boolean;
  close(): void;
  setHero(hero: Unit): void;
}

const SLOTS: Record<EquipSlotId, SlotDef> = {
  head: { label: "Голова", glyph: "head" },
  chest: { label: "Туловище", glyph: "chest" },
  neck: { label: "Шея", glyph: "neck" },
  shoulders: { label: "Плечи", glyph: "shoulders" },
  hands: { label: "Перчатки", glyph: "hands" },
  ring1: { label: "Палец", glyph: "ring" },
  ring2: { label: "Палец", glyph: "ring" },
  waist: { label: "Пояс", glyph: "waist" },
  legs: { label: "Ноги", glyph: "legs" },
  feet: { label: "Обувь", glyph: "feet" },
  trinket: { label: "Аксессуар", glyph: "trinket" },
  mainhand: { label: "Основная рука", glyph: "mainhand" },
  offhand: { label: "Левая рука", glyph: "offhand" },
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Обычный",
  uncommon: "Необычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

/** Временные предметы для оценки вида ячеек, пока нет системы экипировки. */
const DEMO_ITEMS: Partial<Record<EquipSlotId, ItemDef>> = {
  head: { name: "Шлем ледяного стража", rarity: "rare", lines: ["+120 к здоровью", "+8 к броне"] },
  chest: { name: "Кираса северного ветра", rarity: "epic", lines: ["+180 к здоровью", "+10 к броне"] },
  neck: { name: "Амулет угасшей звезды", rarity: "epic", lines: ["+6% к силе способностей"] },
  shoulders: { name: "Наплечники северного ветра", rarity: "epic", lines: ["+90 к здоровью", "+3% к уклонению"] },
  ring1: { name: "Кольцо тихой воды", rarity: "uncommon", lines: ["+2% к шансу крита"] },
  feet: { name: "Сапоги следопыта", rarity: "uncommon", lines: ["+4% к скорости атаки"] },
  trinket: { name: "Осколок вечной зимы", rarity: "legendary", lines: ["Ледяные способности -10% к кулдауну"] },
  mainhand: { name: "Клинок инея", rarity: "legendary", lines: ["+18 к атаке", "Атаки замедляют цель"] },
  offhand: { name: "Ясеневый щит", rarity: "common", lines: ["+12 к броне", "+5% к блоку"] },
};

const GLYPHS: Record<GlyphId, string> = {
  head: '<path d="M4.5 14a7.5 7.5 0 0 1 15 0v5h-4.5v-4.5h-6V19H4.5z"/><path d="M12 6.5v8M9 10h6"/>',
  chest: '<path d="M7 4.5h10l2.5 3.5v12.5H4.5V8z"/><path d="M7 4.5L4.5 8M17 4.5l2.5 3.5M9 4.5v3.5h6V4.5"/><path d="M12 10v7"/>',
  neck: '<path d="M5.5 3.5c.5 5.5 3.2 8.5 6.5 8.5s6-3 6.5-8.5"/><path d="M12 12.5l3 3.5-3 4.5-3-4.5z"/>',
  shoulders: '<path d="M3 15c0-5.5 4-9 9-9s9 3.5 9 9l-3.2 2.2-2.3-3.2h-7l-2.3 3.2z"/><path d="M8 9.5l1.2 2M16 9.5l-1.2 2"/>',
  hands: '<path d="M7 21v-6.5L4.5 11l1.6-1.2L8 12V5.5a1.2 1.2 0 0 1 2.4 0V11V4a1.2 1.2 0 0 1 2.4 0v7V5a1.2 1.2 0 0 1 2.4 0v6.5V7.5a1.2 1.2 0 0 1 2.4 0V15l-1.8 6z"/><path d="M7 18h10"/>',
  ring: '<circle cx="12" cy="14.5" r="5.5"/><path d="M12 3l2.5 3.5L12 9 9.5 6.5z"/>',
  waist: '<path d="M2.5 10h19v5h-19z"/><path d="M9.5 8.5h5v8h-5z"/><path d="M12 11v2.5"/>',
  legs: '<path d="M6 3.5h12l1.2 17h-5L12 10.5l-2.2 10h-5z"/><path d="M6 7h12"/>',
  feet: '<path d="M8 3h5.5v9.5l6 3.2V20H5.5v-4.2L8 14.5z"/><path d="M5.5 17.5h14M8 7h5.5"/>',
  trinket: '<path d="M12 2.8l7.5 4.4v9.6L12 21.2l-7.5-4.4V7.2z"/><circle cx="12" cy="12" r="2.6"/><path d="M12 6v3.4M12 14.6V18"/>',
  mainhand: '<path d="M20 4l-1 4-9.5 9.5-3-3L16 5z"/><path d="M5.5 12.5l6 6M8 17l-3.5 3.5"/>',
  offhand: '<path d="M12 3l8 3v6.2c0 4.8-3.6 7.9-8 8.8-4.4-.9-8-4-8-8.8V6z"/><path d="M12 6.5v11M7.5 11h9"/>',
};

/** Сетка paperdoll: центр / левая / правая ось. Оружие отдельно снизу. */
const BODY_SLOTS: EquipSlotId[] = [
  "head",
  "chest",
  "waist",
  "legs",
  "feet",
  "shoulders",
  "hands",
  "neck",
  "ring1",
  "ring2",
  "trinket",
];

const BODY_AREAS: Record<(typeof BODY_SLOTS)[number], string> = {
  head: "head",
  chest: "chest",
  waist: "belt",
  legs: "legs",
  feet: "feet",
  shoulders: "shld",
  hands: "hand",
  neck: "neck",
  ring1: "r1",
  ring2: "r2",
  trinket: "t1",
};

const HAND_SLOTS: EquipSlotId[] = ["mainhand", "offhand"];

export function mountCharacterSheet(onOpen: () => void): CharacterSheetApi {
  const hud = document.getElementById("hud")!;
  const root = el("div", "cs-overlay");
  root.id = "character";
  root.hidden = true;

  const win = el("div", "cs-window");
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-labelledby", "cs-title");

  const head = el("header", "cs-head");
  const title = el("h2", "cs-title", "Персонаж");
  title.id = "cs-title";
  const actions = el("div", "cs-actions");
  const demoBtn = el("button", "ctrl-btn cs-demo", "Предметы");
  demoBtn.type = "button";
  demoBtn.title = "Показать или скрыть демо-предметы";
  const closeBtn = el("button", "ctrl-btn cs-close", "Закрыть");
  closeBtn.type = "button";
  actions.append(demoBtn, closeBtn);
  head.append(title, actions);

  const body = el("div", "cs-body");
  const dollWrap = el("div", "cs-doll-wrap");
  const stats = el("aside", "cs-stats");
  body.append(dollWrap, stats);

  const tip = el("div", "cs-tip");
  tip.hidden = true;

  win.append(head, body, tip);
  root.append(win);
  hud.append(root);

  let showItems = true;
  let hero: Unit | null = null;

  const items = (): Partial<Record<EquipSlotId, ItemDef>> => (showItems ? DEMO_ITEMS : {});

  const render = (): void => {
    tip.hidden = true;
    demoBtn.classList.toggle("active", showItems);
    dollWrap.replaceChildren(renderDoll(items()));
    stats.replaceChildren(...renderStats(hero));
  };

  const open = (): void => {
    render();
    root.hidden = false;
  };
  const close = (): void => {
    root.hidden = true;
    tip.hidden = true;
  };

  const showTip = (slot: HTMLElement): void => {
    const id = slot.dataset.slot as EquipSlotId | undefined;
    if (!id) return;
    const item = items()[id];
    tip.replaceChildren();
    tip.dataset.rarity = item?.rarity ?? "";
    if (item) {
      tip.append(el("div", "cs-tip-name", item.name), el("div", "cs-tip-meta", `${RARITY_LABEL[item.rarity]} · ${SLOTS[id].label}`));
      for (const line of item.lines) tip.append(el("div", "cs-tip-line", line));
    } else {
      tip.append(el("div", "cs-tip-name", SLOTS[id].label), el("div", "cs-tip-meta", "Пусто"));
    }
    tip.hidden = false;
    const winRect = win.getBoundingClientRect();
    const rect = slot.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let left = rect.right - winRect.left + 10;
    if (left + tipRect.width > winRect.width - 8) left = rect.left - winRect.left - tipRect.width - 10;
    const top = Math.min(Math.max(8, rect.top - winRect.top), winRect.height - tipRect.height - 8);
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${top}px`;
  };

  dollWrap.addEventListener("pointerover", (ev) => {
    const slot = (ev.target as Element).closest<HTMLElement>(".cs-slot");
    if (slot) showTip(slot);
  });
  dollWrap.addEventListener("pointerout", (ev) => {
    const slot = (ev.target as Element).closest(".cs-slot");
    const next = ev.relatedTarget as Element | null;
    if (slot && (!next || !slot.contains(next))) tip.hidden = true;
  });

  demoBtn.addEventListener("click", () => {
    showItems = !showItems;
    render();
  });
  closeBtn.addEventListener("click", close);
  root.addEventListener("click", (ev) => {
    if (ev.target === root) close();
  });

  document.getElementById("btn-character")!.addEventListener("click", () => {
    onOpen();
    open();
  });

  window.addEventListener("keydown", (ev) => {
    const target = ev.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (ev.code !== "KeyC" || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (root.hidden) {
      if (!document.getElementById("grimoire")?.hidden || !document.getElementById("bestiary")?.hidden) return;
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
    setHero(next: Unit) {
      hero = next;
      if (!root.hidden) render();
    },
  };
}

function renderDoll(items: Partial<Record<EquipSlotId, ItemDef>>): HTMLElement {
  const doll = el("div", "cs-doll");
  const body = el("div", "cs-doll-body");
  for (const id of BODY_SLOTS) {
    const slot = slotButton(id, items[id]);
    slot.style.gridArea = BODY_AREAS[id];
    body.append(slot);
  }
  const hands = el("div", "cs-doll-hands");
  for (const id of HAND_SLOTS) {
    const slot = slotButton(id, items[id]);
    slot.classList.add("cs-slot-hand");
    hands.append(slot);
  }
  doll.append(body, hands);
  return doll;
}

function slotButton(id: EquipSlotId, item: ItemDef | undefined): HTMLButtonElement {
  const def = SLOTS[id];
  const btn = el("button", `cs-slot${item ? ` filled rarity-${item.rarity}` : ""}`);
  btn.type = "button";
  btn.dataset.slot = id;
  btn.setAttribute("aria-label", item ? `${def.label}: ${item.name}` : `${def.label}: пусто`);
  const face = el("span", "cs-slot-face");
  face.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[def.glyph]}</svg>`;
  btn.append(face, el("span", "cs-slot-label", def.label));
  return btn;
}

function renderStats(hero: Unit | null): HTMLElement[] {
  const s = hero?.stats;
  const card = el("div", "cs-hero");
  const portrait = el("div", "cs-hero-portrait");
  if (hero?.portraitUrl) {
    const img = document.createElement("img");
    img.src = hero.portraitUrl;
    img.alt = hero.name;
    portrait.append(img);
  }
  const copy = el("div", "cs-hero-copy");
  copy.append(
    el("h3", "", hero?.name ?? "Герой"),
    el("p", "", hero ? `Школа: ${SCHOOL_LABEL[hero.school]}` : "Нет данных"),
    el("p", "cs-level", "Уровень 1"),
  );
  card.append(portrait, copy);

  const reach = s?.reach ?? 1;
  return [
    card,
    statGroup("Основные", [
      ["Здоровье", s ? String(s.maxHp) : "-"],
      ["Атака", s ? String(s.atk) : "-"],
      ["Скорость атаки", s ? `${s.autoAttackCd.toFixed(1)} с` : "-"],
      ["Дальность", `${reach} ${reach === 1 ? "ряд" : reach < 5 ? "ряда" : "рядов"}`],
    ]),
    statGroup("Защита", [
      ["Броня", "0"],
      ["Уклонение", "0%"],
      ["Блок", "0%"],
      ["Сопротивление", "0%"],
    ]),
    statGroup("Нападение", [
      ["Шанс крита", "5%"],
      ["Урон крита", "150%"],
      ["Сила способностей", "100%"],
      ["Перезарядка", "0%"],
    ]),
  ];
}

function statGroup(title: string, rows: [string, string][]): HTMLElement {
  const group = el("section", "cs-group");
  group.append(el("h4", "", title));
  for (const [label, value] of rows) {
    const row = el("div", "cs-stat");
    row.append(el("span", "", label), el("b", "", value));
    group.append(row);
  }
  return group;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
