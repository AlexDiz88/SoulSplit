import { ABILITIES, ASPECT_LABEL } from "../abilities/definitions";
import { ABILITY_ICON_URLS, EMPTY_SKILL_ICON_URL } from "../art/abilityIcons";
import type { BattleStats } from "../combat/battleStats";
import { createEmptyBattleStats } from "../combat/battleStats";
import { getEnemyKind } from "../combat/enemies";
import { addItemToInventory } from "../items/inventory";
import { RARITY_LABEL, type ItemDef } from "../items/types";
import { SLOT_LABEL } from "../items/slots";
import type { HeroProfile } from "../meta/heroProfile";
import "./hubScreen.css";
import "./itemRarity.css";
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

  const lootCol = el("section", "reward-col");
  lootCol.append(el("h2", "reward-col-title", "Добыча"));
  const lootScroll = el("div", "reward-scroll");
  lootCol.append(lootScroll);

  const statsCol = el("section", "reward-col");
  statsCol.append(el("h2", "reward-col-title", "Статистика"));
  const statsScroll = el("div", "reward-scroll");
  statsCol.append(statsScroll);

  body.append(lootCol, statsCol);

  const foot = el("footer", "reward-foot");
  const footLeft = el("div", "reward-foot-left");
  const footRight = el("div", "reward-foot-right");
  const btnTakeAll = el("button", "meta-btn", "Взять всё");
  btnTakeAll.type = "button";
  const btnInv = el("button", "meta-btn", "Инвентарь");
  btnInv.type = "button";
  const btnClose = el("button", "meta-btn meta-btn-primary", "Закрыть");
  btnClose.type = "button";
  footLeft.append(btnTakeAll, btnInv);
  footRight.append(btnClose);
  foot.append(footLeft, footRight);

  panel.append(head, body, foot);
  root.append(panel);

  const hud = document.getElementById("hud");
  if (!hud) throw new Error("#hud not found");
  hud.append(root);

  let heroRef: HeroProfile | null = null;
  let currentItems: ItemDef[] = [];
  const taken = new Set<string>();
  const rowTakeBtns = new Map<string, HTMLButtonElement>();
  const rowSkipBtns = new Map<string, HTMLButtonElement>();

  btnInv.addEventListener("click", () => handlers.onOpenInventory());
  btnClose.addEventListener("click", () => handlers.onDone());
  btnTakeAll.addEventListener("click", () => {
    if (!heroRef) return;
    let took = 0;
    let blocked = false;
    for (const item of currentItems) {
      if (taken.has(item.id)) continue;
      const slot = addItemToInventory(heroRef.inventory, item);
      if (slot < 0) {
        blocked = true;
        break;
      }
      taken.add(item.id);
      took += 1;
      const takeBtn = rowTakeBtns.get(item.id);
      const skipBtn = rowSkipBtns.get(item.id);
      if (takeBtn) {
        takeBtn.textContent = "Взято";
        takeBtn.disabled = true;
      }
      if (skipBtn) skipBtn.disabled = true;
    }
    if (took > 0) handlers.onTaken();
    if (blocked) handlers.showToast("Инвентарь полон");
    else if (took === 0 && currentItems.every((i) => taken.has(i.id))) {
      handlers.showToast("Всё уже разобрано");
    }
    refreshTakeAll();
  });

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
    const pending = currentItems.some((i) => !taken.has(i.id));
    btnTakeAll.disabled = !pending || currentItems.length === 0;
  }

  function renderLootRow(profile: HeroProfile, item: ItemDef): HTMLElement {
    const row = el("div", "reward-loot-row");
    row.dataset.rarity = item.rarity;

    const iconWrap = el("div", "reward-loot-icon");
    const face = el("div", "reward-loot-face");
    const img = document.createElement("img");
    img.src = item.icon ?? "";
    img.alt = item.name;
    face.append(img);
    iconWrap.append(face);

    const info = el("div", "reward-loot-info");
    const aspect = item.aspectTag ? ` - ${ASPECT_LABEL[item.aspectTag]}` : "";
    info.append(el("div", "reward-loot-name", item.name));
    info.append(
      el(
        "div",
        "reward-loot-sub",
        `${RARITY_LABEL[item.rarity]} - ${SLOT_LABEL[item.slot]} - ур. ${item.itemLevel}${aspect}`,
      ),
    );

    const btns = el("div", "reward-loot-actions");
    const take = el("button", "is-primary", taken.has(item.id) ? "Взято" : "Взять");
    take.type = "button";
    take.disabled = taken.has(item.id);
    const skip = el("button", undefined, "Оставить");
    skip.type = "button";
    skip.disabled = taken.has(item.id);

    take.addEventListener("click", () => {
      if (taken.has(item.id) || !heroRef) return;
      const slot = addItemToInventory(profile.inventory, item);
      if (slot < 0) {
        handlers.showToast("Инвентарь полон");
        return;
      }
      taken.add(item.id);
      take.textContent = "Взято";
      take.disabled = true;
      skip.disabled = true;
      handlers.onTaken();
      refreshTakeAll();
    });
    skip.addEventListener("click", () => {
      taken.add(item.id);
      take.disabled = true;
      skip.disabled = true;
      take.textContent = "Пропущено";
      refreshTakeAll();
    });

    rowTakeBtns.set(item.id, take);
    rowSkipBtns.set(item.id, skip);
    btns.append(take, skip);
    row.append(iconWrap, info, btns);
    return row;
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
      renderStatCard("Уклоны", formatNum(stats.dodges), "is-dodge"),
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
    const autoParts = [`${formatNum(auto.hits)} удар.`];
    if (auto.crits > 0) autoParts.push(`${formatNum(auto.crits)} крит.`);
    if (auto.dodged > 0) autoParts.push(`${formatNum(auto.dodged)} уклон.`);
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
    killSec.append(el("h3", "reward-section-title", "Поверженные"));
    if (!stats.killsByKind.length) {
      killSec.append(el("p", "reward-empty", "Нет убийств."));
    } else {
      for (const k of stats.killsByKind) {
        const kind = getEnemyKind(k.kindId);
        const row = el("div", "reward-kill-row");
        const icon = el("div", "reward-kill-icon");
        const img = document.createElement("img");
        img.src = kind?.portraitUrl ?? "";
        img.alt = kind?.name ?? k.kindId;
        icon.append(img);
        const info = el("div");
        info.append(el("div", "reward-row-name", kind?.name ?? k.kindId));
        info.append(el("div", "reward-row-sub", `повержено`));
        const nums = el("div", "reward-row-nums", `×${formatNum(k.count)}`);
        nums.style.color = "#e8d7a2";
        row.append(icon, info, nums);
        killSec.append(row);
      }
    }
    statsScroll.append(killSec);
  }

  return {
    show(profile, payload) {
      heroRef = profile;
      currentItems = payload.items;
      taken.clear();
      rowTakeBtns.clear();
      rowSkipBtns.clear();

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

      lootScroll.replaceChildren();
      if (!payload.items.length) {
        lootScroll.append(el("p", "reward-empty", "Предметов нет - только опыт и золото."));
      } else {
        lootScroll.append(...payload.items.map((item) => renderLootRow(profile, item)));
      }
      refreshTakeAll();
      renderStats(stats);
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      heroRef = null;
      currentItems = [];
    },
    isOpen() {
      return !root.hidden;
    },
    destroy() {
      root.remove();
    },
  };
}
