import { pickItemIconUrl } from "../art/itemIcons";
import { ALL_ASPECTS, ASPECT_LABEL } from "../abilities/definitions";
import type { Aspect } from "../types";
import type { AffixDef, RolledItemBase } from "./types";
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
import {
  basesForOffhand,
  basesForSlot,
  rollItemBase,
  type ItemBaseDef,
} from "./baseCatalog";
import { familiesForSlot, isStatAllowedOnSlot } from "./slotRules";
import { isAspectItemSlot, type EquipSlotId } from "./slots";
import {
  OFFHAND_TYPES,
  OFFHAND_TYPE_BY_ID,
  type OffhandTypeId,
} from "./offhandTypes";
import {
  rollWeaponStats,
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

/** Бонус аспекта-аффикса (и aspectTag без базы-аспекта) только на rare+. */
function rarityAllowsAspectBonus(rarity: ItemRarity): boolean {
  return rarity === "rare" || rarity === "epic";
}

/** Выбор аспекта с весами изученных (без проверки редкости/слота). */
function pickAspect(
  learned: Aspect[] | undefined,
  force: Aspect | undefined,
  rng: () => number,
): Aspect {
  if (force) return force;
  const learnedSet = new Set(learned ?? []);
  return pickWeighted(ALL_ASPECTS, (s) => (learnedSet.has(s) ? 3 : 1), rng) ?? ALL_ASPECTS[0]!;
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
  return pickAspect(learned, force, rng);
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
  const stats = rollWeaponStats(def, itemLevel, rng);
  return {
    kind: def.kind,
    typeId: def.id,
    damageMin: stats.damageMin,
    damageMax: stats.damageMax,
    baseCd: stats.baseCd,
    reach: stats.reach,
    range: def.range,
    tierId: stats.tierId,
    grip: def.grip,
    twoHand: def.grip === "twoHand",
  };
}

function makeOffhandImplicit(rng: () => number): OffhandImplicit {
  const def = OFFHAND_TYPES[randInt(rng, 0, OFFHAND_TYPES.length - 1)]!;
  return { typeId: def.id };
}

/**
 * Ролл одной базы из пула.
 * Если база аспектная - aspectTag задаётся сразу (любая редкость).
 * Иначе aspectTag как раньше (rare+ на aspect-слотах).
 */
function rollBaseAndAspect(
  pool: ItemBaseDef[],
  slot: EquipSlotId,
  rarity: ItemRarity,
  itemLevel: number,
  learned: Aspect[] | undefined,
  force: Aspect | undefined,
  rng: () => number,
  /** Для оффхенда без семьи aspect - не роллить rare+ aspectTag. */
  allowAffixAspectTag: boolean,
): { base: RolledItemBase | undefined; aspectTag: Aspect | undefined } {
  const picked = pickWeighted(pool, (b) => b.weight ?? 10, rng);
  if (!picked) {
    return {
      base: undefined,
      aspectTag: allowAffixAspectTag
        ? rollAspectTag(slot, rarity, learned, force, rng)
        : undefined,
    };
  }

  if (picked.variantKey === "aspectDamage") {
    const aspect = pickAspect(learned, force, rng);
    const base = rollItemBase({ def: picked, itemLevel, rng, aspect });
    return { base, aspectTag: aspect };
  }

  const base = rollItemBase({ def: picked, itemLevel, rng });
  const aspectTag = allowAffixAspectTag
    ? rollAspectTag(slot, rarity, learned, force, rng)
    : undefined;
  return { base, aspectTag };
}

function weaponDisplayName(typeId: WeaponTypeId | undefined, kindLabelFallback: string): string {
  if (typeId && WEAPON_TYPE_BY_ID[typeId]) return WEAPON_TYPE_BY_ID[typeId].name;
  return kindLabelFallback;
}

function offhandDisplayName(typeId: OffhandTypeId | undefined): string {
  if (typeId && OFFHAND_TYPE_BY_ID[typeId]) return OFFHAND_TYPE_BY_ID[typeId].name;
  return "Левая рука";
}

function withAspectSuffix(base: string, aspect?: Aspect): string {
  return aspect ? `${base} (${ASPECT_LABEL[aspect]})` : base;
}

function defaultName(
  slot: EquipSlotId,
  _rarity: ItemRarity,
  aspect?: Aspect,
  weapon?: WeaponImplicit,
  offhand?: OffhandImplicit,
): string {
  if (weapon) {
    return withAspectSuffix(weaponDisplayName(weapon.typeId, "Оружие"), aspect);
  }
  if (offhand) {
    return withAspectSuffix(offhandDisplayName(offhand.typeId), aspect);
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
  return withAspectSuffix(slotNames[slot] ?? "Предмет", aspect);
}

/**
 * Отображаемое имя: "Арбалет (Земля)".
 * Старые сейвы с префиксом "Земля Арбалет" тоже нормализует.
 */
export function itemDisplayName(item: ItemDef): string {
  if (!item.aspectTag) return item.name;
  const label = ASPECT_LABEL[item.aspectTag];
  let core = item.name.trim();
  const prefix = `${label} `;
  const suffix = ` (${label})`;
  if (core.startsWith(prefix)) core = core.slice(prefix.length).trim();
  else if (core.endsWith(suffix)) core = core.slice(0, -suffix.length).trim();
  return `${core} (${label})`;
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
  // Уникальность только между аффиксами; база в usedStats не входит.
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
    const { base, aspectTag } = rollBaseAndAspect(
      basesForOffhand(offhand.typeId),
      slot,
      rarity,
      itemLevel,
      opts.learnedAspects,
      opts.forceAspect,
      rng,
      allowsAspect,
    );
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
      base,
      offhand,
    };
  }

  const { base, aspectTag } = rollBaseAndAspect(
    basesForSlot(slot),
    slot,
    rarity,
    itemLevel,
    opts.learnedAspects,
    opts.forceAspect,
    rng,
    isAspectItemSlot(slot),
  );
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
    base,
  };
}
