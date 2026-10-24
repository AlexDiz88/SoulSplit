import { cloneGameState, createNewGameState, type GameState } from "./gameState";
import { HERO_PROFILE_VERSION } from "./heroProfile";

export const SAVE_KEY = "soulsplit.save.v1";

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const v = value as GameState;
  if (!v.hero || v.hero.version !== HERO_PROFILE_VERSION) return false;
  if (!Array.isArray(v.unlockedZones)) return false;
  return typeof v.hero.name === "string" && typeof v.hero.level === "number";
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("saveGame failed", err);
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isGameState(parsed)) return null;
    const state = cloneGameState(parsed);
    if (typeof state.hero.gold !== "number" || !Number.isFinite(state.hero.gold)) {
      state.hero.gold = 0;
    }
    return state;
  } catch (err) {
    console.warn("loadGame failed", err);
    return null;
  }
}

export function loadOrNewGame(): GameState {
  return loadGame() ?? createNewGameState();
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
