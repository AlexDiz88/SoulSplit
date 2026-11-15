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
import type { GameState } from "./gameState";
import {
  phaseFromHour,
  sleepUntilMorning,
  type AdvanceHoursResult,
  type TownTimePhase,
} from "./worldTime";

/** Цена слуха. */
export const RUMOR_COST = 25;
/** Максимум слухов за игровой день. */
export const RUMOR_MAX_PER_DAY = 3;
/** Шанс, что слух даст квест (если есть доступный). */
export const RUMOR_QUEST_CHANCE = 0.2;

/** Номер в таверне. */
export const TAVERN_SLEEP_COST = 50;

/** Лимиты панели навыков (7 основной + 3 вторичный). */
export const LOADOUT_MAX = 10;
export const LOADOUT_PRIMARY_MAX = 7;
export const LOADOUT_SECONDARY_MAX = 3;

export type TavernTabId = "rumors" | "sleep" | "fireplace" | "loadout";

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
    fireplaceResting: Boolean(src.fireplaceResting),
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
  const phase = phaseFromHour(state.hour);
  if (phase === "morning") {
    return { ok: false, reason: "Сейчас утро - отдельный номер не нужен" };
  }
  if (!unit) {
    return { ok: false, reason: "Герой недоступен" };
  }
  if (unit.hp >= unit.stats.maxHp) {
    return { ok: false, reason: "Здоровье полное - отдых в номере не требуется" };
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

/** Вторичный аспект: первый выученный, отличный от основного. */
export function secondaryAspectOf(hero: {
  aspect: Aspect;
  learnedAspects: Aspect[];
}): Aspect | null {
  return hero.learnedAspects.find((a) => a !== hero.aspect) ?? null;
}

export function loadoutSlotCaps(hero: {
  aspect: Aspect;
  learnedAspects: Aspect[];
}): { primaryMax: number; secondaryMax: number; totalMax: number } {
  const secondary = secondaryAspectOf(hero);
  if (!secondary) {
    return { primaryMax: LOADOUT_MAX, secondaryMax: 0, totalMax: LOADOUT_MAX };
  }
  return {
    primaryMax: LOADOUT_PRIMARY_MAX,
    secondaryMax: LOADOUT_SECONDARY_MAX,
    totalMax: LOADOUT_MAX,
  };
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
  hero: { aspect: Aspect; learnedAspects: Aspect[] },
  loadout: AbilityId[],
): { ok: true; loadout: AbilityId[] } | { ok: false; reason: string } {
  const caps = loadoutSlotCaps(hero);
  const available = new Set(availableLoadoutAbilities(hero));
  const secondary = secondaryAspectOf(hero);
  const cleaned: AbilityId[] = [];
  const seen = new Set<AbilityId>();
  let primaryCount = 0;
  let secondaryCount = 0;

  for (const id of loadout) {
    if (!id || !available.has(id)) {
      return { ok: false, reason: "Способность недоступна" };
    }
    if (seen.has(id)) {
      return { ok: false, reason: "Способность уже на панели" };
    }
    const def = ABILITIES[id];
    if (!def) return { ok: false, reason: "Неизвестная способность" };
    if (def.aspect === hero.aspect) {
      primaryCount += 1;
      if (primaryCount > caps.primaryMax) {
        return {
          ok: false,
          reason: `С основного аспекта можно взять не больше ${caps.primaryMax}`,
        };
      }
    } else if (secondary && def.aspect === secondary) {
      secondaryCount += 1;
      if (secondaryCount > caps.secondaryMax) {
        return {
          ok: false,
          reason: `Со вторичного аспекта можно взять не больше ${caps.secondaryMax}`,
        };
      }
    } else {
      return { ok: false, reason: "Аспект способности не выучен" };
    }
    seen.add(id);
    cleaned.push(id);
    if (cleaned.length > caps.totalMax) {
      return { ok: false, reason: `На панели не больше ${caps.totalMax} навыков` };
    }
  }

  return { ok: true, loadout: cleaned };
}

export function applyAbilityLoadout(
  hero: { aspect: Aspect; learnedAspects: Aspect[]; abilityLoadout: AbilityId[] },
  next: AbilityId[],
): { ok: true } | { ok: false; reason: string } {
  const checked = validateAbilityLoadout(hero, next);
  if (!checked.ok) return checked;
  hero.abilityLoadout = checked.loadout;
  return { ok: true };
}

export function phaseAllowsTavernSleep(phase: TownTimePhase): boolean {
  return phase !== "morning";
}
