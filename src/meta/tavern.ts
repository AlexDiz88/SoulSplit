import { approvedCombatAbilityIdsForAspect } from "../abilities/abilityDefs";
import { ABILITIES } from "../abilities/definitions";
import type { Unit } from "../combat/Unit";
import {
  makeGlobalEffect,
  sanitizeGlobalEffects,
  type GlobalEffect,
} from "../effects/globalEffects";
import { acceptQuest, questUiStatus } from "../quests/questLog";
import { ALL_QUEST_IDS } from "../quests/definitions";
import type { QuestId } from "../quests/types";
import { getStat } from "../stats/sheet";
import type { AbilityId, Aspect } from "../types";
import {
  arrangeAbilityLoadout,
  firstFreeBandSlot,
  isLoadoutSlotUnlocked,
  LOADOUT_MAX,
  loadoutBandForIndex,
  loadoutSlotCapsForLevel,
  type AbilityLoadout,
  type LoadoutSlotCaps,
} from "./abilityProgression";
import type { GameState } from "./gameState";
import {
  phaseFromHour,
  sleepUntilMorning,
  type AdvanceHoursResult,
} from "./worldTime";

export {
  LOADOUT_MAX,
  LOADOUT_PRIMARY_MAX,
  LOADOUT_SECONDARY_MAX,
  type AbilityLoadout,
  type AbilityLoadoutSlot,
  type LoadoutSlotCaps,
} from "./abilityProgression";

/** Цена слуха. */
export const RUMOR_COST = 25;
/** Максимум слухов за игровой день. */
export const RUMOR_MAX_PER_DAY = 3;
/** Шанс, что слух даст квест (если есть доступный). */
export const RUMOR_QUEST_CHANCE = 0.2;

/** Номер в таверне. */
export const TAVERN_SLEEP_COST = 50;

export type TavernTabId = "rumors" | "sleep" | "fireplace" | "loadout";

function classifyLoadoutAbility(
  hero: { aspect: Aspect; learnedAspects: Aspect[] },
  id: AbilityId,
): "primary" | "secondary" | "invalid" {
  const def = ABILITIES[id];
  if (!def || def.targetMode === "passive") return "invalid";
  if (def.aspect === hero.aspect) return "primary";
  const secondary = secondaryAspectOf(hero);
  if (secondary && def.aspect === secondary) return "secondary";
  return "invalid";
}

/**
 * Нормализовать панель: полосы 0..6 основной / 7..9 вторичный.
 * Без героя - только длина и уникальность (черновик).
 */
export function normalizeAbilityLoadout(
  loadout: readonly (AbilityId | null | undefined)[],
  heroOrTotalMax?: { level: number; aspect: Aspect; learnedAspects: Aspect[] } | number,
): AbilityLoadout {
  if (heroOrTotalMax && typeof heroOrTotalMax === "object") {
    const caps = loadoutSlotCaps(heroOrTotalMax);
    return arrangeAbilityLoadout(
      loadout,
      (id) => classifyLoadoutAbility(heroOrTotalMax, id),
      caps,
    );
  }
  const totalMax =
    typeof heroOrTotalMax === "number" ? Math.min(LOADOUT_MAX, heroOrTotalMax) : LOADOUT_MAX;
  const out: AbilityLoadout = Array.from({ length: LOADOUT_MAX }, () => null);
  const seen = new Set<AbilityId>();
  for (let i = 0; i < Math.min(loadout.length, totalMax); i++) {
    const id = loadout[i];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out[i] = id;
  }
  return out;
}

export type RumorOutcomeKind =
  | "gossip"
  | "tip"
  | "quest"
  | "empty_hook";

export interface RumorOutcome {
  kind: RumorOutcomeKind;
  text: string;
  questId?: QuestId;
}

export interface TavernState {
  rumorsDayIndex: number;
  rumorsBoughtToday: number;
  fireplaceResting: boolean;
  /** Слухи текущего дня (для ленты во вкладке). */
  rumorLog: RumorOutcome[];
}

export function createEmptyTavernState(dayIndex = 1): TavernState {
  return {
    rumorsDayIndex: dayIndex,
    rumorsBoughtToday: 0,
    fireplaceResting: false,
    rumorLog: [],
  };
}

function isRumorKind(v: unknown): v is RumorOutcomeKind {
  return v === "gossip" || v === "tip" || v === "quest" || v === "empty_hook";
}

export function cloneTavernState(src: TavernState | null | undefined): TavernState {
  if (!src || typeof src !== "object") return createEmptyTavernState();
  const rumorLog: RumorOutcome[] = [];
  if (Array.isArray(src.rumorLog)) {
    for (const raw of src.rumorLog) {
      if (!raw || typeof raw.text !== "string" || !isRumorKind(raw.kind)) continue;
      rumorLog.push({
        kind: raw.kind,
        text: raw.text,
        ...(raw.questId ? { questId: raw.questId } : {}),
      });
    }
  }
  return {
    rumorsDayIndex: Math.max(1, Math.floor(src.rumorsDayIndex || 1)),
    rumorsBoughtToday: Math.max(0, Math.floor(src.rumorsBoughtToday || 0)),
    // Отдых у камина не переживает загрузку / новую сессию.
    fireplaceResting: false,
    rumorLog,
  };
}

/** Сброс дневного счётчика слухов при смене dayIndex. */
export function ensureTavernDay(state: GameState): TavernState {
  const tavern = state.tavern ?? createEmptyTavernState(state.dayIndex);
  state.tavern = tavern;
  if (tavern.rumorsDayIndex !== state.dayIndex) {
    tavern.rumorsDayIndex = state.dayIndex;
    tavern.rumorsBoughtToday = 0;
    tavern.rumorLog = [];
  }
  return tavern;
}

const GOSSIP_POOL: string[] = [
  "Пьяный стражник клянётся, что видел огоньки над руинами, но к утру уже не помнит, где именно.",
  "Хозяйка таверны шепчет: сегодня у камина сидел человек без тени. Счёт он всё же оплатил.",
  "Купец из Северных холмов жалуется на грязь на дороге и ни слова о бандитах - видимо, те тоже устали.",
  "Мальчишка у двери продаёт \"настоящий\" клык серого волка. Клык деревянный, зато история длинная.",
  "Двое охотников спорят, чей капкан умнее. Спор громче пользы.",
  "Бард поёт о короле, которого никто не помнит. Зал хлопает из вежливости.",
  "Кто-то оставил на столе карту без пометок. Чернила размазаны кружкой эля.",
  "Старик у окна твердит, что завтра будет удачный день. Завтра он скажет то же самое.",
];

const TIP_POOL: string[] = [
  "Говорят, у стены бандиты реже стоят на рассвете - им тоже нужен сон.",
  "В руинах после дождя слышнее шаги. Или так кажется тем, кто туда боится идти.",
  "Лекарь утром берёт меньше за пустяки, если очередь короткая. Очередь почти никогда не короткая.",
  "На рынке мистик иногда прячет лучшее под неприметной тряпкой. Или просто тряпку.",
  "Если идти в вылазку раненым, камин в таверне добрее любого зелья - пока вас не прервут.",
  "Стража у ворот любит рассказы о \"героях\". Чем короче рассказ, тем быстрее вас пропустят.",
];

function pickRandom<T>(pool: readonly T[], rng: () => number): T {
  const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[i]!;
}

function availableRumorQuests(state: GameState): QuestId[] {
  return ALL_QUEST_IDS.filter((id) => questUiStatus(state, id) === "available");
}

export function rumorsLeftToday(state: GameState): number {
  const tavern = ensureTavernDay(state);
  return Math.max(0, RUMOR_MAX_PER_DAY - tavern.rumorsBoughtToday);
}

export function buyRumor(
  state: GameState,
  rng: () => number = Math.random,
): { ok: true; outcome: RumorOutcome } | { ok: false; reason: string } {
  const tavern = ensureTavernDay(state);
  if (tavern.rumorsBoughtToday >= RUMOR_MAX_PER_DAY) {
    return { ok: false, reason: "На сегодня слухов больше нет" };
  }
  if (state.hero.gold < RUMOR_COST) {
    return { ok: false, reason: "Не хватает золота" };
  }

  state.hero.gold -= RUMOR_COST;
  tavern.rumorsBoughtToday += 1;

  let outcome: RumorOutcome;
  const wantQuest = rng() < RUMOR_QUEST_CHANCE;
  const questPool = availableRumorQuests(state);

  if (wantQuest && questPool.length > 0) {
    const questId = pickRandom(questPool, rng);
    const accepted = acceptQuest(state, questId);
    if (accepted.ok) {
      outcome = {
        kind: "quest",
        questId,
        text: `Слух оказался делом. Вам подсказали, куда смотреть: задание уже в журнале.`,
      };
    } else {
      outcome = {
        kind: "empty_hook",
        text: "Казалось, вот-вот услышите важное... но рассказчик замолчал на полуслове.",
      };
    }
  } else if (wantQuest) {
    outcome = {
      kind: "empty_hook",
      text: "Говорили о награде и опасности, но конкретного поручения так и не вышло - один трёп.",
    };
  } else if (rng() < 0.45) {
    outcome = { kind: "tip", text: pickRandom(TIP_POOL, rng) };
  } else {
    outcome = { kind: "gossip", text: pickRandom(GOSSIP_POOL, rng) };
  }

  tavern.rumorLog = [outcome, ...tavern.rumorLog].slice(0, 12);
  return { ok: true, outcome };
}

export function canSleepInTavern(
  state: GameState,
  unit: Unit | null,
): { ok: true } | { ok: false; reason: string } {
  if (!unit) {
    return { ok: false, reason: "Герой недоступен" };
  }
  const phase = phaseFromHour(state.hour);
  const fullHp = unit.hp >= unit.stats.maxHp;
  // Блок только утром при полном здоровье - иначе можно крутить дни нонстопом.
  if (phase === "morning" && fullHp) {
    return {
      ok: false,
      reason: "Вы полны сил и сейчас утро - отдельный номер не нужен",
    };
  }
  if (state.hero.gold < TAVERN_SLEEP_COST) {
    return { ok: false, reason: "Не хватает золота" };
  }
  return { ok: true };
}

/** Полное HP/мана + сон до 7:00 следующего дня. */
export function sleepInTavernRoom(
  state: GameState,
  unit: Unit | null,
): { ok: true; time: AdvanceHoursResult } | { ok: false; reason: string } {
  const check = canSleepInTavern(state, unit);
  if (!check.ok) return check;
  if (!unit) return { ok: false, reason: "Герой недоступен" };

  stopFireplaceRest(state);

  state.hero.gold -= TAVERN_SLEEP_COST;
  unit.hp = unit.stats.maxHp;
  if (unit.sheet) {
    unit.mana = getStat(unit.sheet, "maxMana");
  }
  state.hero.currentHp = null;
  state.hero.currentMana = null;

  const time = sleepUntilMorning(state);
  ensureTavernDay(state);
  return { ok: true, time };
}

export function isFireplaceResting(state: GameState): boolean {
  return Boolean(state.tavern?.fireplaceResting);
}

export function startFireplaceRest(state: GameState): GlobalEffect[] {
  const tavern = ensureTavernDay(state);
  tavern.fireplaceResting = true;
  let effects = sanitizeGlobalEffects(state.hero.globalEffects).filter(
    (e) => e.id !== "rest_recovery" && e.id !== "fireplace_rest",
  );
  effects.push(makeGlobalEffect("fireplace_rest"));
  state.hero.globalEffects = effects;
  return effects;
}

export function stopFireplaceRest(state: GameState): boolean {
  const tavern = ensureTavernDay(state);
  if (!tavern.fireplaceResting) {
    const has = state.hero.globalEffects.some((e) => e.id === "fireplace_rest");
    if (!has) return false;
  }
  tavern.fireplaceResting = false;
  let effects = sanitizeGlobalEffects(state.hero.globalEffects).filter(
    (e) => e.id !== "fireplace_rest",
  );
  if (!effects.some((e) => e.id === "rest_recovery")) {
    effects.push(makeGlobalEffect("rest_recovery"));
  }
  state.hero.globalEffects = effects;
  return true;
}

/**
 * Сброс отдыха у камина на границе сессии:
 * выход из игры, F5 / закрытие вкладки, загрузка слота, вход в игру.
 */
export function endFireplaceRestSession(state: GameState): void {
  stopFireplaceRest(state);
}

/** Вторичный аспект: первый выученный, отличный от основного. */
export function secondaryAspectOf(hero: {
  aspect: Aspect;
  learnedAspects: Aspect[];
}): Aspect | null {
  return hero.learnedAspects.find((a) => a !== hero.aspect) ?? null;
}

export function loadoutSlotCaps(hero: {
  level: number;
  aspect: Aspect;
  learnedAspects: Aspect[];
}): LoadoutSlotCaps {
  return loadoutSlotCapsForLevel(hero.level, !!secondaryAspectOf(hero));
}

export function availableLoadoutAbilities(hero: {
  aspect: Aspect;
  learnedAspects: Aspect[];
}): AbilityId[] {
  const out: AbilityId[] = [];
  const seen = new Set<AbilityId>();
  for (const aspect of hero.learnedAspects) {
    for (const id of approvedCombatAbilityIdsForAspect(aspect)) {
      if (seen.has(id)) continue;
      if (ABILITIES[id]?.targetMode === "passive") continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function validateAbilityLoadout(
  hero: { level: number; aspect: Aspect; learnedAspects: Aspect[] },
  loadout: readonly (AbilityId | null | undefined)[],
): { ok: true; loadout: AbilityLoadout } | { ok: false; reason: string } {
  const caps = loadoutSlotCaps(hero);
  const available = new Set(availableLoadoutAbilities(hero));
  const secondary = secondaryAspectOf(hero);
  const cleaned = normalizeAbilityLoadout(loadout, hero);
  const seen = new Set<AbilityId>();

  for (let i = 0; i < cleaned.length; i++) {
    const id = cleaned[i];
    if (!id) continue;
    if (!isLoadoutSlotUnlocked(i, caps)) {
      return { ok: false, reason: "Слот ещё закрыт" };
    }
    if (!available.has(id)) {
      return { ok: false, reason: "Способность недоступна" };
    }
    if (seen.has(id)) {
      return { ok: false, reason: "Способность уже на панели" };
    }
    const def = ABILITIES[id];
    if (!def) return { ok: false, reason: "Неизвестная способность" };
    const band = loadoutBandForIndex(i);
    if (band === "primary") {
      if (def.aspect !== hero.aspect) {
        return { ok: false, reason: "В слотах основного аспекта только его способности" };
      }
    } else if (band === "secondary") {
      if (!secondary || def.aspect !== secondary) {
        return { ok: false, reason: "В слотах вторичного аспекта только его способности" };
      }
    } else {
      return { ok: false, reason: "Неверный слот панели" };
    }
    seen.add(id);
  }

  return { ok: true, loadout: cleaned };
}

export function applyAbilityLoadout(
  hero: {
    level: number;
    aspect: Aspect;
    learnedAspects: Aspect[];
    abilityLoadout: AbilityLoadout;
  },
  next: readonly (AbilityId | null | undefined)[],
): { ok: true } | { ok: false; reason: string } {
  const checked = validateAbilityLoadout(hero, next);
  if (!checked.ok) return checked;
  hero.abilityLoadout = checked.loadout;
  return { ok: true };
}

/** Поставить способность в первый свободный слот своей полосы (для level-up pick). */
export function placeAbilityOnLoadout(
  hero: {
    level: number;
    aspect: Aspect;
    learnedAspects: Aspect[];
    abilityLoadout: AbilityLoadout;
  },
  abilityId: AbilityId,
): { ok: true; index: number } | { ok: false; reason: string } {
  const kind = classifyLoadoutAbility(hero, abilityId);
  if (kind === "invalid") return { ok: false, reason: "Способность недоступна" };
  const caps = loadoutSlotCaps(hero);
  const next = normalizeAbilityLoadout(hero.abilityLoadout, hero);
  if (next.includes(abilityId)) {
    return { ok: false, reason: "Способность уже на панели" };
  }
  const index = firstFreeBandSlot(next, kind, caps);
  if (index < 0) {
    return {
      ok: false,
      reason:
        kind === "primary"
          ? "Нет свободного слота основного аспекта"
          : "Нет свободного слота вторичного аспекта",
    };
  }
  next[index] = abilityId;
  const checked = validateAbilityLoadout(hero, next);
  if (!checked.ok) return checked;
  hero.abilityLoadout = checked.loadout;
  return { ok: true, index };
}
