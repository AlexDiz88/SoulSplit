import { pickRandomHeroPortraitUrl } from "../art/portraits";
import type { UnitInit } from "../combat/Unit";
import type { EquipmentMap } from "../items/equipment";
import {
  createStarterWeapon,
  DEFAULT_STARTER_WEAPON,
  type StarterWeaponId,
} from "../items/starterWeapons";
import {
  cloneInventory,
  cloneStash,
  createEmptyInventory,
  createEmptyStash,
  type InventoryBag,
} from "../items/inventory";
import type { StatId } from "../stats/statIds";
import { createBaseHeroSheet, type HeroStatSheet } from "../stats/sheet";
import type { AbilityId, Aspect } from "../types";
import { applyXpGain, levelBonusesAsStatDelta, type AddXpResult } from "./progression";

export const HERO_PROFILE_VERSION = 1 as const;

/** Стартовый лоадаут по первичному аспекту (до 4 слотов панели). */
export const STARTER_LOADOUT_BY_ASPECT: Record<Aspect, AbilityId[]> = {
  alchemy: [],
  arcane: [],
  air: ["wind_gust", "wind_speed", "squall", "tornado"],
  beast: [],
  earth: [],
  illusion: [],
  witchcraft: [],
  blood: [],
  ice: ["ice_arrow", "ice_shield"],
  mechanics: [],
  lightning: [],
  death: [],
  fire: ["fireball", "flame_cone"],
  nature: ["rejuvenation", "root_grasp", "poison_bush"],
  mind: [],
  light: ["hammer_throw"],
  might: ["titan_might", "demoralizing_shout"],
  stealth: ["sever_artery", "shadow_strike"],
  hunt: [],
  dark: [],
};

export interface NewHeroOptions {
  name: string;
  aspect: Aspect;
  portraitUrl: string;
  /** Стартовое оружие; экипируется в mainhand при создании. */
  starterWeapon?: StarterWeaponId;
  /** Стартовая способность аспекта; если задана - единственный слот лоадаута. */
  starterAbility?: AbilityId;
}

export const HERO_NAME_MIN_LENGTH = 2;
export const HERO_NAME_MAX_LENGTH = 15;

/**
 * Буквы, группы через -/_ , цифры только суффиксом.
 * Допустимо: Kai, Kai-Max, Kai13, Kai-13.
 */
const HERO_NAME_PATTERN =
  /^[A-Za-zА-Яа-яЁё]+(?:[-_][A-Za-zА-Яа-яЁё]+)*(?:[-_]\d+|\d*)$/;

/** null если имя ок, иначе текст ошибки для UI. */
export function validateHeroName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < HERO_NAME_MIN_LENGTH || name.length > HERO_NAME_MAX_LENGTH) {
    return `Имя должно быть от ${HERO_NAME_MIN_LENGTH} до ${HERO_NAME_MAX_LENGTH} символов.`;
  }
  if (/[^A-Za-zА-Яа-яЁё0-9_-]/.test(name)) {
    return 'Разрешены буквы, цифры и символы "-" и "_".';
  }
  if (/^[-_]/.test(name)) {
    return 'Имя не может начинаться с "-" или "_".';
  }
  if (/[-_]$/.test(name)) {
    return 'Имя не может заканчиваться на "-" или "_".';
  }
  if (/[-_]{2,}/.test(name)) {
    return 'Нельзя ставить несколько символов "-" или "_" подряд.';
  }
  if (!HERO_NAME_PATTERN.test(name)) {
    return "Цифры допустимы только в конце имени.";
  }
  return null;
}

function shortFromName(name: string): string {
  const trimmed = name.trim();
  const letters = [...trimmed].filter((ch) => /\S/.test(ch));
  const take = letters.slice(0, 3).join("").toUpperCase();
  return take || "ГЕР";
}

function makeHeroId(): string {
  return `hero_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export interface HeroProfile {
  version: typeof HERO_PROFILE_VERSION;
  id: string;
  name: string;
  short: string;
  level: number;
  /** XP внутри текущего уровня. */
  xp: number;
  /** Золото (скупщик в хабе). */
  gold: number;
  aspect: Aspect;
  learnedAspects: Aspect[];
  abilityLoadout: AbilityId[];
  equipment: EquipmentMap;
  inventory: InventoryBag;
  /** Городской тайник 10×10 (не берётся в бой). */
  stash: InventoryBag;
  /** Накопленные бонусы от level-up (синхронизируются при повышении уровня). */
  levelBonuses: Partial<Record<StatId, number>>;
  /** URL портрета; фиксируется при создании, чтобы не прыгал между боями. */
  portraitUrl: string;
  /**
   * Текущее HP вне полного восстановления.
   * `null` / отсутствует - полный запас (maxHp).
   * После "Белый флаг" сохраняется урон; после победы/смерти сбрасывается.
   */
  currentHp?: number | null;
}

function cloneEquipment(src: EquipmentMap): EquipmentMap {
  const out: EquipmentMap = {};
  for (const [slot, item] of Object.entries(src)) {
    if (!item) continue;
    out[slot as keyof EquipmentMap] = structuredClone(item);
  }
  return out;
}

export function cloneHeroProfile(src: HeroProfile): HeroProfile {
  return {
    ...src,
    learnedAspects: [...src.learnedAspects],
    abilityLoadout: [...src.abilityLoadout],
    equipment: cloneEquipment(src.equipment),
    inventory: cloneInventory(src.inventory).map((cell) => (cell ? structuredClone(cell) : null)),
    stash: cloneStash(src.stash).map((cell) => (cell ? structuredClone(cell) : null)),
    levelBonuses: { ...src.levelBonuses },
    currentHp: src.currentHp ?? null,
  };
}

/** База листа без экипа: createBaseHeroSheet + levelBonuses. */
export function sheetBaseFromProfile(profile: HeroProfile): HeroStatSheet {
  return createBaseHeroSheet(profile.levelBonuses);
}

export function createNewHeroProfile(opts?: Partial<NewHeroOptions>): HeroProfile {
  const starterId = opts?.starterWeapon ?? DEFAULT_STARTER_WEAPON;
  const weapon = createStarterWeapon(starterId, "mainhand");
  const name = (opts?.name?.trim() || "Айра").slice(0, HERO_NAME_MAX_LENGTH);
  const aspect = opts?.aspect ?? "air";
  const loadout = opts?.starterAbility
    ? [opts.starterAbility]
    : STARTER_LOADOUT_BY_ASPECT[aspect];
  return {
    version: HERO_PROFILE_VERSION,
    id: opts ? makeHeroId() : "aira",
    name,
    short: shortFromName(name),
    level: 1,
    xp: 0,
    gold: 0,
    aspect,
    learnedAspects: [aspect],
    abilityLoadout: [...loadout],
    equipment: { mainhand: weapon },
    inventory: createEmptyInventory(),
    stash: createEmptyStash(),
    levelBonuses: {},
    portraitUrl: opts?.portraitUrl || pickRandomHeroPortraitUrl(),
    currentHp: null,
  };
}

/** Дозаполнить stash у старых сейвов без поля. */
export function ensureHeroStash(profile: HeroProfile): void {
  profile.stash = cloneStash(profile.stash).map((cell) => (cell ? structuredClone(cell) : null));
}

/** Данные для `new Unit(...)` из профиля. Экип/инвентарь - глубокие копии. */
export function hydrateCombatUnit(profile: HeroProfile): UnitInit {
  const equipment = cloneEquipment(profile.equipment);
  const inventory = cloneInventory(profile.inventory).map((cell) =>
    cell ? structuredClone(cell) : null,
  );
  const weapon = equipment.mainhand?.weapon ?? equipment.offhand?.weapon;
  return {
    id: profile.id,
    name: profile.name,
    short: profile.short,
    team: "player",
    aspect: profile.aspect,
    pos: { col: 1, row: 0 },
    stats: {
      maxHp: 1,
      atk: weapon?.damageMax ?? 1,
      autoAttackCd: weapon?.baseCd ?? 1.5,
      range: weapon?.range ?? "melee",
      reach: weapon?.reach ?? 1,
    },
    abilities: [...profile.abilityLoadout],
    portraitUrl: profile.portraitUrl,
    equipment,
    inventory,
    sheet: undefined,
    level: profile.level,
  };
}

/** Записать экип/инвентарь юнита обратно в профиль (после боя / хаба). */
export function syncProfileFromUnit(
  profile: HeroProfile,
  gear: { equipment: EquipmentMap; inventory: InventoryBag },
): void {
  profile.equipment = cloneEquipment(gear.equipment);
  profile.inventory = cloneInventory(gear.inventory).map((cell) =>
    cell ? structuredClone(cell) : null,
  );
}

/** Записать текущее HP юнита в профиль (`null` = полный запас). */
export function syncProfileHp(
  profile: HeroProfile,
  unit: { hp: number; stats: { maxHp: number } },
): void {
  const hp = Math.ceil(unit.hp);
  profile.currentHp = hp >= unit.stats.maxHp ? null : Math.max(1, hp);
}

/** Наложить `currentHp` профиля на уже собранного юнита (после rebuild листа). */
export function applyProfileHp(
  unit: { hp: number; stats: { maxHp: number }; redraw: () => void },
  profile: HeroProfile,
): void {
  const saved = profile.currentHp;
  if (saved == null) return;
  unit.hp = Math.min(unit.stats.maxHp, Math.max(1, Math.ceil(saved)));
  unit.redraw();
}

/** Добавить XP и обновить levelBonuses. Мутирует profile. */
export function addXpToProfile(profile: HeroProfile, amount: number): AddXpResult {
  const result = applyXpGain(profile.level, profile.xp, amount);
  profile.level = result.level;
  profile.xp = result.xp;
  if (result.levelsGained > 0) {
    profile.levelBonuses = levelBonusesAsStatDelta(profile.level);
  }
  return {
    leveled: result.leveled,
    levelsGained: result.levelsGained,
    overflowXp: result.overflowXp,
  };
}
