import { pickRandomHeroPortraitUrl } from "../art/portraits";
import type { UnitInit } from "../combat/Unit";
import type { EquipmentMap } from "../items/equipment";
import { createStarterWeapon } from "../items/generate";
import { cloneInventory, createEmptyInventory, type InventoryBag } from "../items/inventory";
import type { StatId } from "../stats/statIds";
import { createBaseHeroSheet, type HeroStatSheet } from "../stats/sheet";
import type { AbilityId, Aspect } from "../types";
import { applyXpGain, levelBonusesAsStatDelta, type AddXpResult } from "./progression";

export const HERO_PROFILE_VERSION = 1 as const;

export interface HeroProfile {
  version: typeof HERO_PROFILE_VERSION;
  id: string;
  name: string;
  short: string;
  level: number;
  /** XP внутри текущего уровня. */
  xp: number;
  aspect: Aspect;
  learnedAspects: Aspect[];
  abilityLoadout: AbilityId[];
  equipment: EquipmentMap;
  inventory: InventoryBag;
  /** Накопленные бонусы от level-up (синхронизируются при повышении уровня). */
  levelBonuses: Partial<Record<StatId, number>>;
  /** URL портрета; фиксируется при создании, чтобы не прыгал между боями. */
  portraitUrl: string;
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
    levelBonuses: { ...src.levelBonuses },
  };
}

/** База листа без экипа: createBaseHeroSheet + levelBonuses. */
export function sheetBaseFromProfile(profile: HeroProfile): HeroStatSheet {
  return createBaseHeroSheet(profile.levelBonuses);
}

export function createNewHeroProfile(): HeroProfile {
  const weapon = createStarterWeapon("mainhand");
  return {
    version: HERO_PROFILE_VERSION,
    id: "aira",
    name: "Айра",
    short: "АЙР",
    level: 1,
    xp: 0,
    aspect: "air",
    learnedAspects: ["air"],
    abilityLoadout: ["wind_gust", "wind_speed", "squall", "tornado"],
    equipment: { mainhand: weapon },
    inventory: createEmptyInventory(),
    levelBonuses: {},
    portraitUrl: pickRandomHeroPortraitUrl(),
  };
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
