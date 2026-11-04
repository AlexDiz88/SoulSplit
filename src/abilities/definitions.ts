import type { AbilityDef, AbilityId } from "../types";
import {
  ALL_ABILITY_DEFS,
  buildCombatAbilities,
  getAbilityCatalogDef,
} from "./abilityDefs";

export { ALL_ASPECTS, ASPECT_COLOR, ASPECT_HEX, ASPECT_LABEL } from "./aspects";
export {
  attackSpeedIncreaseToHasteMult,
  attackSpeedReduceToSlowPotency,
} from "./attackSpeed";

/** Боевые способности из `src/abilities/abilityDefs` (есть блок `combat`). */
export const ABILITIES: Record<AbilityId, AbilityDef> = buildCombatAbilities();

/** Слоты панели героя (песочница). */
export const ALL_ABILITY_IDS: AbilityId[] = ["wind_gust", "wind_speed", "squall", "tornado"];

export function zoneSecondaryDamage(def: AbilityDef): number {
  const ratio = def.effects?.zoneSecondaryRatio ?? 0.55;
  return Math.round(def.damage * ratio);
}

/** Описание для тултипов / статусов - из каталога (единый источник). */
export function describeAbility(def: AbilityDef): string {
  return getAbilityCatalogDef(def.id)?.description ?? def.name;
}

/** Строки блока "Числа" для гримуара - из каталога. */
export function abilityNumberLines(def: AbilityDef): string[] {
  return getAbilityCatalogDef(def.id)?.numbers ?? [];
}

/** Lookup по kebab/snake id карточки. */
export function abilityDefForGrimoireId(cardId: string): AbilityDef | undefined {
  const catalog = getAbilityCatalogDef(cardId);
  if (!catalog?.combat) return undefined;
  return ABILITIES[catalog.id as AbilityId];
}

export { ALL_ABILITY_DEFS, getAbilityCatalogDef };
