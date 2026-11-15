import type { GameState } from "./gameState";
import { refreshMarketStock } from "./market";

/** Визуальная фаза суток (выводится из часа, в сейве не хранится). */
export type TownTimePhase = "morning" | "day" | "evening" | "night";

/** Старт новой игры / миграции: утро. */
export const DEFAULT_WORLD_HOUR = 8;
export const DEFAULT_DAY_INDEX = 1;

/** Скачок после вылазки (победа / поражение / бегство). */
export const HOURS_PER_SORTIE = 2;
/** Скачок за услугу лекаря. */
export const HOURS_PER_HEALER_SERVICE = 1;
/** Пробуждение после сна в таверне. */
export const WAKE_HOUR = 7;

export interface AdvanceHoursResult {
  daysAdvanced: number;
  hour: number;
  dayIndex: number;
  phase: TownTimePhase;
}

/**
 * Фаза из часа.
 * Утро 6-11, день 12-17, вечер 18-23, ночь 0-5.
 */
export function phaseFromHour(hour: number): TownTimePhase {
  const h = normalizeHour(hour);
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "day";
  if (h >= 18) return "evening";
  return "night";
}

export function normalizeHour(hour: number): number {
  if (!Number.isFinite(hour)) return DEFAULT_WORLD_HOUR;
  const n = Math.floor(hour);
  return ((n % 24) + 24) % 24;
}

export function formatWorldClock(hour: number): string {
  return `${String(normalizeHour(hour)).padStart(2, "0")}:00`;
}

export function phaseLabelRu(phase: TownTimePhase): string {
  switch (phase) {
    case "morning":
      return "Утро";
    case "day":
      return "День";
    case "evening":
      return "Вечер";
    case "night":
      return "Ночь";
  }
}

/** Реролл всех торговцев (сейчас = рынок). */
export function refreshAllMerchants(state: GameState): void {
  refreshMarketStock(state);
}

function onDaysAdvanced(state: GameState, days: number): void {
  if (days <= 0) return;
  state.dayIndex += days;
  refreshAllMerchants(state);
}

/** Сдвинуть часы; при пересечении полуночи - новый день и реролл торговцев. */
export function advanceHours(state: GameState, delta: number): AdvanceHoursResult {
  const add = Math.max(0, Math.floor(delta));
  let hour = normalizeHour(state.hour) + add;
  let days = 0;
  while (hour >= 24) {
    hour -= 24;
    days += 1;
  }
  state.hour = hour;
  onDaysAdvanced(state, days);
  return {
    daysAdvanced: days,
    hour: state.hour,
    dayIndex: state.dayIndex,
    phase: phaseFromHour(state.hour),
  };
}

/**
 * Сон в таверне: всегда следующий день, 7:00, реролл торговцев.
 * Даже если сейчас уже утро - явный пропуск до следующего утра.
 */
export function sleepUntilMorning(state: GameState): AdvanceHoursResult {
  state.hour = WAKE_HOUR;
  onDaysAdvanced(state, 1);
  return {
    daysAdvanced: 1,
    hour: state.hour,
    dayIndex: state.dayIndex,
    phase: phaseFromHour(state.hour),
  };
}

/** Debug: сдвиг часов вперёд (по умолчанию +6). */
export const DEBUG_HOURS_STEP = 6;

export function debugAdvanceHours(
  state: GameState,
  delta: number = DEBUG_HOURS_STEP,
): AdvanceHoursResult {
  return advanceHours(state, delta);
}

/** Нормализация полей времени у старых сейвов. */
export function ensureWorldTime(state: GameState): void {
  if (!Number.isFinite(state.hour)) state.hour = DEFAULT_WORLD_HOUR;
  else state.hour = normalizeHour(state.hour);
  if (!Number.isFinite(state.dayIndex) || state.dayIndex < 1) {
    state.dayIndex = DEFAULT_DAY_INDEX;
  } else {
    state.dayIndex = Math.floor(state.dayIndex);
  }
}
