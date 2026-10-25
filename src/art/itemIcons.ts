import type { EquipSlotId } from "../items/slots";
import type { ItemDef, ItemRarity } from "../items/types";
import { WEAPON_TYPE_BY_ID } from "../items/weaponTypes";
import type { WeaponKind } from "../types";

/**
 * Иконки предметов: `assets/art/items/{slotOrWeapon}_{rarity}_{n}.png`
 * Пример: boots_magic_01.png -> слот feet, редкость magic.
 * Оружие: sword_common_01.png, 2H_axe_uncommon_02.png -> слот mainhand.
 * Двуручные (мечи/булавы/топоры): префикс `2H_*`. Лук и посох без `2H` (всегда двуручные).
 *
 * `starter_*.png` - фиксированные иконки создания персонажа.
 * Лежат в той же папке, но не попадают в пул `pickItemIconUrl`.
 */
const itemIconModules = import.meta.glob<{ default: string }>(
  "../../assets/art/items/**/*.{png,webp}",
  { eager: true },
);

/** Алиасы в имени файла -> слот экипировки. `ring` подходит и ring1, и ring2. */
const SLOT_FILE_ALIASES: Record<string, EquipSlotId | "ring"> = {
  head: "head",
  helmet: "head",
  chest: "chest",
  body: "chest",
  armor: "chest",
  neck: "neck",
  amulet: "neck",
  necklace: "neck",
  shoulders: "shoulders",
  pauldrons: "shoulders",
  hands: "hands",
  gloves: "hands",
  gauntlets: "hands",
  ring: "ring",
  ring1: "ring1",
  ring2: "ring2",
  waist: "waist",
  belt: "waist",
  legs: "legs",
  greaves: "legs",
  pants: "legs",
  feet: "feet",
  boots: "feet",
  trinket: "trinket",
  accessory: "trinket",
  mainhand: "mainhand",
  weapon: "mainhand",
  offhand: "offhand",
  shield: "offhand",
};

/**
 * Типы оружия в имени файла -> слот mainhand.
 * Префикс может быть составным (`2H_axe`). Любой `2H_*` тоже оружие
 * (двуручные мечи/булавы/топоры; лук и посох пишутся без `2H`).
 */
const WEAPON_ART_ALIASES: Record<string, true> = {
  sword: true,
  dagger: true,
  mace: true,
  axe: true,
  "2h_axe": true,
  "2h_sword": true,
  "2h_mace": true,
  bow: true,
  staff: true,
  wand: true,
  spear: true,
  lance: true,
};

/**
 * Fallback по боевому WeaponKind только если нет typeId/weaponArt.
 * Без подмешивания чужих семейств (кинжал ≠ жезл).
 */
const WEAPON_KIND_PREFERRED_ART: Record<WeaponKind, readonly string[]> = {
  melee: ["sword"],
  spear: ["spear", "lance"],
  bow: ["bow"],
  staff: ["wand"],
};

/**
 * Алиасы редкости в имени файла -> ItemRarity.
 * magic/blue = магический, rare/yellow = редкий.
 */
const RARITY_FILE_ALIASES: Record<string, ItemRarity> = {
  common: "common",
  white: "common",
  uncommon: "uncommon",
  green: "uncommon",
  magic: "magic",
  magical: "magic",
  blue: "magic",
  rare: "rare",
  yellow: "rare",
  epic: "epic",
  purple: "epic",
};

interface ItemIconEntry {
  id: string;
  url: string;
  slotKey: EquipSlotId | "ring";
  rarity: ItemRarity;
  /** Stem типа оружия из имени файла (`sword`, `2h_axe`), если это оружие. */
  weaponArt?: string;
}

function resolvePrefix(prefix: string): { slotKey: EquipSlotId | "ring"; weaponArt?: string } | null {
  const key = prefix.toLowerCase();
  const slot = SLOT_FILE_ALIASES[key];
  if (slot) return { slotKey: slot };
  if (WEAPON_ART_ALIASES[key]) return { slotKey: "mainhand", weaponArt: key };
  // Будущие двуручные: 2H_sword / 2H_mace / ... (кроме лука и посоха).
  if (/^2h_[a-z][a-z0-9]*$/.test(key)) return { slotKey: "mainhand", weaponArt: key };
  return null;
}

function parseIconPath(modulePath: string, url: string): ItemIconEntry | null {
  const file = modulePath.split(/[/\\]/).pop() ?? "";
  const base = file.replace(/\.(png|webp)$/i, "");
  if (!base || base === "no_image") return null;
  // starter_* - фиксированные иконки создания персонажа, не в пуле генерации.
  if (base.toLowerCase().startsWith("starter_")) return null;

  const parts = base.toLowerCase().split("_");
  if (parts.length < 2) return null;

  // Редкость может быть не вторым токеном: 2H_axe_common_01.
  let rarityIdx = -1;
  for (let i = 1; i < parts.length; i++) {
    if (RARITY_FILE_ALIASES[parts[i]!]) {
      rarityIdx = i;
      break;
    }
  }
  if (rarityIdx < 1) return null;

  const prefix = parts.slice(0, rarityIdx).join("_");
  const rarity = RARITY_FILE_ALIASES[parts[rarityIdx]!];
  if (!rarity) return null;

  const resolved = resolvePrefix(prefix);
  if (!resolved) return null;

  return {
    id: base,
    url,
    slotKey: resolved.slotKey,
    rarity,
    weaponArt: resolved.weaponArt,
  };
}

const CATALOG: ItemIconEntry[] = [];
/** `starter_dagger` → URL. Не участвует в pickItemIconUrl. */
const STARTER_ICON_BY_ID = new Map<string, string>();

for (const [path, mod] of Object.entries(itemIconModules)) {
  const file = path.split(/[/\\]/).pop() ?? "";
  const base = file.replace(/\.(png|webp)$/i, "");
  if (base && base.toLowerCase().startsWith("starter_")) {
    // Ключ как в файле + lower (2H vs 2h) - lookup без сюрпризов регистра.
    STARTER_ICON_BY_ID.set(base, mod.default);
    STARTER_ICON_BY_ID.set(base.toLowerCase(), mod.default);
    continue;
  }
  const entry = parseIconPath(path, mod.default);
  if (entry) CATALOG.push(entry);
}

function slotMatches(entrySlot: EquipSlotId | "ring", slot: EquipSlotId): boolean {
  if (entrySlot === slot) return true;
  if (entrySlot === "ring" && (slot === "ring1" || slot === "ring2")) return true;
  return false;
}

function entriesFor(slot: EquipSlotId, rarity: ItemRarity): ItemIconEntry[] {
  return CATALOG.filter((e) => e.rarity === rarity && slotMatches(e.slotKey, slot));
}

/** URL иконок для слота и редкости (пустой массив, если арта ещё нет). */
export function listItemIconUrls(slot: EquipSlotId, rarity: ItemRarity): string[] {
  return entriesFor(slot, rarity).map((e) => e.url);
}

export interface PickItemIconOptions {
  /** Точный префикс арта (`wand`, `2h_axe`). Чужие типы не подмешиваются. */
  weaponArt?: string;
  /** Только если нет weaponArt - узкий fallback по боевому kind. */
  weaponKind?: WeaponKind;
}

/** Случайная иконка под слот + редкость (+ опционально тип оружия). */
export function pickItemIconUrl(
  slot: EquipSlotId,
  rarity: ItemRarity,
  rng: () => number = Math.random,
  opts?: PickItemIconOptions,
): string | undefined {
  // Арт оружия лежит как mainhand (sword_*, bow_* ...); offhand без своих файлов берёт тот же пул.
  const wantsWeaponArt = Boolean(opts?.weaponArt || opts?.weaponKind);
  let pool = entriesFor(slot, rarity);
  if (!pool.length && slot === "offhand" && wantsWeaponArt) {
    pool = entriesFor("mainhand", rarity);
  }
  if (!pool.length) return undefined;

  const artKey = opts?.weaponArt?.toLowerCase();
  if (artKey) {
    const matched = pool.filter((e) => e.weaponArt === artKey);
    // Нет арта этой редкости/типа - пусто, а не чужой кинжал на жезле.
    if (!matched.length) return undefined;
    return matched[Math.floor(rng() * matched.length)]?.url;
  }

  if (opts?.weaponKind) {
    const preferred = new Set(WEAPON_KIND_PREFERRED_ART[opts.weaponKind] ?? []);
    if (!preferred.size) return undefined;
    const matched = pool.filter((e) => e.weaponArt && preferred.has(e.weaponArt));
    if (!matched.length) return undefined;
    return matched[Math.floor(rng() * matched.length)]?.url;
  }

  return pool[Math.floor(rng() * pool.length)]?.url;
}

/** Дозаполнить отсутствующую иконку у уже сгенерированного предмета (сейвы / рынок). */
export function ensureItemIcon(item: ItemDef, rng: () => number = Math.random): void {
  if (item.icon) return;
  const typeId = item.weapon?.typeId;
  item.icon = pickItemIconUrl(item.slot, item.rarity, rng, {
    weaponArt: typeId ? WEAPON_TYPE_BY_ID[typeId]?.art : undefined,
    weaponKind: item.weapon?.kind,
  });
}

export function getItemIconUrlById(id: string): string | undefined {
  return (
    STARTER_ICON_BY_ID.get(id) ??
    STARTER_ICON_BY_ID.get(id.toLowerCase()) ??
    CATALOG.find((e) => e.id === id)?.url
  );
}

/** URL фиксированной стартовой иконки (`starter_dagger`, `starter_2H_axe` и т.д.). */
export function getStarterItemIconUrl(stem: string): string | undefined {
  return STARTER_ICON_BY_ID.get(stem) ?? STARTER_ICON_BY_ID.get(stem.toLowerCase());
}
