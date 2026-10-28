import { ASPECT_LABEL } from "../abilities/definitions";
import {
  aspectDamageStat,
  formatAffixBonus,
  isAspectDamageStat,
  STAT_LABEL,
  type StatId,
} from "../stats/statIds";
import type { Aspect } from "../types";
import { AFFIX_BY_ID } from "./affixCatalog";
import type { OffhandTypeId } from "./offhandTypes";
import type { EquipSlotId } from "./slots";
import {
  rollTierIndex,
  sampleAffixQuality,
  TIER_COUNT,
  TIER_IDS,
  type AffixTierId,
} from "./tiers";
import type { AffixTierRange, ItemBaseStatKey, RolledItemBase } from "./types";

/** Ключ варианта базы до ролла аспекта. */
export type ItemBaseVariantKey = StatId | "aspectDamage" | "potionCount";

export type ItemBasePoolKey =
  | { kind: "slot"; slot: EquipSlotId }
  | { kind: "offhand"; typeId: OffhandTypeId };

export interface ItemBaseDef {
  id: string;
  pool: ItemBasePoolKey;
  /** Стат, placeholder аспекта или stub пояса. */
  variantKey: ItemBaseVariantKey;
  label: string;
  /** Ровно 10 записей: F…A5. */
  tiers: AffixTierRange[];
  weight?: number;
}

function tiersFromAffix(affixId: string): AffixTierRange[] {
  const def = AFFIX_BY_ID[affixId];
  if (!def) throw new Error(`baseCatalog: missing affix ${affixId}`);
  return def.tiers.map((t) => ({ id: t.id, min: t.min, max: t.max }));
}

/** Бонус ячеек от пояса (к базовой 1): F…A5 → +1…+4, итог 2…5. */
function potionCapacityTiers(): AffixTierRange[] {
  const byTier = [1, 1, 2, 2, 3, 3, 4, 4, 4, 4];
  return TIER_IDS.map((id, i) => {
    const v = byTier[i] ?? 1;
    return { id, min: v, max: v };
  });
}

function base(
  id: string,
  pool: ItemBasePoolKey,
  variantKey: ItemBaseVariantKey,
  label: string,
  tiers: AffixTierRange[],
  weight = 10,
): ItemBaseDef {
  if (tiers.length !== TIER_COUNT) {
    throw new Error(`base ${id}: expected ${TIER_COUNT} tiers, got ${tiers.length}`);
  }
  return { id, pool, variantKey, label, tiers, weight };
}

function slotPool(slot: EquipSlotId): ItemBasePoolKey {
  return { kind: "slot", slot };
}

function offhandPool(typeId: OffhandTypeId): ItemBasePoolKey {
  return { kind: "offhand", typeId };
}

/**
 * Пулы баз по слотам и типам оффхенда.
 * На оружии базы нет в этом каталоге - урон + КД в WeaponImplicit.
 */
export const ITEM_BASE_CATALOG: readonly ItemBaseDef[] = [
  // Head
  base("head_phys_dr", slotPool("head"), "physDamageReduction", "снижения физ. урона", tiersFromAffix("phys_dr")),
  base("head_magic_res", slotPool("head"), "magicResist", "сопротивления магии", tiersFromAffix("magic_res")),
  base("head_crit_dmg", slotPool("head"), "critDamage", "урона крита", tiersFromAffix("crit_dmg")),

  // Chest
  base("chest_phys_dr", slotPool("chest"), "physDamageReduction", "снижения физ. урона", tiersFromAffix("phys_dr")),
  base("chest_magic_res", slotPool("chest"), "magicResist", "сопротивления магии", tiersFromAffix("magic_res")),
  base("chest_block", slotPool("chest"), "blockChance", "шанса блока", tiersFromAffix("block")),
  base("chest_parry", slotPool("chest"), "parryChance", "шанса парирования", tiersFromAffix("parry")),
  base("chest_evasion", slotPool("chest"), "evasion", "уклонения", tiersFromAffix("evasion")),
  base("chest_max_hp", slotPool("chest"), "maxHp", "здоровья", tiersFromAffix("max_hp")),

  // Shoulders
  base("shoulders_phys_dr", slotPool("shoulders"), "physDamageReduction", "снижения физ. урона", tiersFromAffix("phys_dr")),
  base("shoulders_magic_res", slotPool("shoulders"), "magicResist", "сопротивления магии", tiersFromAffix("magic_res")),

  // Hands
  base("hands_attack_speed", slotPool("hands"), "attackSpeed", "скорости атаки", tiersFromAffix("attack_speed")),
  base("hands_crit_chance", slotPool("hands"), "critChance", "шанса крита", tiersFromAffix("crit_chance")),
  base("hands_cast_speed", slotPool("hands"), "castSpeed", "скорости каста", tiersFromAffix("cast_speed")),

  // Waist
  base("waist_potion_count", slotPool("waist"), "potionCount", "доп. ячеек зелий", potionCapacityTiers(), 10),

  // Legs
  base("legs_phys_dr", slotPool("legs"), "physDamageReduction", "снижения физ. урона", tiersFromAffix("phys_dr")),
  base("legs_parry", slotPool("legs"), "parryChance", "шанса парирования", tiersFromAffix("parry")),

  // Feet
  base("feet_phys_dr", slotPool("feet"), "physDamageReduction", "снижения физ. урона", tiersFromAffix("phys_dr")),
  base("feet_evasion", slotPool("feet"), "evasion", "уклонения", tiersFromAffix("evasion")),

  // Necklace (neck)
  base("neck_hp_regen", slotPool("neck"), "hpRegen", "здоровья/сек", tiersFromAffix("hp_regen")),
  base("neck_mana_regen", slotPool("neck"), "manaRegen", "маны/сек", tiersFromAffix("mana_regen")),
  base("neck_max_hp", slotPool("neck"), "maxHp", "здоровья", tiersFromAffix("max_hp")),
  base("neck_max_mana", slotPool("neck"), "maxMana", "маны", tiersFromAffix("max_mana")),

  // Rings (оба слота - один пул)
  base("ring_magic_res", slotPool("ring1"), "magicResist", "сопротивления магии", tiersFromAffix("magic_res")),
  base("ring_max_mana", slotPool("ring1"), "maxMana", "маны", tiersFromAffix("max_mana")),
  base("ring_mana_cost", slotPool("ring1"), "manaCostReduction", "снижения стоимости маны", tiersFromAffix("mana_cost_red")),
  base("ring_weapon_atk", slotPool("ring1"), "weaponAttackBonus", "бонуса атаки оружия", tiersFromAffix("weapon_atk")),

  // Trinket
  // Тиры аспекта одинаковы у всех aspect_dmg_*; берём fire как шаблон.
  base("trinket_aspect", slotPool("trinket"), "aspectDamage", "урона аспекта", tiersFromAffix("aspect_dmg_fire"), 8),
  base("trinket_ability_dmg", slotPool("trinket"), "abilityDamage", "урона способностей", tiersFromAffix("ability_dmg")),
  base("trinket_cdr", slotPool("trinket"), "cooldownReduction", "скорости перезарядки", tiersFromAffix("cdr")),

  // Offhands
  base("shield_block", offhandPool("shield"), "blockChance", "шанса блока", tiersFromAffix("block")),
  base("quiver_attack_speed", offhandPool("quiver"), "attackSpeed", "скорости атаки", tiersFromAffix("attack_speed")),
  base("tome_max_mana", offhandPool("tome"), "maxMana", "маны", tiersFromAffix("max_mana")),
  base("tome_mana_regen", offhandPool("tome"), "manaRegen", "маны/сек", tiersFromAffix("mana_regen")),
  base("tome_aspect", offhandPool("tome"), "aspectDamage", "урона аспекта", tiersFromAffix("aspect_dmg_fire"), 8),
  base("relic_cdr", offhandPool("relic"), "cooldownReduction", "скорости перезарядки", tiersFromAffix("cdr")),
  base("relic_mana_cost", offhandPool("relic"), "manaCostReduction", "снижения стоимости маны", tiersFromAffix("mana_cost_red")),
  base("orb_ability_dmg", offhandPool("orb"), "abilityDamage", "урона способностей", tiersFromAffix("ability_dmg")),
  base("orb_cast_speed", offhandPool("orb"), "castSpeed", "скорости каста", tiersFromAffix("cast_speed")),
];

export const ITEM_BASE_BY_ID: Record<string, ItemBaseDef> = Object.fromEntries(
  ITEM_BASE_CATALOG.map((b) => [b.id, b]),
);

function poolMatches(def: ItemBaseDef, key: ItemBasePoolKey): boolean {
  if (def.pool.kind !== key.kind) return false;
  if (key.kind === "slot") {
    if (def.pool.kind !== "slot") return false;
    // ring1 каталог обслуживает ring1 и ring2
    if (key.slot === "ring2") return def.pool.slot === "ring1";
    return def.pool.slot === key.slot;
  }
  return def.pool.kind === "offhand" && def.pool.typeId === key.typeId;
}

export function basesForSlot(slot: EquipSlotId): ItemBaseDef[] {
  if (slot === "mainhand" || slot === "offhand") return [];
  return ITEM_BASE_CATALOG.filter((b) => poolMatches(b, { kind: "slot", slot }));
}

export function basesForOffhand(typeId: OffhandTypeId): ItemBaseDef[] {
  return ITEM_BASE_CATALOG.filter((b) => poolMatches(b, { kind: "offhand", typeId }));
}

export function isPotionBaseStat(statId: ItemBaseStatKey): boolean {
  return statId === "potionCount";
}

export function isCombatBaseStat(statId: ItemBaseStatKey): statId is StatId {
  return statId !== "potionCount";
}

function tierRangeAt(def: ItemBaseDef, tierIndex: number): AffixTierRange {
  return def.tiers[Math.max(0, Math.min(TIER_COUNT - 1, tierIndex))]!;
}

export interface RollItemBaseOptions {
  def: ItemBaseDef;
  itemLevel: number;
  rng: () => number;
  /** Обязателен, если variantKey === "aspectDamage". */
  aspect?: Aspect;
}

/** Тир + значение. Для aspectDamage нужен выбранный aspect. */
export function rollItemBase(opts: RollItemBaseOptions): RolledItemBase {
  const { def, itemLevel, rng, aspect } = opts;
  const tierIndex = rollTierIndex(itemLevel, rng);
  const t = tierRangeAt(def, tierIndex);
  const value =
    t.max <= t.min ? t.min : Math.round(t.min + sampleAffixQuality(rng) * (t.max - t.min));

  if (def.variantKey === "potionCount") {
    return {
      baseId: def.id,
      statId: "potionCount",
      value,
      label: def.label,
      tierId: t.id as AffixTierId,
      tierMin: t.min,
      tierMax: t.max,
    };
  }

  if (def.variantKey === "aspectDamage") {
    if (!aspect) throw new Error(`rollItemBase ${def.id}: aspect required`);
    return {
      baseId: def.id,
      statId: aspectDamageStat(aspect),
      value,
      label: `урона аспекта (${ASPECT_LABEL[aspect]})`,
      tierId: t.id as AffixTierId,
      tierMin: t.min,
      tierMax: t.max,
    };
  }

  return {
    baseId: def.id,
    statId: def.variantKey,
    value,
    label: def.label,
    tierId: t.id as AffixTierId,
    tierMin: t.min,
    tierMax: t.max,
  };
}

/** Основной бонус базы и опциональный тир "[48-66] D". */
export function rolledItemBaseParts(b: RolledItemBase): { main: string; tierMeta?: string } {
  const main =
    b.statId === "potionCount"
      ? `+${b.value} ${b.label}`
      : formatAffixBonus(b.statId, b.value, b.label);
  if (b.tierId !== undefined && b.tierMin !== undefined && b.tierMax !== undefined) {
    return { main, tierMeta: `[${b.tierMin}-${b.tierMax}] ${b.tierId}` };
  }
  return { main };
}

/** Текст базы: "+52 здоровья [48-66] D" / stub зелий. */
export function formatRolledItemBase(b: RolledItemBase): string {
  const { main, tierMeta } = rolledItemBaseParts(b);
  return tierMeta ? `${main} ${tierMeta}` : main;
}

export function baseVariantLabel(def: ItemBaseDef): string {
  if (def.variantKey === "aspectDamage") return "Бонус урона аспекта";
  if (def.variantKey === "potionCount") return "Доп. ячеек зелий";
  if (isAspectDamageStat(def.variantKey)) return "Бонус урона аспекта";
  return STAT_LABEL[def.variantKey as keyof typeof STAT_LABEL] ?? def.label;
}
