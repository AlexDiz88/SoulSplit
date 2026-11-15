import type { AbilityId, Aspect } from "../types";

/** Лимиты панели навыков (7 основной + 3 вторичный). */
export const LOADOUT_MAX = 10;
export const LOADOUT_PRIMARY_MAX = 7;
export const LOADOUT_SECONDARY_MAX = 3;

/** Уровень, на котором выбирается вторичный аспект. */
export const SECONDARY_ASPECT_UNLOCK_LEVEL = 5;

/** Слот панели: способность или пусто (позиция = хоткей). */
export type AbilityLoadoutSlot = AbilityId | null;
export type AbilityLoadout = AbilityLoadoutSlot[];

/** Шаг очереди после level-up. */
export type PendingLoadoutPick =
  | { kind: "choose_secondary_aspect" }
  | { kind: "choose_ability"; aspect: Aspect };

export interface LoadoutSlotCaps {
  primaryMax: number;
  secondaryMax: number;
  totalMax: number;
}

/** Кап слотов основного аспекта по уровню героя. */
export function primarySlotCapForLevel(level: number): number {
  const L = Math.max(1, Math.floor(level));
  if (L <= 1) return 1;
  if (L === 2) return 2;
  if (L === 3) return 3;
  if (L === 4 || L === 5) return 4;
  if (L === 6 || L === 7) return 5;
  if (L === 8 || L === 9) return 6;
  return LOADOUT_PRIMARY_MAX;
}

/** Кап слотов вторичного аспекта по уровню (0 до выбора школы). */
export function secondarySlotCapForLevel(level: number): number {
  const L = Math.max(1, Math.floor(level));
  if (L < SECONDARY_ASPECT_UNLOCK_LEVEL) return 0;
  if (L === 5 || L === 6) return 1;
  if (L === 7 || L === 8) return 2;
  return LOADOUT_SECONDARY_MAX;
}

export function loadoutSlotCapsForLevel(
  level: number,
  hasSecondary: boolean,
): LoadoutSlotCaps {
  const primaryMax = primarySlotCapForLevel(level);
  const secondaryMax = hasSecondary ? secondarySlotCapForLevel(level) : 0;
  return {
    primaryMax,
    secondaryMax,
    totalMax: primaryMax + secondaryMax,
  };
}

/** Индекс в панели: 0..6 основной, 7..9 вторичный. */
export function loadoutBandForIndex(index: number): "primary" | "secondary" | null {
  if (index < 0 || index >= LOADOUT_MAX) return null;
  if (index < LOADOUT_PRIMARY_MAX) return "primary";
  return "secondary";
}

/** Абсолютный индекс слота в панели для n-го открытого слота полосы. */
export function loadoutSlotIndex(band: "primary" | "secondary", ordinal: number): number {
  if (band === "primary") return ordinal;
  return LOADOUT_PRIMARY_MAX + ordinal;
}

/** Слот открыт для текущего капа. */
export function isLoadoutSlotUnlocked(index: number, caps: LoadoutSlotCaps): boolean {
  const band = loadoutBandForIndex(index);
  if (!band) return false;
  if (band === "primary") return index < caps.primaryMax;
  return index - LOADOUT_PRIMARY_MAX < caps.secondaryMax;
}

/** Минимальный уровень, на котором открывается слот панели. */
export function unlockLevelForLoadoutSlot(index: number): number | null {
  const band = loadoutBandForIndex(index);
  if (!band) return null;
  if (band === "primary") {
    const need = index + 1;
    for (let L = 1; L <= 10; L++) {
      if (primarySlotCapForLevel(L) >= need) return L;
    }
    return 10;
  }
  const need = index - LOADOUT_PRIMARY_MAX + 1;
  for (let L = 1; L <= 10; L++) {
    if (secondarySlotCapForLevel(L) >= need) return L;
  }
  return 10;
}

export function emptyAbilityLoadout(): AbilityLoadout {
  return Array.from({ length: LOADOUT_MAX }, () => null);
}

/** Нормализовать длину панели до LOADOUT_MAX без перестановки полос. */
export function normalizeAbilityLoadoutLength(
  loadout: readonly (AbilityId | null | undefined)[],
): AbilityLoadout {
  const out = emptyAbilityLoadout();
  for (let i = 0; i < Math.min(loadout.length, LOADOUT_MAX); i++) {
    out[i] = loadout[i] ?? null;
  }
  return out;
}

/**
 * Разложить способности по полосам 0..6 / 7..9 с учётом капов.
 * Лишние / чужие отбрасываются (порядок сохраняется).
 */
export function arrangeAbilityLoadout(
  abilities: readonly (AbilityId | null | undefined)[],
  classify: (id: AbilityId) => "primary" | "secondary" | "invalid",
  caps: LoadoutSlotCaps,
): AbilityLoadout {
  const out = emptyAbilityLoadout();
  const primary: AbilityId[] = [];
  const secondary: AbilityId[] = [];
  const seen = new Set<AbilityId>();

  for (const id of abilities) {
    if (!id || seen.has(id)) continue;
    const kind = classify(id);
    if (kind === "invalid") continue;
    seen.add(id);
    if (kind === "primary") primary.push(id);
    else secondary.push(id);
  }

  for (let i = 0; i < Math.min(primary.length, caps.primaryMax); i++) {
    out[i] = primary[i]!;
  }
  for (let i = 0; i < Math.min(secondary.length, caps.secondaryMax); i++) {
    out[LOADOUT_PRIMARY_MAX + i] = secondary[i]!;
  }
  return out;
}

/** Первый свободный открытый слот полосы. */
export function firstFreeBandSlot(
  loadout: readonly (AbilityId | null | undefined)[],
  band: "primary" | "secondary",
  caps: LoadoutSlotCaps,
): number {
  const max = band === "primary" ? caps.primaryMax : caps.secondaryMax;
  for (let ord = 0; ord < max; ord++) {
    const idx = loadoutSlotIndex(band, ord);
    if (!loadout[idx]) return idx;
  }
  return -1;
}

export function countLoadoutFilledByBand(
  loadout: readonly (AbilityId | null | undefined)[],
): { primary: number; secondary: number } {
  let primary = 0;
  let secondary = 0;
  for (let i = 0; i < Math.min(loadout.length, LOADOUT_MAX); i++) {
    if (!loadout[i]) continue;
    const band = loadoutBandForIndex(i);
    if (band === "primary") primary += 1;
    else if (band === "secondary") secondary += 1;
  }
  return { primary, secondary };
}

export function clonePendingLoadoutPicks(
  src: readonly PendingLoadoutPick[] | null | undefined,
): PendingLoadoutPick[] {
  if (!Array.isArray(src)) return [];
  const out: PendingLoadoutPick[] = [];
  for (const raw of src) {
    if (!raw || typeof raw !== "object") continue;
    if (raw.kind === "choose_secondary_aspect") {
      out.push({ kind: "choose_secondary_aspect" });
    } else if (raw.kind === "choose_ability" && typeof raw.aspect === "string") {
      out.push({ kind: "choose_ability", aspect: raw.aspect as Aspect });
    }
  }
  return out;
}

/**
 * Шаги очереди при переходе на `toLevel`.
 * На 5 уровне - только выбор аспекта; способность вторичного добавится после выбора школы.
 */
export function pendingPicksForReachingLevel(
  toLevel: number,
  primaryAspect: Aspect,
  secondaryAspect: Aspect | null,
): PendingLoadoutPick[] {
  const L = Math.floor(toLevel);
  const prev = L - 1;
  if (L < 2) return [];

  if (L === SECONDARY_ASPECT_UNLOCK_LEVEL) {
    return [{ kind: "choose_secondary_aspect" }];
  }

  const picks: PendingLoadoutPick[] = [];
  if (primarySlotCapForLevel(L) > primarySlotCapForLevel(prev)) {
    picks.push({ kind: "choose_ability", aspect: primaryAspect });
  }
  if (
    secondaryAspect &&
    secondarySlotCapForLevel(L) > secondarySlotCapForLevel(prev)
  ) {
    picks.push({ kind: "choose_ability", aspect: secondaryAspect });
  }
  return picks;
}

/** Добавить в очередь шаги за каждый полученный уровень. */
export function enqueueLoadoutPicksForLevelGain(
  pending: PendingLoadoutPick[],
  fromLevel: number,
  levelsGained: number,
  primaryAspect: Aspect,
  secondaryAspect: Aspect | null,
): PendingLoadoutPick[] {
  if (levelsGained <= 0) return pending;
  const next = [...pending];
  for (let i = 1; i <= levelsGained; i++) {
    next.push(
      ...pendingPicksForReachingLevel(fromLevel + i, primaryAspect, secondaryAspect),
    );
  }
  return next;
}

export function secondaryAspectFromLearned(
  primary: Aspect,
  learnedAspects: readonly Aspect[],
): Aspect | null {
  return learnedAspects.find((a) => a !== primary) ?? null;
}

/**
 * Миграция очереди: ур.≥5 без вторичного → выбор аспекта.
 * Пустые слоты после закрытой очереди не форсируем (таверна разрешает пустые).
 */
export function reconcilePendingLoadoutPicks(hero: {
  level: number;
  aspect: Aspect;
  learnedAspects: Aspect[];
  abilityLoadout?: readonly (AbilityId | null | undefined)[];
  pendingLoadoutPicks?: PendingLoadoutPick[] | null;
}): PendingLoadoutPick[] {
  let pending = clonePendingLoadoutPicks(hero.pendingLoadoutPicks);
  const secondary = secondaryAspectFromLearned(hero.aspect, hero.learnedAspects);

  const hasAspectPick = pending.some((p) => p.kind === "choose_secondary_aspect");
  if (hero.level >= SECONDARY_ASPECT_UNLOCK_LEVEL && !secondary && !hasAspectPick) {
    pending = [{ kind: "choose_secondary_aspect" }, ...pending];
  }

  if (!secondary && hero.level >= SECONDARY_ASPECT_UNLOCK_LEVEL) {
    return pending.filter(
      (p) =>
        p.kind === "choose_secondary_aspect" ||
        (p.kind === "choose_ability" && p.aspect === hero.aspect),
    );
  }

  // Убрать устаревший choose_secondary_aspect, если школа уже есть.
  if (secondary) {
    pending = pending.filter((p) => p.kind !== "choose_secondary_aspect");
  }
  return pending;
}

/**
 * После выбора вторичного аспекта: добавить в очередь выбор способностей
 * на все уже открытые слоты вторичного (с учётом уже стоящих на панели).
 */
export function enqueueSecondaryAbilityPicksAfterAspectUnlock(hero: {
  level: number;
  aspect: Aspect;
  learnedAspects: Aspect[];
  abilityLoadout: readonly (AbilityId | null | undefined)[];
  pendingLoadoutPicks: PendingLoadoutPick[];
}): PendingLoadoutPick[] {
  const secondary = secondaryAspectFromLearned(hero.aspect, hero.learnedAspects);
  if (!secondary) return hero.pendingLoadoutPicks;
  const caps = loadoutSlotCapsForLevel(hero.level, true);
  const filled = countLoadoutFilledByBand(hero.abilityLoadout).secondary;
  const alreadyQueued = hero.pendingLoadoutPicks.filter(
    (p) => p.kind === "choose_ability" && p.aspect === secondary,
  ).length;
  const need = Math.max(0, caps.secondaryMax - filled - alreadyQueued);
  const next = [...hero.pendingLoadoutPicks];
  for (let i = 0; i < need; i++) {
    next.push({ kind: "choose_ability", aspect: secondary });
  }
  return next;
}

export function hasPendingLoadoutPicks(hero: {
  pendingLoadoutPicks?: PendingLoadoutPick[] | null;
}): boolean {
  return (hero.pendingLoadoutPicks?.length ?? 0) > 0;
}
