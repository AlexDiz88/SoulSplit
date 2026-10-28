import { createBaseHeroSheet, emptySheet, addToSheet, applyStatCaps, type HeroStatSheet } from "../stats/sheet";
import type { StatId } from "../stats/statIds";
import { isCombatBaseStat } from "./baseCatalog";
import { GRIP_LABEL, type ItemGrip } from "./grip";
import { OFFHAND_TYPE_BY_ID } from "./offhandTypes";
import { isPotionItem } from "./potions";
import type { ItemDef, WeaponImplicit } from "./types";
import type { EquipSlotId } from "./slots";
import { WEAPON_TYPE_BY_ID } from "./weaponTypes";

export type EquipmentMap = Partial<Record<EquipSlotId, ItemDef>>;

export function affixesToDelta(items: ItemDef[]): Partial<Record<StatId, number>> {
  const delta: Partial<Record<StatId, number>> = {};
  for (const item of items) {
    for (const a of item.affixes) {
      delta[a.statId] = (delta[a.statId] ?? 0) + a.value;
    }
  }
  return delta;
}

/** Сумма баз предметов (stub зелий и пр. не-статы пропускаются). */
export function basesToDelta(items: ItemDef[]): Partial<Record<StatId, number>> {
  const delta: Partial<Record<StatId, number>> = {};
  for (const item of items) {
    const b = item.base;
    if (!b || !isCombatBaseStat(b.statId)) continue;
    delta[b.statId] = (delta[b.statId] ?? 0) + b.value;
  }
  return delta;
}

/** База героя + базы предметов + аффиксы экипировки. */
export function computeHeroSheet(equipment: EquipmentMap, base = createBaseHeroSheet()): HeroStatSheet {
  const items = Object.values(equipment).filter((x): x is ItemDef => !!x);
  const sheet = emptySheet();
  addToSheet(sheet, base);
  addToSheet(sheet, basesToDelta(items));
  addToSheet(sheet, affixesToDelta(items));
  return applyStatCaps(sheet);
}

/** Grip оружия с учётом typeId и legacy twoHand / bow. */
export function resolveWeaponGrip(weapon: WeaponImplicit): ItemGrip {
  // Лук/арбалет раньше помечали twoHand; канон - mainhand (под колчан).
  if (
    weapon.kind === "bow" ||
    weapon.typeId === "bow" ||
    weapon.typeId === "crossbow"
  ) {
    return "mainhand";
  }
  if (weapon.grip) return weapon.grip;
  if (weapon.typeId && WEAPON_TYPE_BY_ID[weapon.typeId]) {
    return WEAPON_TYPE_BY_ID[weapon.typeId].grip;
  }
  if (weapon.twoHand) return "twoHand";
  return "either";
}

export function getItemGrip(item: ItemDef): ItemGrip | null {
  if (item.weapon) return resolveWeaponGrip(item.weapon);
  if (item.offhand) {
    const def = OFFHAND_TYPE_BY_ID[item.offhand.typeId];
    return def?.grip ?? "offhand";
  }
  return null;
}

export function gripLabel(item: ItemDef): string | null {
  const grip = getItemGrip(item);
  return grip ? GRIP_LABEL[grip] : null;
}

export function isTwoHandWeapon(item: ItemDef): boolean {
  return getItemGrip(item) === "twoHand";
}

/** Лук / арбалет: основная рука, в левой только колчан. */
export function isBowFamilyWeapon(item: ItemDef): boolean {
  const w = item.weapon;
  if (!w) return false;
  return w.kind === "bow" || w.typeId === "bow" || w.typeId === "crossbow";
}

export function isQuiverItem(item: ItemDef): boolean {
  return item.offhand?.typeId === "quiver";
}

/**
 * Совместим ли оффхенд с оружием в основной руке.
 * 2H - ничего; лук/арбалет - только колчан; иначе всё ок.
 */
export function isOffhandCompatibleWithMain(
  main: ItemDef | null | undefined,
  offhand: ItemDef,
): boolean {
  if (!main?.weapon) return true;
  if (isTwoHandWeapon(main)) return false;
  if (isBowFamilyWeapon(main)) return isQuiverItem(offhand);
  return true;
}

/** Тост при отказе надеть предмет (лук/арбалет → только колчан). */
export function equipBlockedToast(
  item: ItemDef,
  slot: EquipSlotId | null | undefined,
  equipment: EquipmentMap | undefined,
  fallback: string,
): string {
  const main = equipment?.mainhand;
  if (!main || !isBowFamilyWeapon(main) || isQuiverItem(item)) return fallback;
  const wantsOffhand =
    slot === "offhand" ||
    (slot == null && (Boolean(item.offhand) || getItemGrip(item) === "offhand"));
  if (!wantsOffhand) return fallback;
  return "С луком или арбалетом в левой руке только колчан";
}

/** @deprecated alias для isTwoHandWeapon (тултипы / старые вызовы). */
export function isTwoHandPlaceholder(item: ItemDef): boolean {
  return isTwoHandWeapon(item);
}

/** Основное оружие для reach/UI: сначала mainhand, иначе offhand. */
export function equippedWeapon(equipment: EquipmentMap): ItemDef | null {
  const main = equipment.mainhand;
  if (main?.weapon) return main;
  const off = equipment.offhand;
  if (off?.weapon) return off;
  return null;
}

export function findWeaponImplicit(equipment: EquipmentMap) {
  return equippedWeapon(equipment)?.weapon ?? null;
}

export function equippedWeapons(equipment: EquipmentMap): {
  mainhand: WeaponImplicit | null;
  offhand: WeaponImplicit | null;
} {
  return {
    mainhand: equipment.mainhand?.weapon ?? null,
    offhand: equipment.offhand?.weapon ?? null,
  };
}

/**
 * Нормализация grip/slot после загрузки сейва или генерации.
 * Не выкидывает оружие из offhand (dual wield разрешён).
 */
export function normalizeWeaponItemSlot(item: ItemDef): void {
  if (item.offhand) {
    item.slot = "offhand";
    delete item.weapon;
    return;
  }
  if (!item.weapon) return;
  repairWeaponIdentity(item);
  const grip = resolveWeaponGrip(item.weapon);
  item.weapon.grip = grip;
  item.weapon.twoHand = grip === "twoHand";
  if (grip === "offhand") {
    item.slot = "offhand";
  } else if (grip === "either") {
    if (item.slot !== "mainhand" && item.slot !== "offhand") item.slot = "mainhand";
  } else {
    item.slot = "mainhand";
  }
}

/**
 * Старый Battle.setWeapon затирал имя грубым лейблом kind ("Меч" для любого melee)
 * и КД стартеров до 1.2. Восстанавливаем по typeId.
 */
function repairWeaponIdentity(item: ItemDef): void {
  const w = item.weapon;
  if (!w?.typeId) return;
  const type = WEAPON_TYPE_BY_ID[w.typeId];
  if (!type) return;

  const coarseKindNames = new Set(["Меч", "Копьё", "Лук", "Жезл"]);
  if (coarseKindNames.has(item.name) && item.name !== type.name) {
    item.name = type.name;
  }

  const starterId = item.id.toLowerCase();
  if (starterId.startsWith("starter_")) {
    item.name = type.name;
    w.baseCd = type.baseCd;
    w.damageMin = type.damageMin;
    w.damageMax = type.damageMax;
    w.reach = type.reach;
    w.range = type.range;
    w.kind = type.kind;
  }
}

function gripAllowsSlot(grip: ItemGrip, slot: EquipSlotId): boolean {
  if (slot === "mainhand") return grip === "mainhand" || grip === "either" || grip === "twoHand";
  if (slot === "offhand") return grip === "offhand" || grip === "either";
  return false;
}

/**
 * Можно ли надеть предмет в слот.
 * Для рук смотрит grip; `equipment` нужен чтобы блокировать offhand при 2H
 * и при луке/арбалете (тогда только колчан).
 */
export function canEquipInSlot(
  item: ItemDef,
  slot: EquipSlotId,
  equipment?: EquipmentMap,
): boolean {
  if (isPotionItem(item)) return false;
  if (item.slot === "ring1" || item.slot === "ring2") {
    if (slot !== "ring1" && slot !== "ring2") return false;
  } else {
    const grip = getItemGrip(item);
    if (grip) {
      if (!gripAllowsSlot(grip, slot)) return false;
      if (slot === "offhand" && equipment) {
        if (!isOffhandCompatibleWithMain(equipment.mainhand, item)) return false;
      }
      if (slot === "mainhand" || slot === "offhand") {
        if (item.weapon) return true;
        if (item.offhand) return slot === "offhand";
        return false;
      }
      return false;
    }
    if (item.slot !== slot) return false;
  }
  return true;
}
