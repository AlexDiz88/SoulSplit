import type { EquipSlotId } from "../items/slots";
import type { ItemRarity } from "../items/types";

/**
 * Иконки предметов: `assets/art/items/{slotAlias}_{rarityAlias}_{n}.png`
 * Пример: boots_magic_01.png -> слот feet, редкость magic.
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
}

function parseIconPath(modulePath: string, url: string): ItemIconEntry | null {
  const file = modulePath.split(/[/\\]/).pop() ?? "";
  const base = file.replace(/\.(png|webp)$/i, "");
  if (!base || base === "no_image") return null;

  const parts = base.split("_");
  if (parts.length < 2) return null;

  const slotKey = SLOT_FILE_ALIASES[parts[0]!.toLowerCase()];
  const rarity = RARITY_FILE_ALIASES[parts[1]!.toLowerCase()];
  if (!slotKey || !rarity) return null;

  return { id: base, url, slotKey, rarity };
}

const CATALOG: ItemIconEntry[] = [];
for (const [path, mod] of Object.entries(itemIconModules)) {
  const entry = parseIconPath(path, mod.default);
  if (entry) CATALOG.push(entry);
}

function slotMatches(entrySlot: EquipSlotId | "ring", slot: EquipSlotId): boolean {
  if (entrySlot === slot) return true;
  if (entrySlot === "ring" && (slot === "ring1" || slot === "ring2")) return true;
  return false;
}

/** URL иконок для слота и редкости (пустой массив, если арта ещё нет). */
export function listItemIconUrls(slot: EquipSlotId, rarity: ItemRarity): string[] {
  return CATALOG.filter((e) => e.rarity === rarity && slotMatches(e.slotKey, slot)).map((e) => e.url);
}

/** Случайная иконка под слот + редкость. */
export function pickItemIconUrl(
  slot: EquipSlotId,
  rarity: ItemRarity,
  rng: () => number = Math.random,
): string | undefined {
  const urls = listItemIconUrls(slot, rarity);
  if (!urls.length) return undefined;
  return urls[Math.floor(rng() * urls.length)];
}

export function getItemIconUrlById(id: string): string | undefined {
  return CATALOG.find((e) => e.id === id)?.url;
}
