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
  type OffhandImplicit,
  type RolledAffix,
  type WeaponImplicit,
} from "./types";
import { AFFIX_CATALOG, rollAffix } from "./affixCatalog";
import { familiesForSlot, isStatAllowedOnSlot } from "./slotRules";
import { isAspectItemSlot, type EquipSlotId } from "./slots";
import {
  OFFHAND_TYPES,
  OFFHAND_TYPE_BY_ID,
  type OffhandTypeId,
} from "./offhandTypes";
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

function poolForFamilies(
  slot: EquipSlotId,
  families: ReadonlySet<string>,
  aspectTag: Aspect | undefined,
): AffixDef[] {
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

function poolForSlot(slot: EquipSlotId, aspectTag: Aspect | undefined): AffixDef[] {
  return poolForFamilies(slot, new Set(familiesForSlot(slot)), aspectTag);
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

function makeWeaponImplicit(
  itemLevel: number,
  rng: () => number,
  slot: "mainhand" | "offhand",
  forceTypeId?: WeaponTypeId,
): WeaponImplicit {
  const pool = weaponTypesForSlot(slot);
  const forced = forceTypeId ? WEAPON_TYPE_BY_ID[forceTypeId] : undefined;
  const def =
    forced && (slot === "mainhand" || forced.grip === "either")
      ? forced
      : pool[randInt(rng, 0, pool.length - 1)]!;
  const stats = scaleWeaponStats(def, itemLevel);
  return {
    kind: def.kind,
    typeId: def.id,
    damageMin: stats.damageMin,
    damageMax: stats.damageMax,
    baseCd: stats.baseCd,
    reach: stats.reach,
    range: def.range,
    grip: def.grip,
    twoHand: def.grip === "twoHand",
  };
}

function makeOffhandImplicit(rng: () => number): OffhandImplicit {
  const def = OFFHAND_TYPES[randInt(rng, 0, OFFHAND_TYPES.length - 1)]!;
  return { typeId: def.id };
}

function weaponDisplayName(typeId: WeaponTypeId | undefined, kindLabelFallback: string): string {
  if (typeId && WEAPON_TYPE_BY_ID[typeId]) return WEAPON_TYPE_BY_ID[typeId].name;
  return kindLabelFallback;
}

function offhandDisplayName(typeId: OffhandTypeId | undefined): string {
  if (typeId && OFFHAND_TYPE_BY_ID[typeId]) return OFFHAND_TYPE_BY_ID[typeId].name;
  return "Левая рука";
}

function defaultName(
  slot: EquipSlotId,
  _rarity: ItemRarity,
  aspect?: Aspect,
  weapon?: WeaponImplicit,
  offhand?: OffhandImplicit,
): string {
  const aspectPart = aspect ? ASPECT_LABEL[aspect] + " " : "";
  if (weapon) {
    const base = weaponDisplayName(weapon.typeId, "Оружие");
    return `${aspectPart}${base}`.trim();
  }
  if (offhand) {
    return `${aspectPart}${offhandDisplayName(offhand.typeId)}`.trim();
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

function rollAffixes(
  slot: EquipSlotId,
  rarity: ItemRarity,
  itemLevel: number,
  aspectTag: Aspect | undefined,
  rng: () => number,
  familyOverride?: ReadonlySet<string>,
): RolledAffix[] {
  const count = affixCountForRarity(rarity, rng);
  const pool = familyOverride
    ? poolForFamilies(slot, familyOverride, aspectTag)
    : poolForSlot(slot, aspectTag);
  const usedStats = new Set<string>();
  const affixes: RolledAffix[] = [];

  for (let i = 0; i < count; i++) {
    const candidates = pool.filter((a) => !usedStats.has(a.statId));
    const picked = pickWeighted(candidates, (a) => a.weight ?? 10, rng);
    if (!picked) break;
    usedStats.add(picked.statId);
    const rolled = rollAffix(picked, itemLevel, rng);
    affixes.push({
      affixId: picked.id,
      statId: picked.statId,
      value: rolled.value,
      affixSlot: pickAffixSlot(picked, rng),
      label: picked.label,
      tierId: rolled.tierId,
      tierMin: rolled.tierMin,
      tierMax: rolled.tierMax,
    });
  }

  if (aspectTag && rarityAllowsAspectBonus(rarity)) {
    const hasAspect = affixes.some((a) => a.statId === `aspectDamage:${aspectTag}`);
    if (!hasAspect) {
      const aspectAffix = pool.find((a) => a.statId === `aspectDamage:${aspectTag}`);
      if (aspectAffix) {
        if (affixes.length >= count && affixes.length > 0) affixes.pop();
        const rolled = rollAffix(aspectAffix, itemLevel, rng);
        affixes.push({
          affixId: aspectAffix.id,
          statId: aspectAffix.statId,
          value: rolled.value,
          affixSlot: pickAffixSlot(aspectAffix, rng),
          label: aspectAffix.label,
          tierId: rolled.tierId,
          tierMin: rolled.tierMin,
          tierMax: rolled.tierMax,
        });
      }
    }
  }

  return affixes;
}

/**
 * Генерация предмета white..purple.
 * Легендарки сюда не входят.
 *
 * `mainhand` → оружие (любой grip, кроме чистого offhand).
 * `offhand` → оффхенд-предмет (щит/том/сфера/реликвия/колчан), не dual-wield оружие.
 * Dual-wield оружие в offhand появляется через экип either-оружия, не через генерацию слота.
 */
export function generateItem(opts: GenerateItemOptions): ItemDef {
  const rng = opts.rng ?? Math.random;
  const { rarity, itemLevel } = opts;
  const slot = opts.slot;

  if (slot === "mainhand") {
    const aspectTag = rollAspectTag(slot, rarity, opts.learnedAspects, opts.forceAspect, rng);
    const weapon = makeWeaponImplicit(itemLevel, rng, "mainhand", opts.forceWeaponType);
    const affixes = rollAffixes(slot, rarity, itemLevel, aspectTag, rng);
    return {
      id: `item_${slot}_${rarity}_${Math.floor(rng() * 1e9)}`,
      name: opts.name ?? defaultName(slot, rarity, aspectTag, weapon),
      slot,
      rarity,
      itemLevel,
      affixes,
      icon: pickItemIconUrl(slot, rarity, rng, {
        weaponArt: weapon.typeId ? WEAPON_TYPE_BY_ID[weapon.typeId].art : undefined,
        weaponKind: weapon.kind,
      }),
      aspectTag,
      weapon,
    };
  }

  if (slot === "offhand") {
    const offhand = makeOffhandImplicit(rng);
    const typeDef = OFFHAND_TYPE_BY_ID[offhand.typeId];
    const allowsAspect = typeDef.families.includes("aspect");
    const aspectTag = allowsAspect
      ? rollAspectTag(slot, rarity, opts.learnedAspects, opts.forceAspect, rng)
      : undefined;
    const affixes = rollAffixes(
      slot,
      rarity,
      itemLevel,
      aspectTag,
      rng,
      new Set(typeDef.families),
    );
    return {
      id: `item_${slot}_${rarity}_${Math.floor(rng() * 1e9)}`,
      name: opts.name ?? defaultName(slot, rarity, aspectTag, undefined, offhand),
      slot,
      rarity,
      itemLevel,
      affixes,
      icon: pickItemIconUrl(slot, rarity, rng, { offhandArt: typeDef.art }),
      aspectTag,
      offhand,
    };
  }

  const aspectTag = rollAspectTag(slot, rarity, opts.learnedAspects, opts.forceAspect, rng);
  const affixes = rollAffixes(slot, rarity, itemLevel, aspectTag, rng);
  return {
    id: `item_${slot}_${rarity}_${Math.floor(rng() * 1e9)}`,
    name: opts.name ?? defaultName(slot, rarity, aspectTag),
    slot,
    rarity,
    itemLevel,
    affixes,
    icon: pickItemIconUrl(slot, rarity, rng),
    aspectTag,
  };
}
