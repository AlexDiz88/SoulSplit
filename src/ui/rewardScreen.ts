import { ABILITIES } from "../abilities/definitions";
import { ABILITY_ICON_URLS, EMPTY_SKILL_ICON_URL } from "../art/abilityIcons";
import type { BattleStats } from "../combat/battleStats";
import { createEmptyBattleStats } from "../combat/battleStats";
import { getEnemyKind } from "../combat/enemies";
import type { EquipmentMap } from "../items/equipment";
import { addItemToInventory } from "../items/inventory";
import type { EquipSlotId } from "../items/slots";
import type { ItemDef } from "../items/types";
import type { HeroProfile } from "../meta/heroProfile";
import { fillEmptyItemTooltip, fillItemTooltip } from "./itemTooltip";
import "./hubScreen.css";
import "./itemRarity.css";
import "./itemTooltip.css";
import "./inventoryWindow.css";
import "./rewardScreen.css";

export interface RewardScreenPayload {
  items: ItemDef[];
  xpGained: number;
  goldGained: number;
  levelsGained: number;
  newLevel: number;
  kills: number;
  zoneName: string;
  pointName?: string;
  stats?: BattleStats;
}

export interface RewardScreenApi {
  show(profile: HeroProfile, payload: RewardScreenPayload): void;
  hide(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface RewardScreenHandlers {
  onTaken: () => void;
  onDone: () => void;
  onOpenInventory: () => void;
  showToast: (text: string) => void;
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

function formatDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatNum(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

/** Русское склонение: 1 попадание, 2 попадания, 5 попаданий. */
function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.round(n)) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function compareSlotsFor(item: ItemDef): EquipSlotId[] {
  if (item.potionId) return [];
  if (item.slot === "ring1" || item.slot === "ring2") return ["ring1", "ring2"];
  if (item.slot === "mainhand" || item.slot === "offhand") return ["mainhand", "offhand"];
  return [item.slot];
}

export function mountRewardScreen(handlers: RewardScreenHandlers): RewardScreenApi {
  const root = el("div", "reward-screen");
  root.id = "reward-screen";
  root.hidden = true;

  const panel = el("div", "reward-window");

  const head = el("header", "reward-head");
  const headMain = el("div", "reward-head-main");
  headMain.append(el("p", "reward-eyebrow", "Итоги боя"));
  const title = el("h1", "reward-title", "Победа");
  const place = el("p", "reward-place");
  const levelup = el("p", "reward-levelup");
  levelup.hidden = true;
  headMain.append(title, place, levelup);

  const payout = el("div", "reward-payout");
  const chipXp = makeChip("Опыт", "0", "is-xp");
  const chipGold = makeChip("Золото", "0", "is-gold");
  const chipKills = makeChip("Враги", "0");
  const chipTime = makeChip("Время", "0:00");
  payout.append(chipXp.root, chipGold.root, chipKills.root, chipTime.root);
  head.append(headMain, payout);

  const body = el("div", "reward-body");

  const lootCol = el("section", "reward-col reward-col-loot");
  lootCol.append(el("h2", "reward-col-title", "Добыча"));
  const lootGrid = el("div", "reward-loot-grid");
  lootCol.append(lootGrid);
  const lootEmpty = el("p", "reward-empty", "Предметов нет - только опыт и золото.");
  lootEmpty.hidden = true;
  lootCol.append(lootEmpty);

  const statsCol = el("section", "reward-col reward-col-stats");
  statsCol.append(el("h2", "reward-col-title", "Статистика"));
  const statsScroll = el("div", "reward-scroll");
  statsCol.append(statsScroll);

  body.append(lootCol, statsCol);

  const foot = el("footer", "reward-foot");
  const footLeft = el("div", "reward-foot-left");
  const footRight = el("div", "reward-foot-right");
  const btnInv = el("button", "meta-btn", "Инвентарь");
  btnInv.type = "button";
  const btnTakeAll = el("button", "meta-btn", "Забрать всё");
  btnTakeAll.type = "button";
  const btnClose = el("button", "meta-btn", "Закрыть");
  btnClose.type = "button";
  footLeft.append(btnInv);
  footRight.append(btnTakeAll, btnClose);
  foot.append(footLeft, footRight);

  const compare = el("div", "reward-compare");
  compare.hidden = true;

  panel.append(head, body, foot);
  root.append(panel, compare);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let heroRef: HeroProfile | null = null;
  let currentItems: ItemDef[] = [];
  /** Были ли предметы в добыче при открытии экрана. */
  let hadInitialLoot = false;

  btnInv.addEventListener("click", () => handlers.onOpenInventory());
  btnClose.addEventListener("click", () => handlers.onDone());
  btnTakeAll.addEventListener("click", () => takeAll());

  root.addEventListener("pointerleave", () => hideCompare());
  compare.addEventListener("pointerenter", () => hideCompare());

  function makeChip(label: string, value: string, extraClass = "") {
    const rootChip = el("div", `reward-chip${extraClass ? ` ${extraClass}` : ""}`);
    rootChip.append(el("span", "reward-chip-label", label));
    const valueEl = el("span", "reward-chip-value", value);
    rootChip.append(valueEl);
    return {
      root: rootChip,
      set(v: string) {
        valueEl.textContent = v;
      },
    };
  }

  function refreshTakeAll(): void {
    btnTakeAll.disabled = currentItems.length === 0;
  }

  function hideCompare(): void {
    compare.hidden = true;
    compare.replaceChildren();
  }

  function positionCompare(clientX: number, clientY: number): void {
    compare.hidden = false;
    const tipRect = compare.getBoundingClientRect();
    const gap = 16;
    const margin = 8;
    let left = clientX + gap;
    let top = clientY + gap;
    const maxLeft = window.innerWidth - tipRect.width - margin;
    const maxTop = window.innerHeight - tipRect.height - margin;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    if (top > maxTop) top = Math.max(margin, maxTop);
    compare.style.left = `${Math.max(margin, left)}px`;
    compare.style.top = `${Math.max(margin, top)}px`;
  }

  function showCompare(item: ItemDef, equipment: EquipmentMap, clientX: number, clientY: number): void {
    const slots = compareSlotsFor(item);
    compare.replaceChildren();

    const lootCard = el("div", "item-tip reward-tip");
    fillItemTooltip(lootCard, item, {
      showIcon: true,
      caption: "Добыча",
      showSellPrice: false,
    });
    compare.append(lootCard);

    for (const slot of slots) {
      const card = el("div", "item-tip reward-tip");
      const equipped = equipment[slot] ?? null;
      if (equipped) {
        fillItemTooltip(card, equipped, {
          showIcon: true,
          caption: "Экипировано",
          showSellPrice: false,
          equippedSlot: slot,
        });
      } else {
        fillEmptyItemTooltip(card, slot, "Экипировано");
      }
      compare.append(card);
    }
    positionCompare(clientX, clientY);
  }

  function takeItem(item: ItemDef): boolean {
    if (!heroRef) return false;
    const slot = addItemToInventory(heroRef.inventory, item);
    if (slot < 0) {
      handlers.showToast("Инвентарь полон");
      return false;
    }
    currentItems = currentItems.filter((i) => i.id !== item.id);
    handlers.onTaken();
    renderLoot();
    return true;
  }

  function takeAll(): void {
    if (!heroRef) return;
    let took = 0;
    let blocked = false;
    const remaining: ItemDef[] = [];
    for (const item of currentItems) {
      if (blocked) {
        remaining.push(item);
        continue;
      }
      const slot = addItemToInventory(heroRef.inventory, item);
      if (slot < 0) {
        blocked = true;
        remaining.push(item);
        continue;
      }
      took += 1;
    }
    currentItems = remaining;
    if (took > 0) handlers.onTaken();
    if (blocked) handlers.showToast("Инвентарь полон");
    renderLoot();
  }

  function renderLootCell(item: ItemDef): HTMLElement {
    const cell = el("button", "reward-loot-cell inv-cell filled");
    cell.type = "button";
    cell.dataset.rarity = item.rarity;
    cell.setAttribute("aria-label", item.name);

    const face = el("div", "inv-cell-face");
    if (item.icon) {
      const img = document.createElement("img");
      img.src = item.icon;
      img.alt = item.name;
      img.draggable = false;
      face.append(img);
    }
    cell.append(face);

    cell.addEventListener("click", (ev) => {
      ev.preventDefault();
      hideCompare();
      takeItem(item);
    });
    cell.addEventListener("pointerenter", (ev) => {
      if (!heroRef) return;
      showCompare(item, heroRef.equipment, ev.clientX, ev.clientY);
    });
    cell.addEventListener("pointermove", (ev) => {
      if (compare.hidden || !heroRef) return;
      positionCompare(ev.clientX, ev.clientY);
    });
    cell.addEventListener("pointerleave", (ev) => {
      const next = ev.relatedTarget;
      if (next instanceof Node && compare.contains(next)) return;
      hideCompare();
    });

    return cell;
  }

  function renderLoot(): void {
    hideCompare();
    lootGrid.replaceChildren();
    if (!currentItems.length) {
      lootGrid.hidden = true;
      // Сообщение только если лута изначально не было; после "забрал всё" - пусто.
      if (!hadInitialLoot) {
        lootEmpty.textContent = "Предметов нет - только опыт и золото.";
        lootEmpty.hidden = false;
      } else {
        lootEmpty.hidden = true;
      }
    } else {
      lootGrid.hidden = false;
      lootEmpty.hidden = true;
      lootGrid.append(...currentItems.map((item) => renderLootCell(item)));
    }
    refreshTakeAll();
  }

  function renderStatCard(
    label: string,
    value: string,
    variant?: string,
    note?: string,
  ): HTMLElement {
    const card = el("div", `reward-stat-card${variant ? ` ${variant}` : ""}`);
    card.append(el("span", "reward-stat-card-label", label));
    card.append(el("span", "reward-stat-card-value", value));
    if (note) card.append(el("span", "reward-stat-card-note", note));
    return card;
  }

  function renderStats(stats: BattleStats): void {
    statsScroll.replaceChildren();

    const grid = el("div", "reward-stat-grid");
    grid.append(
      renderStatCard("Урон", formatNum(stats.damageDealt), "is-dmg"),
      renderStatCard("Получено", formatNum(stats.damageTaken), "is-taken"),
      renderStatCard("Лечение", formatNum(stats.healingDone), "is-heal"),
      renderStatCard("Криты", formatNum(stats.critsLanded), "is-crit"),
      renderStatCard("Уклонения", formatNum(stats.dodges), "is-dodge"),
      renderStatCard("Блок", formatNum(stats.blockedDamage), "is-block", "скоро"),
    );
    statsScroll.append(grid);

    if (stats.shieldAbsorbed > 0 || stats.enemyDodges > 0) {
      const extras = el("div", "reward-section");
      extras.append(el("h3", "reward-section-title", "Защита"));
      const lines: string[] = [];
      if (stats.shieldAbsorbed > 0) lines.push(`Щит поглотил ${formatNum(stats.shieldAbsorbed)}`);
      if (stats.enemyDodges > 0) lines.push(`Враги уклонились ${formatNum(stats.enemyDodges)} раз`);
      extras.append(el("p", "reward-empty", lines.join(" · ")));
      statsScroll.append(extras);
    }

    const autoSec = el("div", "reward-section");
    autoSec.append(el("h3", "reward-section-title", "Автоатака"));
    const auto = stats.autoAttack;
    const autoRow = el("div", "reward-auto-row");
    autoRow.append(el("div", "reward-auto-icon", "АА"));
    const autoInfo = el("div");
    autoInfo.append(el("div", "reward-row-name", "Автоатака"));
    const hitWord = pluralRu(auto.hits, "попадание", "попадания", "попаданий");
    const autoParts = [`${formatNum(auto.hits)} ${hitWord}`];
    if (auto.crits > 0) {
      autoParts.push(
        `${formatNum(auto.crits)} ${pluralRu(auto.crits, "крит", "крита", "критов")}`,
      );
    }
    if (auto.dodged > 0) {
      autoParts.push(
        `${formatNum(auto.dodged)} ${pluralRu(auto.dodged, "уклонение", "уклонения", "уклонений")}`,
      );
    }
    autoInfo.append(el("div", "reward-row-sub", autoParts.join(" · ")));
    const autoDmg = el("div", "reward-row-nums", formatNum(auto.damage));
    autoRow.append(autoInfo, autoDmg);
    autoSec.append(autoRow);
    statsScroll.append(autoSec);

    const abilitySec = el("div", "reward-section");
    abilitySec.append(el("h3", "reward-section-title", "Способности"));
    if (!stats.abilities.length) {
      abilitySec.append(el("p", "reward-empty", "Способности не применялись."));
    } else {
      for (const a of stats.abilities) {
        const def = ABILITIES[a.abilityId];
        const row = el("div", "reward-ability-row");
        const icon = el("div", "reward-ability-icon");
        const img = document.createElement("img");
        img.src = ABILITY_ICON_URLS[a.abilityId] ?? EMPTY_SKILL_ICON_URL;
        img.alt = def?.name ?? a.abilityId;
        icon.append(img);

        const info = el("div");
        info.append(el("div", "reward-row-name", def?.name ?? a.abilityId));
        const parts = [`${formatNum(a.casts)} прим.`];
        if (a.hits > 0) parts.push(`${formatNum(a.hits)} попад.`);
        if (a.crits > 0) parts.push(`${formatNum(a.crits)} крит.`);
        info.append(el("div", "reward-row-sub", parts.join(" · ")));

        const nums = el("div", "reward-row-nums");
        if (a.damage > 0) nums.append(document.createTextNode(formatNum(a.damage)));
        if (a.healing > 0) {
          if (a.damage > 0) {
            nums.append(el("small", "is-heal", `+${formatNum(a.healing)} хил`));
          } else {
            nums.classList.add("is-heal");
            nums.textContent = `+${formatNum(a.healing)}`;
          }
        }
        if (a.damage <= 0 && a.healing <= 0) {
          nums.textContent = "-";
          nums.style.color = "#9a9078";
        }
        row.append(icon, info, nums);
        abilitySec.append(row);
      }
    }
    statsScroll.append(abilitySec);

    const killSec = el("div", "reward-section");
    killSec.append(el("h3", "reward-section-title", "Убитые противники"));
    if (!stats.killsByKind.length) {
      killSec.append(el("p", "reward-empty", "Нет убийств."));
    } else {
      const row = el("div", "reward-kills-row");
      for (const k of stats.killsByKind) {
        const kind = getEnemyKind(k.kindId);
        const chip = el("div", "reward-kill-chip");
        chip.setAttribute("aria-label", kind?.name ?? k.kindId);
        const icon = el("div", "reward-kill-icon");
        const img = document.createElement("img");
        img.src = kind?.portraitUrl ?? "";
        img.alt = kind?.name ?? k.kindId;
        icon.append(img);
        const count = el("span", "reward-kill-count", `x${formatNum(k.count)}`);
        chip.append(icon, count);
        row.append(chip);
      }
      killSec.append(row);
    }
    statsScroll.append(killSec);
  }

  return {
    show(profile, payload) {
      heroRef = profile;
      currentItems = [...payload.items];
      hadInitialLoot = currentItems.length > 0;

      const placeBits = [payload.zoneName];
      if (payload.pointName) placeBits.push(payload.pointName);
      place.textContent = placeBits.join(" · ");

      chipXp.set(`+${formatNum(payload.xpGained)}`);
      chipGold.set(`+${formatNum(payload.goldGained)}`);
      chipKills.set(formatNum(payload.kills));

      const stats = payload.stats ?? createEmptyBattleStats();
      chipTime.set(formatDuration(stats.durationSec));

      if (payload.levelsGained > 0) {
        levelup.hidden = false;
        levelup.textContent =
          payload.levelsGained === 1
            ? `Новый уровень: ${payload.newLevel}`
            : `+${payload.levelsGained} ур. до ${payload.newLevel}`;
      } else {
        levelup.hidden = true;
      }

      renderLoot();
      renderStats(stats);
      root.hidden = false;
    },
    hide() {
      hideCompare();
      root.hidden = true;
      heroRef = null;
      currentItems = [];
      hadInitialLoot = false;
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      hideCompare();
      root.remove();
    },
  };
}
