import { pickItemIconUrl } from "../art/itemIcons";
import { ALL_ASPECTS, ASPECT_LABEL } from "../abilities/definitions";
import type { Aspect } from "../types";
import type { AffixDef } from "./types";
import {
  RARITY_AFFIX_COUNT,
  type AffixSlot,
  type GenerateItemOptions,
  type ItemDef,
  type ItemRarity,
  type RolledAffix,
  type WeaponImplicit,
} from "./types";
import { AFFIX_CATALOG, rollAffixValue } from "./affixCatalog";
import { familiesForSlot, isStatAllowedOnSlot } from "./slotRules";
import { isAspectItemSlot, isWeaponSlot, type EquipSlotId } from "./slots";
import {
  scaleWeaponStats,
  weaponTypesForSlot,
  WEAPON_TYPE_BY_ID,
  type WeaponTypeId,
} from "./weaponTypes";

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

function pickWeighted<T>(items: readonly T[], weightOf: (t: T) => number, rng: () => number): T | null {
  let total = 0;
  for (const it of items) total += Math.max(0, weightOf(it));
  if (total <= 0 || !items.length) return null;
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1] ?? null;
}

function affixCountForRarity(rarity: ItemRarity, rng: () => number): number {
  const [lo, hi] = RARITY_AFFIX_COUNT[rarity];
  return randInt(rng, lo, hi);
}

function poolForSlot(slot: EquipSlotId, aspectTag: Aspect | undefined): AffixDef[] {
  const families = new Set(familiesForSlot(slot));
  return AFFIX_CATALOG.filter((a) => {
    if (!families.has(a.family)) return false;
    if (!isStatAllowedOnSlot(slot, a.statId)) return false;
    if (a.family === "aspect") {
      if (!aspectTag) return false;
      return a.statId === `aspectDamage:${aspectTag}`;
    }
    return true;
  });
}

function pickAffixSlot(def: AffixDef, rng: () => number): AffixSlot {
  const allowed = def.allowedAffixSlots;
  if (allowed.length === 1) return allowed[0]!;
  return rng() < 0.5 ? "prefix" : "suffix";
}

/** Бонус аспекта (и aspectTag) только на rare+. */
function rarityAllowsAspectBonus(rarity: ItemRarity): boolean {
  return rarity === "rare" || rarity === "epic";
}

function rollAspectTag(
  slot: EquipSlotId,
  rarity: ItemRarity,
  learned: Aspect[] | undefined,
  force: Aspect | undefined,
  rng: () => number,
): Aspect | undefined {
  if (!isAspectItemSlot(slot)) return undefined;
  if (!rarityAllowsAspectBonus(rarity)) return undefined;
  if (force) return force;
  const learnedSet = new Set(learned ?? []);
  const pick = pickWeighted(ALL_ASPECTS, (s) => (learnedSet.has(s) ? 3 : 1), rng);
  return pick ?? undefined;
}

function makeWeaponImplicit(itemLevel: number, rng: () => number): WeaponImplicit {
  // Пока без двуручного владения: оружие только из пула основной руки.
  const pool = weaponTypesForSlot("mainhand");
  const def = pool[randInt(rng, 0, pool.length - 1)]!;
  const stats = scaleWeaponStats(def, itemLevel);
  return {
    kind: def.kind,
    typeId: def.id,
    damageMin: stats.damageMin,
    damageMax: stats.damageMax,
    baseCd: stats.baseCd,
    reach: stats.reach,
    range: def.range,
    twoHand: def.twoHand,
  };
}

function weaponDisplayName(typeId: WeaponTypeId | undefined, kindLabelFallback: string): string {
  if (typeId && WEAPON_TYPE_BY_ID[typeId]) return WEAPON_TYPE_BY_ID[typeId].name;
  return kindLabelFallback;
}

function defaultName(slot: EquipSlotId, _rarity: ItemRarity, aspect?: Aspect, weapon?: WeaponImplicit): string {
  const aspectPart = aspect ? ASPECT_LABEL[aspect] + " " : "";
  if (weapon) {
    const base = weaponDisplayName(weapon.typeId, "Оружие");
    return `${aspectPart}${base}`.trim();
  }
  const slotNames: Partial<Record<EquipSlotId, string>> = {
    head: "Шлем",
    chest: "Нагрудник",
    neck: "Амулет",
    shoulders: "Наплечники",
    hands: "Перчатки",
    ring1: "Кольцо",
    ring2: "Кольцо",
    waist: "Пояс",
    legs: "Поножи",
    feet: "Сапоги",
    trinket: "Аксессуар",
    mainhand: "Оружие",
    offhand: "Левая рука",
  };
  return `${aspectPart}${slotNames[slot] ?? "Предмет"}`.trim();
}

/**
 * Генерация предмета white..purple.
 * Легендарки сюда не входят.
 */
export function generateItem(opts: GenerateItemOptions): ItemDef {
  const rng = opts.rng ?? Math.random;
  const { rarity, itemLevel } = opts;
  // Пока без двуручного владения: оружие всегда в основную руку (даже если просили offhand).
  const slot: EquipSlotId = isWeaponSlot(opts.slot) ? "mainhand" : opts.slot;
  const aspectTag = rollAspectTag(slot, rarity, opts.learnedAspects, opts.forceAspect, rng);
  const weapon = isWeaponSlot(opts.slot) ? makeWeaponImplicit(itemLevel, rng) : undefined;

  const count = affixCountForRarity(rarity, rng);
  const pool = poolForSlot(slot, aspectTag);
  const usedStats = new Set<string>();
  const affixes: RolledAffix[] = [];

  for (let i = 0; i < count; i++) {
    const candidates = pool.filter((a) => !usedStats.has(a.statId));
    const picked = pickWeighted(candidates, (a) => a.weight ?? 10, rng);
    if (!picked) break;
    usedStats.add(picked.statId);
    affixes.push({
      affixId: picked.id,
      statId: picked.statId,
      value: rollAffixValue(picked, itemLevel, rng),
      affixSlot: pickAffixSlot(picked, rng),
      label: picked.label,
    });
  }

  // На аспектном предмете rare+ гарантируем хотя бы один aspect-ролл, если пул позволяет.
  if (aspectTag && rarityAllowsAspectBonus(rarity)) {
    const hasAspect = affixes.some((a) => a.statId === `aspectDamage:${aspectTag}`);
    if (!hasAspect) {
      const aspectAffix = pool.find((a) => a.statId === `aspectDamage:${aspectTag}`);
      if (aspectAffix) {
        if (affixes.length >= count && affixes.length > 0) affixes.pop();
        affixes.push({
          affixId: aspectAffix.id,
          statId: aspectAffix.statId,
          value: rollAffixValue(aspectAffix, itemLevel, rng),
          affixSlot: pickAffixSlot(aspectAffix, rng),
          label: aspectAffix.label,
        });
      }
    }
  }

  return {
    id: `item_${slot}_${rarity}_${Math.floor(rng() * 1e9)}`,
    name: opts.name ?? defaultName(slot, rarity, aspectTag, weapon),
    slot,
    rarity,
    itemLevel,
    affixes,
    icon: pickItemIconUrl(slot, rarity, rng, {
      weaponArt: weapon?.typeId ? WEAPON_TYPE_BY_ID[weapon.typeId].art : undefined,
      weaponKind: weapon?.kind,
    }),
    aspectTag,
    weapon,
  };
}
