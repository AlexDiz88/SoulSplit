import { ASPECT_LABEL } from "../abilities/definitions";
import type { Unit } from "../combat/Unit";
import type { EquipSlotId } from "../items/slots";
import type { ItemDef } from "../items/types";
import { autoAttackInterval } from "../stats/formulas";
import { getStat, aspectDamageOf } from "../stats/sheet";
import { formatStatValue, type StatId } from "../stats/statIds";
import { fillItemTooltip } from "./itemTooltip";
import "./characterSheet.css";

export type { EquipSlotId };

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

interface SlotDef {
  label: string;
  glyph: GlyphId;
}

/** full - портрет + параметры; gear - только слоты экипа (режим тайника). */
export type CharacterSheetMode = "full" | "gear";

export interface CharacterSheetApi {
  isOpen(): boolean;
  open(): void;
  close(): void;
  setMode(mode: CharacterSheetMode): void;
  getMode(): CharacterSheetMode;
  setHero(hero: Unit): void;
  /** Вызывается при открытии / закрытии (для компаньон-окна инвентаря). */
  setOnVisibilityChange(fn: (open: boolean) => void): void;
  /** Смена режима при открытом окне (тайник ↔ полный лист). */
  setOnModeChange(fn: (mode: CharacterSheetMode) => void): void;
  setCanChangeEquipment(fn: () => boolean): void;
  setOnEquipmentChanged(fn: () => void): void;
  setShowToast(fn: (text: string) => void): void;
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
const BODY_SLOTS = [
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
] as const satisfies readonly EquipSlotId[];

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
  head.append(title);

  const closeBtn = el("button", "cs-x");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.innerHTML = '<span aria-hidden="true"></span>';

  const body = el("div", "cs-body");
  const identityHost = el("div", "cs-identity-host");
  const dollWrap = el("div", "cs-doll-wrap");
  const stats = el("aside", "cs-stats");
  body.append(identityHost, dollWrap, stats);

  const tip = el("div", "item-tip cs-tip");
  tip.hidden = true;

  win.append(closeBtn, head, body, tip);
  root.append(win);
  hud.append(root);

  let hero: Unit | null = null;
  let mode: CharacterSheetMode = "full";
  let onVisibilityChange: ((open: boolean) => void) | null = null;
  let onModeChange: ((mode: CharacterSheetMode) => void) | null = null;
  let canChangeEquipment: () => boolean = () => true;
  let onEquipmentChanged: (() => void) | null = null;
  let showToast: ((text: string) => void) | null = null;

  const applyMode = (): void => {
    root.classList.toggle("cs-mode-gear", mode === "gear");
    title.textContent = mode === "gear" ? "Экипировка" : "Персонаж";
    identityHost.hidden = mode === "gear";
    stats.hidden = mode === "gear";
  };

  const changeMode = (next: CharacterSheetMode, notify: boolean): void => {
    if (mode === next) {
      applyMode();
      return;
    }
    mode = next;
    applyMode();
    if (notify && !root.hidden) onModeChange?.(mode);
  };

  const render = (): void => {
    tip.hidden = true;
    applyMode();
    if (mode === "full") {
      identityHost.replaceChildren(renderIdentity(hero));
      stats.replaceChildren(...renderStats(hero));
    } else {
      identityHost.replaceChildren();
      stats.replaceChildren();
    }
    dollWrap.replaceChildren(renderDoll(hero));
  };

  const open = (): void => {
    render();
    root.hidden = false;
    onVisibilityChange?.(true);
  };
  const close = (): void => {
    root.hidden = true;
    tip.hidden = true;
    changeMode("full", false);
    onVisibilityChange?.(false);
  };

  const showTip = (slot: HTMLElement): void => {
    const id = slot.dataset.slot as EquipSlotId | undefined;
    if (!id) return;
    tip.replaceChildren();
    const item = hero?.equipment[id];
    if (!item) {
      delete tip.dataset.rarity;
      tip.append(
        el("div", "item-tip-empty-name", SLOTS[id].label),
        el("div", "item-tip-empty-meta", "Пусто"),
      );
    } else {
      fillItemTooltip(tip, item, { equippedSlot: id });
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

  dollWrap.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    // В режиме тайника ПКМ обрабатывает inventoryWindow (снять / Ctrl+снять в тайник).
    if (mode === "gear") return;
    const slotEl = (ev.target as Element).closest<HTMLElement>(".cs-slot.filled");
    if (!slotEl || !hero) return;
    const id = slotEl.dataset.slot as EquipSlotId | undefined;
    if (!id) return;
    if (!canChangeEquipment()) {
      showToast?.("Экипировку можно менять только вне боя");
      return;
    }
    const result = hero.unequipSlot(id);
    if (!result.ok) {
      if (result.reason === "inventory_full") showToast?.("Инвентарь полон");
      return;
    }
    onEquipmentChanged?.();
    render();
  });

  closeBtn.addEventListener("click", close);
  root.addEventListener("click", (ev) => {
    if (ev.target === root) close();
  });

  document.getElementById("btn-character")!.addEventListener("click", () => {
    onOpen();
    changeMode("full", true);
    open();
  });

  window.addEventListener("keydown", (ev) => {
    const target = ev.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (ev.code !== "KeyC" || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    ev.preventDefault();
    if (root.hidden) {
      onOpen();
      changeMode("full", false);
      open();
    } else {
      close();
    }
  });

  return {
    isOpen: () => !root.hidden,
    open,
    close,
    setMode(next) {
      changeMode(next, !root.hidden);
      if (!root.hidden) render();
    },
    getMode: () => mode,
    setHero(next: Unit) {
      hero = next;
      if (!root.hidden) render();
    },
    setOnVisibilityChange(fn) {
      onVisibilityChange = fn;
    },
    setOnModeChange(fn) {
      onModeChange = fn;
    },
    setCanChangeEquipment(fn) {
      canChangeEquipment = fn;
    },
    setOnEquipmentChanged(fn) {
      onEquipmentChanged = fn;
    },
    setShowToast(fn) {
      showToast = fn;
    },
  };
}

function renderIdentity(hero: Unit | null): HTMLElement {
  const plate = el("div", "cs-identity");
  const portrait = el("div", "cs-identity-portrait");
  if (hero?.portraitUrl) {
    const img = document.createElement("img");
    img.src = hero.portraitUrl;
    img.alt = hero.name;
    portrait.append(img);
  }
  const copy = el("div", "cs-identity-copy");
  copy.append(
    el("h3", "cs-identity-name", hero?.name ?? "Герой"),
    el("div", "cs-identity-meta", hero ? `Аспект: ${ASPECT_LABEL[hero.aspect]}` : "Нет данных"),
    el("div", "cs-identity-level", `Уровень ${hero?.level ?? 1}`),
  );
  plate.append(portrait, copy);
  return plate;
}

function renderDoll(hero: Unit | null): HTMLElement {
  const doll = el("div", "cs-doll");
  const body = el("div", "cs-doll-body");
  for (const id of BODY_SLOTS) {
    const slot = slotButton(id, hero?.equipment[id]);
    slot.style.gridArea = BODY_AREAS[id];
    body.append(slot);
  }
  const hands = el("div", "cs-doll-hands");
  for (const id of HAND_SLOTS) {
    const slot = slotButton(id, hero?.equipment[id]);
    slot.classList.add("cs-slot-hand");
    hands.append(slot);
  }
  doll.append(body, hands);
  return doll;
}

function slotButton(id: EquipSlotId, item?: ItemDef): HTMLButtonElement {
  const def = SLOTS[id];
  const btn = el("button", "cs-slot");
  btn.type = "button";
  btn.dataset.slot = id;
  if (item) {
    btn.dataset.rarity = item.rarity;
    btn.classList.add("filled");
    btn.setAttribute("aria-label", `${def.label}: ${item.name}`);
  } else {
    btn.setAttribute("aria-label", `${def.label}: пусто`);
  }
  const face = el("span", "cs-slot-face");
  if (item?.icon) {
    const img = el("img", "cs-slot-icon") as HTMLImageElement;
    img.src = item.icon;
    img.alt = "";
    img.draggable = false;
    face.append(img);
  } else {
    face.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[def.glyph]}</svg>`;
  }
  btn.append(face, el("span", "cs-slot-label", item?.name ?? def.label));
  return btn;
}

function renderStats(hero: Unit | null): HTMLElement[] {
  const sheet = hero?.sheet;
  const s = hero?.stats;
  const reach = s?.reach ?? 1;
  const mainW = hero?.equipment.mainhand?.weapon;
  const offW = hero?.equipment.offhand?.weapon;
  const asPct = sheet ? getStat(sheet, "attackSpeed") : 0;
  const baseCd = mainW?.baseCd ?? s?.autoAttackCd ?? 0;
  const finalCd = sheet ? autoAttackInterval(baseCd, asPct) : baseCd;
  const offCd = offW
    ? sheet
      ? autoAttackInterval(offW.baseCd, asPct)
      : offW.baseCd
    : 0;
  const atkBonus = sheet ? getStat(sheet, "weaponAttackBonus") : 0;
  const fmtDmg = (w: { damageMin: number; damageMax: number }) =>
    `${w.damageMin}-${w.damageMax}${atkBonus ? ` (+${atkBonus})` : ""}`;
  const weaponLine = mainW
    ? fmtDmg(mainW)
    : offW
      ? fmtDmg(offW)
      : s
        ? String(s.atk)
        : "-";
  const offWeaponLine = mainW && offW ? `${fmtDmg(offW)} (-25%)` : null;

  const aspectRows: [string, string][] = [];
  if (sheet && hero) {
    const dmg = aspectDamageOf(sheet, hero.aspect);
    if (dmg > 0) aspectRows.push([`Урон аспекта (${ASPECT_LABEL[hero.aspect]})`, `${dmg}%`]);
  }

  const mainRows: [string, string][] = [
    ["Здоровье", sheet ? String(getStat(sheet, "maxHp")) : s ? String(s.maxHp) : "-"],
    ["Мана", sheet ? `${Math.round(hero!.mana)} / ${getStat(sheet, "maxMana")}` : "-"],
    ["Реген маны", sheet ? formatStatValue("manaRegen", getStat(sheet, "manaRegen")) : "-"],
    ["Урон оружия", weaponLine],
  ];
  if (offWeaponLine) mainRows.push(["Урон левой руки", offWeaponLine]);
  mainRows.push(
    ["Интервал атаки", finalCd ? `${finalCd.toFixed(2)} с` : "-"],
  );
  if (offWeaponLine && offCd) {
    mainRows.push(["Интервал левой руки", `${offCd.toFixed(2)} с`]);
  }
  mainRows.push(
    ["Скорость атаки", sheet ? formatStatValue("attackSpeed", asPct) : "-"],
    ["Дальность", `${reach} ${reach === 1 ? "ряд" : reach < 5 ? "ряда" : "рядов"}`],
  );

  return [
    statGroup("Основные", mainRows),
    statGroup("Защита", [
      ["Снижение физ. урона", pct(sheet, "physDamageReduction")],
      ["Сопротивление магии", pct(sheet, "magicResist")],
      ["Уклонение", pct(sheet, "evasion")],
      ["Блок", pct(sheet, "blockChance")],
      ["Парирование", pct(sheet, "parryChance")],
    ]),
    statGroup("Нападение", [
      ["Шанс крита", pct(sheet, "critChance")],
      ["Урон крита", pct(sheet, "critDamage")],
      ["Урон способностей", pct(sheet, "abilityDamage")],
      ["Скорость каста", pct(sheet, "castSpeed")],
      ["Перезарядка", pct(sheet, "cooldownReduction")],
      ["Снижение стоимости маны", pct(sheet, "manaCostReduction")],
      ...aspectRows,
    ]),
  ];
}

function pct(sheet: NonNullable<Unit["sheet"]> | null | undefined, id: StatId): string {
  if (!sheet) return "-";
  return formatStatValue(id, getStat(sheet, id));
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
