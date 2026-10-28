import { remapAspectId } from "../abilities/aspects";
import { ensureItemIcon } from "../art/itemIcons";
import { normalizeWeaponItemSlot } from "../items/equipment";
import type { ItemDef } from "../items/types";
import type { StatId } from "../stats/statIds";
import type { Aspect } from "../types";
import { cloneGameState, createNewGameState, type GameState, type ZoneId } from "./gameState";
import { ensureHeroBeltPotions, ensureHeroStash, HERO_PROFILE_VERSION } from "./heroProfile";
import { ensureMarket } from "./market";

/** Старые ZoneId → актуальные (разработка, свободный rename). */
const ZONE_ID_REMAP: Record<string, ZoneId> = {
  outskirts: "north_road",
};

function remapZoneId(id: string): ZoneId {
  return ZONE_ID_REMAP[id] ?? (id as ZoneId);
}

function remapAspect(id: string): Aspect {
  return remapAspectId(id) ?? "air";
}

function remapStatId(id: string): StatId {
  if (id.startsWith("aspectDamage:")) {
    const aspect = remapAspect(id.slice("aspectDamage:".length));
    return `aspectDamage:${aspect}`;
  }
  return id as StatId;
}

function remapItem(item: ItemDef): void {
  if (item.aspectTag) item.aspectTag = remapAspect(String(item.aspectTag));
  for (const affix of item.affixes) {
    affix.statId = remapStatId(String(affix.statId));
  }
  normalizeWeaponItemSlot(item);
  ensureItemIcon(item);
}

/** Число слотов сохранений (сетка 5x3). */
export const SAVE_SLOT_COUNT = 15;
export const SAVE_SLOT_COLS = 5;
export const SAVE_SLOT_ROWS = 3;

const SLOTS_KEY = "soulsplit.slots.v1";
/** Старый одиночный сейв - мигрируем в слот 0. */
const LEGACY_SAVE_KEY = "soulsplit.save.v1";

export interface SaveSlotRecord {
  updatedAt: number;
  state: GameState;
}

export type SaveSlotSummary =
  | { index: number; empty: true }
  | {
      index: number;
      empty: false;
      name: string;
      level: number;
      aspect: Aspect;
      portraitUrl: string;
      gold: number;
      updatedAt: number;
    };

interface SlotsBlob {
  version: 1;
  slots: (SaveSlotRecord | null)[];
}

function emptySlots(): (SaveSlotRecord | null)[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, () => null);
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const v = value as GameState;
  if (!v.hero || v.hero.version !== HERO_PROFILE_VERSION) return false;
  if (!Array.isArray(v.unlockedZones)) return false;
  return typeof v.hero.name === "string" && typeof v.hero.level === "number";
}

function normalizeState(parsed: GameState): GameState {
  const state = cloneGameState(parsed);
  if (typeof state.hero.gold !== "number" || !Number.isFinite(state.hero.gold)) {
    state.hero.gold = 0;
  }
  state.hero.aspect = remapAspect(state.hero.aspect);
  state.hero.learnedAspects = [
    ...new Set(state.hero.learnedAspects.map((a) => remapAspect(String(a)))),
  ];
  for (const item of Object.values(state.hero.equipment)) {
    if (item) remapItem(item);
  }
  for (const cell of state.hero.inventory) {
    if (cell) remapItem(cell);
  }
  for (const cell of state.hero.stash ?? []) {
    if (cell) remapItem(cell);
  }
  const bonuses = state.hero.levelBonuses;
  if (bonuses) {
    for (const key of Object.keys(bonuses)) {
      const next = remapStatId(key);
      if (next === key) continue;
      bonuses[next] = (bonuses[next] ?? 0) + (bonuses[key as StatId] ?? 0);
      delete bonuses[key as StatId];
    }
  }
  state.unlockedZones = [...new Set(state.unlockedZones.map(remapZoneId))];
  if (state.lastZoneId) state.lastZoneId = remapZoneId(state.lastZoneId);
  ensureHeroStash(state.hero);
  ensureHeroBeltPotions(state.hero);
  ensureMarket(state);
  return state;
}

function readBlob(): SlotsBlob {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && (parsed as SlotsBlob).version === 1) {
        const slots = (parsed as SlotsBlob).slots;
        if (Array.isArray(slots)) {
          const out = emptySlots();
          for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
            const rec = slots[i];
            if (!rec || typeof rec !== "object") continue;
            if (!isGameState(rec.state)) continue;
            out[i] = {
              updatedAt: typeof rec.updatedAt === "number" ? rec.updatedAt : Date.now(),
              state: normalizeState(rec.state),
            };
          }
          return { version: 1, slots: out };
        }
      }
    }
  } catch (err) {
    console.warn("readBlob failed", err);
  }

  const migrated = migrateLegacy();
  if (migrated) return migrated;

  return { version: 1, slots: emptySlots() };
}

function migrateLegacy(): SlotsBlob | null {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isGameState(parsed)) {
      localStorage.removeItem(LEGACY_SAVE_KEY);
      return null;
    }
    const slots = emptySlots();
    slots[0] = { updatedAt: Date.now(), state: normalizeState(parsed) };
    const blob: SlotsBlob = { version: 1, slots };
    localStorage.setItem(SLOTS_KEY, JSON.stringify(blob));
    localStorage.removeItem(LEGACY_SAVE_KEY);
    return blob;
  } catch (err) {
    console.warn("migrateLegacy failed", err);
    return null;
  }
}

function writeBlob(blob: SlotsBlob): void {
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(blob));
  } catch (err) {
    console.warn("writeBlob failed", err);
  }
}

function assertSlot(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= SAVE_SLOT_COUNT) {
    throw new Error(`Invalid save slot: ${index}`);
  }
}

export function listSaveSlots(): SaveSlotSummary[] {
  const { slots } = readBlob();
  return slots.map((rec, index): SaveSlotSummary => {
    if (!rec) return { index, empty: true };
    const h = rec.state.hero;
    return {
      index,
      empty: false,
      name: h.name,
      level: h.level,
      aspect: h.aspect,
      portraitUrl: h.portraitUrl,
      gold: h.gold,
      updatedAt: rec.updatedAt,
    };
  });
}

export function loadSlot(index: number): GameState | null {
  assertSlot(index);
  const rec = readBlob().slots[index];
  return rec ? cloneGameState(rec.state) : null;
}

export function saveSlot(index: number, state: GameState): void {
  assertSlot(index);
  const blob = readBlob();
  blob.slots[index] = {
    updatedAt: Date.now(),
    state: cloneGameState(state),
  };
  writeBlob(blob);
}

export function clearSlot(index: number): void {
  assertSlot(index);
  const blob = readBlob();
  blob.slots[index] = null;
  writeBlob(blob);
}

export function createSlotGame(index: number, state: GameState): void {
  saveSlot(index, state);
}

/** @deprecated Одиночный сейв заменён слотами; оставлено для совместимости вызовов. */
export const SAVE_KEY = SLOTS_KEY;

export function saveGame(state: GameState, slotIndex = 0): void {
  saveSlot(slotIndex, state);
}

export function loadGame(slotIndex = 0): GameState | null {
  return loadSlot(slotIndex);
}

export function loadOrNewGame(): GameState {
  return loadSlot(0) ?? createNewGameState();
}

export function clearSave(slotIndex = 0): void {
  clearSlot(slotIndex);
}
