import { SCHOOL_LABEL } from "../abilities/definitions";
import { WEAPON_LABEL, WEAPON_REACH } from "../combat/weapons";
import type { School, WeaponKind } from "../types";
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
import { isSchoolItemSlot, isWeaponSlot, type EquipSlotId } from "./slots";

const WEAPON_KINDS: WeaponKind[] = ["melee", "spear", "bow", "staff"];
const ALL_SCHOOLS: School[] = ["ice", "fire", "iron", "stealth", "light", "air"];

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

function pickWeighted<T>(items: T[], weightOf: (t: T) => number, rng: () => number): T | null {
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

function poolForSlot(slot: EquipSlotId, schoolTag: School | undefined): AffixDef[] {
  const families = new Set(familiesForSlot(slot));
  return AFFIX_CATALOG.filter((a) => {
    if (!families.has(a.family)) return false;
    if (!isStatAllowedOnSlot(slot, a.statId)) return false;
    if (a.family === "school") {
      if (!schoolTag) return false;
      return a.statId === `schoolDamage:${schoolTag}`;
    }
    return true;
  });
}

function pickAffixSlot(def: AffixDef, rng: () => number): AffixSlot {
  const allowed = def.allowedAffixSlots;
  if (allowed.length === 1) return allowed[0]!;
  return rng() < 0.5 ? "prefix" : "suffix";
}

function rollSchoolTag(
  slot: EquipSlotId,
  learned: School[] | undefined,
  force: School | undefined,
  rng: () => number,
): School | undefined {
  if (!isSchoolItemSlot(slot)) return undefined;
  if (force) return force;
  const learnedSet = new Set(learned ?? []);
  const pick = pickWeighted(ALL_SCHOOLS, (s) => (learnedSet.has(s) ? 3 : 1), rng);
  return pick ?? undefined;
}

function makeWeaponImplicit(itemLevel: number, rng: () => number): WeaponImplicit {
  const kind = WEAPON_KINDS[randInt(rng, 0, WEAPON_KINDS.length - 1)]!;
  const reach = WEAPON_REACH[kind];
  const base = 8 + Math.floor(itemLevel * 1.2);
  const spread = 2 + Math.floor(itemLevel / 8);
  const damageMin = base;
  const damageMax = base + spread;
  const baseCd = kind === "bow" || kind === "staff" ? 1.6 : kind === "spear" ? 1.4 : 1.2;
  return {
    kind,
    damageMin,
    damageMax,
    baseCd,
    reach,
    range: kind === "bow" || kind === "staff" ? "ranged" : "melee",
  };
}

function defaultName(slot: EquipSlotId, _rarity: ItemRarity, school?: School, weapon?: WeaponImplicit): string {
  const schoolPart = school ? SCHOOL_LABEL[school] + " " : "";
  if (weapon) return `${schoolPart}${WEAPON_LABEL[weapon.kind]}`.trim();
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
  return `${schoolPart}${slotNames[slot] ?? "Предмет"}`.trim();
}

/**
 * Генерация предмета white..purple.
 * Легендарки сюда не входят.
 */
export function generateItem(opts: GenerateItemOptions): ItemDef {
  const rng = opts.rng ?? Math.random;
  const { slot, rarity, itemLevel } = opts;
  const schoolTag = rollSchoolTag(slot, opts.learnedSchools, opts.forceSchool, rng);
  const weapon = isWeaponSlot(slot) ? makeWeaponImplicit(itemLevel, rng) : undefined;

  const count = affixCountForRarity(rarity, rng);
  const pool = poolForSlot(slot, schoolTag);
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

  // На школьном предмете blue+ гарантируем хотя бы один school-ролл, если пул позволяет.
  if (schoolTag && rarity !== "common" && rarity !== "uncommon") {
    const hasSchool = affixes.some((a) => a.statId === `schoolDamage:${schoolTag}`);
    if (!hasSchool) {
      const schoolAffix = pool.find((a) => a.statId === `schoolDamage:${schoolTag}`);
      if (schoolAffix) {
        if (affixes.length >= count && affixes.length > 0) affixes.pop();
        affixes.push({
          affixId: schoolAffix.id,
          statId: schoolAffix.statId,
          value: rollAffixValue(schoolAffix, itemLevel, rng),
          affixSlot: pickAffixSlot(schoolAffix, rng),
          label: schoolAffix.label,
        });
      }
    }
  }

  return {
    id: `item_${slot}_${rarity}_${Math.floor(rng() * 1e9)}`,
    name: opts.name ?? defaultName(slot, rarity, schoolTag, weapon),
    slot,
    rarity,
    itemLevel,
    affixes,
    schoolTag,
    weapon,
  };
}

/** Стартовое оружие для песочницы (без аффиксов). */
export function createStarterWeapon(slot: EquipSlotId = "mainhand"): ItemDef {
  return {
    id: "starter_weapon",
    name: "Тренировочный клинок",
    slot,
    rarity: "common",
    itemLevel: 1,
    affixes: [],
    weapon: {
      kind: "melee",
      damageMin: 22,
      damageMax: 26,
      baseCd: 1.2,
      reach: 1,
      range: "melee",
    },
  };
}
