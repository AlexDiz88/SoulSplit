import type { AbilityDef, AbilityId, Aspect } from "../../types";
import type { AbilityCatalogDef } from "./types";

export type { AbilityCatalogDef, AbilityStatus, AbilityAspectId, AbilityZoneDef, AbilityCombatBlock } from "./types";

const modules = import.meta.glob<{ default: AbilityCatalogDef }>("./*/*.ts", {
  eager: true,
});

export const ALL_ABILITY_DEFS: AbilityCatalogDef[] = Object.values(modules)
  .map((mod) => mod.default)
  .filter((def): def is AbilityCatalogDef => !!def?.id)
  .sort((a, b) => a.name.localeCompare(b.name, "ru"));

export function getAbilityCatalogDef(id: string): AbilityCatalogDef | undefined {
  const snake = id.replace(/-/g, "_");
  return ALL_ABILITY_DEFS.find((def) => def.id === snake || def.id === id);
}

/** kebab-case id для гримуара / бестиария. */
export function abilityCatalogKebabId(id: string): string {
  return id.replace(/_/g, "-");
}

export function catalogDefToCombat(def: AbilityCatalogDef): AbilityDef | undefined {
  if (!def.combat) return undefined;
  return {
    id: def.id as AbilityId,
    name: def.name,
    aspect: def.combat.aspect,
    glyph: def.combat.glyph,
    cooldown: def.cooldown ?? 0,
    damage: def.damage,
    manaCost: def.manaCost ?? 0,
    targetMode: def.combat.targetMode,
    range: def.combat.range,
    reach: def.combat.reach,
    effects: def.combat.effects,
  };
}

/** Боевой реестр: только дефы с блоком `combat`. */
export function buildCombatAbilities(): Record<AbilityId, AbilityDef> {
  const out = {} as Record<AbilityId, AbilityDef>;
  for (const def of ALL_ABILITY_DEFS) {
    const combat = catalogDefToCombat(def);
    if (!combat) continue;
    out[combat.id] = combat;
  }
  return out;
}

export function statusSortRank(status: string): number {
  if (status === "одобрено") return 0;
  if (status === "черновик") return 1;
  if (status === "под вопросом") return 2;
  if (status === "отказ") return 3;
  return 4;
}

export function defsInAspect(aspectId: string): AbilityCatalogDef[] {
  return ALL_ABILITY_DEFS.filter((def) => def.aspectId === aspectId).sort((a, b) => {
    const byStatus = statusSortRank(a.status) - statusSortRank(b.status);
    if (byStatus !== 0) return byStatus;
    return a.name.localeCompare(b.name, "ru");
  });
}

/** Одобренные способности аспекта героя, уже с боевым блоком. */
export function approvedCombatAbilityIdsForAspect(aspect: Aspect): AbilityId[] {
  const out: AbilityId[] = [];
  const seen = new Set<AbilityId>();
  for (const def of defsInAspect(aspect)) {
    if (def.status !== "одобрено") continue;
    const combat = catalogDefToCombat(def);
    if (!combat || combat.aspect !== aspect) continue;
    if (seen.has(combat.id)) continue;
    seen.add(combat.id);
    out.push(combat.id);
  }
  return out;
}
