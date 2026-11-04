import { ensureItemIcon } from "../art/itemIcons";
import { getEnemyCardById } from "../combat/enemyCatalog";
import { generateItem, itemDisplayName } from "../items/generate";
import { addItemToInventory, findEmptyInventorySlot } from "../items/inventory";
import type { ItemDef } from "../items/types";
import type { GameState, ZoneId } from "../meta/gameState";
import { addXpToProfile } from "../meta/heroProfile";
import { pickWeightedEquipSlot } from "../meta/loot";
import { questXpAward } from "../meta/progression";
import { ALL_QUEST_IDS, getQuestDef, isQuestId } from "./definitions";
import {
  MAX_TRACKED_QUESTS,
  objectiveCounterKey,
  type QuestId,
  type QuestLogState,
  type QuestProgress,
  type QuestUiStatus,
} from "./types";

export function createEmptyQuestLog(): QuestLogState {
  return { entries: [], tracked: [], pendingRewards: {} };
}

function cloneRewardItem(raw: unknown): ItemDef | null {
  if (!raw || typeof raw !== "object") return null;
  const item = structuredClone(raw) as ItemDef;
  if (typeof item.id !== "string" || typeof item.rarity !== "string") return null;
  ensureItemIcon(item);
  return item;
}

function rollQuestRewardItem(state: GameState, questId: QuestId): ItemDef | null {
  const def = getQuestDef(questId);
  if (!def.rewards.item) return null;
  const item = generateItem({
    slot: pickWeightedEquipSlot(),
    rarity: def.rewards.item.rarity,
    itemLevel: def.rewards.item.itemLevel,
    learnedAspects: state.hero.learnedAspects,
  });
  ensureItemIcon(item);
  return item;
}

/** Старые сейвы / дыры: докинуть rewardItem один раз, если в дефе есть предмет. */
function ensureEntryRewardItem(state: GameState, entry: QuestProgress): void {
  const def = getQuestDef(entry.questId);
  if (!def.rewards.item) return;
  if (entry.rewardItem) {
    ensureItemIcon(entry.rewardItem);
    return;
  }
  entry.rewardItem = rollQuestRewardItem(state, entry.questId);
}

export function cloneQuestLog(src: QuestLogState | null | undefined): QuestLogState {
  if (!src || typeof src !== "object") return createEmptyQuestLog();
  const entries: QuestProgress[] = [];
  for (const raw of src.entries ?? []) {
    if (!raw || !isQuestId(String(raw.questId))) continue;
    const status = raw.status;
    if (status !== "active" && status !== "ready" && status !== "completed") continue;
    const counters: Record<string, number> = {};
    if (raw.counters && typeof raw.counters === "object") {
      for (const [k, v] of Object.entries(raw.counters)) {
        if (typeof v === "number" && Number.isFinite(v)) counters[k] = Math.max(0, Math.floor(v));
      }
    }
    entries.push({
      questId: raw.questId,
      status,
      counters,
      rewardItem: cloneRewardItem((raw as QuestProgress).rewardItem),
    });
  }
  const tracked: QuestId[] = [];
  for (const id of src.tracked ?? []) {
    if (!isQuestId(String(id))) continue;
    if (tracked.includes(id)) continue;
    const entry = entries.find((e) => e.questId === id);
    if (!entry || (entry.status !== "active" && entry.status !== "ready")) continue;
    tracked.push(id);
    if (tracked.length >= MAX_TRACKED_QUESTS) break;
  }
  const pendingRewards: Partial<Record<QuestId, ItemDef>> = {};
  const rawPending = (src as QuestLogState).pendingRewards;
  if (rawPending && typeof rawPending === "object") {
    for (const [key, value] of Object.entries(rawPending)) {
      if (!isQuestId(key)) continue;
      if (entries.some((e) => e.questId === key)) continue;
      const item = cloneRewardItem(value);
      if (item) pendingRewards[key] = item;
    }
  }
  return { entries, tracked, pendingRewards };
}

/**
 * Гарантирует валидный quest log на state.
 * Не переклонирует живой лог: иначе мутации (accept и т.п.) пишут в orphan-копию.
 */
export function ensureQuestLog(state: GameState): QuestLogState {
  const q = state.quests as QuestLogState | null | undefined;
  const needsRebuild =
    !q ||
    typeof q !== "object" ||
    !Array.isArray(q.entries) ||
    !Array.isArray(q.tracked);
  if (needsRebuild) {
    state.quests = cloneQuestLog(q);
  } else if (!q.pendingRewards || typeof q.pendingRewards !== "object") {
    q.pendingRewards = {};
  }
  for (const entry of state.quests.entries) {
    ensureEntryRewardItem(state, entry);
  }
  return state.quests;
}

/** Ролл / чтение награды до взятия (сохраняется в pendingRewards). */
export function ensurePendingReward(state: GameState, id: QuestId): ItemDef | null {
  const log = ensureQuestLog(state);
  const def = getQuestDef(id);
  if (!def.rewards.item) return null;
  const entry = getEntry(log, id);
  if (entry) {
    ensureEntryRewardItem(state, entry);
    return entry.rewardItem ?? null;
  }
  const existing = log.pendingRewards[id];
  if (existing) {
    ensureItemIcon(existing);
    return existing;
  }
  const rolled = rollQuestRewardItem(state, id);
  if (rolled) log.pendingRewards[id] = rolled;
  return rolled;
}

function getEntry(log: QuestLogState, id: QuestId): QuestProgress | undefined {
  return log.entries.find((e) => e.questId === id);
}

export function questUiStatus(state: GameState, id: QuestId): QuestUiStatus {
  const entry = getEntry(ensureQuestLog(state), id);
  if (!entry) return "available";
  return entry.status;
}

export interface TownHallQuestRow {
  id: QuestId;
  name: string;
  status: "available" | "ready";
}

/** Доска ратуши: только взять (available) и сдать (ready). */
export function listTownHallQuests(state: GameState): TownHallQuestRow[] {
  const rows: TownHallQuestRow[] = [];
  for (const id of ALL_QUEST_IDS) {
    const status = questUiStatus(state, id);
    if (status !== "available" && status !== "ready") continue;
    rows.push({ id, name: getQuestDef(id).name, status });
  }
  rows.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ready" ? -1 : 1;
    return a.name.localeCompare(b.name, "ru");
  });
  return rows;
}

export interface JournalQuestRow {
  id: QuestId;
  name: string;
  status: "active" | "ready" | "completed";
  tracked: boolean;
}

/** Журнал: все взятые квесты (в работе / готовы / сданы). */
export function listJournalQuests(state: GameState): JournalQuestRow[] {
  const log = ensureQuestLog(state);
  const order: Array<JournalQuestRow["status"]> = ["ready", "active", "completed"];
  const rows: JournalQuestRow[] = [];
  for (const entry of log.entries) {
    rows.push({
      id: entry.questId,
      name: getQuestDef(entry.questId).name,
      status: entry.status,
      tracked: log.tracked.includes(entry.questId),
    });
  }
  rows.sort((a, b) => {
    const d = order.indexOf(a.status) - order.indexOf(b.status);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, "ru");
  });
  return rows;
}

export interface QuestObjectiveView {
  key: string;
  label: string;
  current: number;
  target: number;
  done: boolean;
}

export interface QuestDetailView {
  id: QuestId;
  name: string;
  description: string;
  status: QuestUiStatus;
  tracked: boolean;
  canTrack: boolean;
  objectives: QuestObjectiveView[];
  rewards: {
    xp: number;
    gold: number;
    /** Конкретный предмет (pending до взятия / entry после). */
    rewardItem: ItemDef | null;
  };
}

export function getQuestDetailView(state: GameState, id: QuestId): QuestDetailView {
  const log = ensureQuestLog(state);
  const def = getQuestDef(id);
  const entry = getEntry(log, id);
  const status = questUiStatus(state, id);
  const tracked = log.tracked.includes(id);
  const objectives: QuestObjectiveView[] = def.objectives.map((obj, i) => {
    const key = objectiveCounterKey(obj, i);
    const target = obj.type === "kill_group" ? obj.count : 0;
    const current = Math.min(target, entry?.counters[key] ?? 0);
    return {
      key,
      label: obj.label,
      current,
      target,
      done: current >= target,
    };
  });
  const rewardItem = ensurePendingReward(state, id);
  return {
    id,
    name: def.name,
    description: def.description,
    status,
    tracked,
    canTrack:
      (status === "active" || status === "ready") &&
      (tracked || log.tracked.length < MAX_TRACKED_QUESTS),
    objectives,
    rewards: {
      xp: questXpAward(state.hero.level, def.questLevel, def.rewards.xp),
      gold: def.rewards.gold,
      rewardItem,
    },
  };
}

export function acceptQuest(
  state: GameState,
  id: QuestId,
): { ok: true; autoTracked: boolean } | { ok: false; reason: string } {
  const log = ensureQuestLog(state);
  if (getEntry(log, id)) return { ok: false, reason: "Уже взят или сдан" };
  const def = getQuestDef(id);
  const counters: Record<string, number> = {};
  def.objectives.forEach((obj, i) => {
    counters[objectiveCounterKey(obj, i)] = 0;
  });
  const rewardItem = ensurePendingReward(state, id);
  delete log.pendingRewards[id];
  log.entries.push({
    questId: id,
    status: "active",
    counters,
    rewardItem,
  });
  let autoTracked = false;
  if (log.tracked.length < MAX_TRACKED_QUESTS) {
    log.tracked.push(id);
    autoTracked = true;
  }
  return { ok: true, autoTracked };
}

export function toggleTrack(
  state: GameState,
  id: QuestId,
): { ok: true; tracked: boolean } | { ok: false; reason: string } {
  const log = ensureQuestLog(state);
  const entry = getEntry(log, id);
  if (!entry || (entry.status !== "active" && entry.status !== "ready")) {
    return { ok: false, reason: "Отслеживать можно только активный квест" };
  }
  const idx = log.tracked.indexOf(id);
  if (idx >= 0) {
    log.tracked.splice(idx, 1);
    return { ok: true, tracked: false };
  }
  if (log.tracked.length >= MAX_TRACKED_QUESTS) {
    return { ok: false, reason: `В трекере уже ${MAX_TRACKED_QUESTS} квеста` };
  }
  log.tracked.push(id);
  return { ok: true, tracked: true };
}

function enemyMatchesGroup(kindId: string, groupId: string): boolean {
  const card = getEnemyCardById(kindId);
  if (card) return card.groupId === groupId;
  if (groupId === "bandits") return kindId.startsWith("bandit_");
  return false;
}

/** +1 к kill-целям; возвращает true если что-то изменилось. */
export function applyKillProgress(state: GameState, kindId: string): boolean {
  const log = ensureQuestLog(state);
  let changed = false;
  for (const entry of log.entries) {
    if (entry.status !== "active") continue;
    const def = getQuestDef(entry.questId);
    let allDone = true;
    def.objectives.forEach((obj, i) => {
      const key = objectiveCounterKey(obj, i);
      if (obj.type !== "kill_group") {
        allDone = false;
        return;
      }
      const cur = entry.counters[key] ?? 0;
      if (cur < obj.count && enemyMatchesGroup(kindId, obj.groupId)) {
        entry.counters[key] = cur + 1;
        changed = true;
      }
      if ((entry.counters[key] ?? 0) < obj.count) allDone = false;
    });
    if (allDone) {
      entry.status = "ready";
      changed = true;
    }
  }
  return changed;
}

export type TurnInResult =
  | {
      ok: true;
      xp: number;
      gold: number;
      item: ItemDef | null;
      itemName: string | null;
      levelsGained: number;
      newLevel: number;
    }
  | { ok: false; reason: string };

export function turnInQuest(state: GameState, id: QuestId): TurnInResult {
  const log = ensureQuestLog(state);
  const entry = getEntry(log, id);
  if (!entry || entry.status !== "ready") {
    return { ok: false, reason: "Квест ещё не готов к сдаче" };
  }
  const def = getQuestDef(id);
  ensureEntryRewardItem(state, entry);
  let item: ItemDef | null = null;
  if (def.rewards.item) {
    if (findEmptyInventorySlot(state.hero.inventory) < 0) {
      return { ok: false, reason: "Сумка полна" };
    }
    item = entry.rewardItem ? structuredClone(entry.rewardItem) : rollQuestRewardItem(state, id);
    if (!item) {
      return { ok: false, reason: "Нет предмета-награды" };
    }
    ensureItemIcon(item);
    if (addItemToInventory(state.hero.inventory, item) < 0) {
      return { ok: false, reason: "Сумка полна" };
    }
  }

  const xp = questXpAward(state.hero.level, def.questLevel, def.rewards.xp);
  const gold = def.rewards.gold;
  const levelResult = addXpToProfile(state.hero, xp);
  state.hero.gold += gold;

  const tIdx = log.tracked.indexOf(id);
  if (tIdx >= 0) log.tracked.splice(tIdx, 1);

  if (def.repeatable) {
    const eIdx = log.entries.indexOf(entry);
    if (eIdx >= 0) log.entries.splice(eIdx, 1);
    delete log.pendingRewards[id];
  } else {
    entry.status = "completed";
  }

  return {
    ok: true,
    xp,
    gold,
    item,
    itemName: item ? itemDisplayName(item) : null,
    levelsGained: levelResult.levelsGained,
    newLevel: state.hero.level,
  };
}

export interface TrackerQuestView {
  id: QuestId;
  name: string;
  ready: boolean;
  lines: { text: string; done: boolean }[];
}

export function trackedQuestViews(state: GameState): TrackerQuestView[] {
  const log = ensureQuestLog(state);
  const views: TrackerQuestView[] = [];
  for (const id of log.tracked) {
    const detail = getQuestDetailView(state, id);
    if (detail.status !== "active" && detail.status !== "ready") continue;
    views.push({
      id,
      name: detail.name,
      ready: detail.status === "ready",
      lines: detail.objectives.map((o) => ({
        text: `${o.label}: ${o.current}/${o.target}`,
        done: o.done,
      })),
    });
  }
  return views;
}

/** Строки для блока "Квесты" на карте региона. */
export function activeQuestNamesForZone(state: GameState, zoneId: ZoneId): string[] {
  const log = ensureQuestLog(state);
  const names: string[] = [];
  for (const entry of log.entries) {
    if (entry.status !== "active" && entry.status !== "ready") continue;
    const def = getQuestDef(entry.questId);
    if (def.zoneHint !== zoneId) continue;
    if (entry.status === "ready") names.push(`${def.name} (готово)`);
    else {
      const detail = getQuestDetailView(state, entry.questId);
      const prog = detail.objectives.map((o) => `${o.current}/${o.target}`).join(", ");
      names.push(`${def.name}: ${prog}`);
    }
  }
  return names;
}
