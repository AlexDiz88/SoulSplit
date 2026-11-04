import type { AbilityId, Aspect } from "../types";
import { ALL_ASPECTS, ASPECT_HEX, ASPECT_LABEL } from "./aspects";
import {
  ABILITIES,
  abilityDefForGrimoireId,
} from "./definitions";
import {
  ALL_ABILITY_DEFS,
  abilityCatalogKebabId,
  approvedCombatAbilityIdsForAspect,
  defsInAspect,
  getAbilityCatalogDef,
  type AbilityCatalogDef,
  type AbilityZoneDef,
} from "./abilityDefs";

export type { AbilityZoneDef as AbilityZone };

export interface AbilityCard {
  id: string;
  name: string;
  aspect: string;
  aspectId: string;
  status: string;
  icon: string;
  description: string;
  cooldown: string;
  mana: string;
  application: string;
  zoneLabel: string;
  effect: string;
  numbers: string[];
  extra: string;
  zone: AbilityZoneDef | null;
}

export interface GrimoireAspect {
  id: string;
  name: string;
  color: string;
}

/** Канон генератора + кластер врагов. Цвета для гримуара. */
export const GRIMOIRE_ASPECTS: GrimoireAspect[] = [
  ...ALL_ASPECTS.map((id) => ({
    id,
    name: ASPECT_LABEL[id],
    color: ASPECT_HEX[id],
  })),
  { id: "enemies", name: "Враги", color: "#c45a4a" },
];

const iconModules = import.meta.glob("../../assets/art/skills/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ICONS: Record<string, string> = {};
for (const [path, url] of Object.entries(iconModules)) {
  const file = path.replaceAll("\\", "/").split("/").pop() ?? "";
  ICONS[file] = url;
  ICONS[file.replace(/\.png$/i, "")] = url;
}

const FALLBACK_ICON = ICONS["no_image.png"] ?? "";

function aspectLabel(aspectId: string): string {
  if (aspectId === "enemies") return "враги";
  return ASPECT_LABEL[aspectId as Aspect] ?? aspectId;
}

function formatCooldown(def: AbilityCatalogDef): string {
  if (def.cooldown === null) return "нет";
  const n = def.cooldown;
  const s = Number.isInteger(n) ? String(n) : String(n);
  return `${s} с`;
}

function formatMana(def: AbilityCatalogDef): string {
  if (def.manaCost === null) return "нет";
  return String(def.manaCost);
}

export function catalogDefToCard(def: AbilityCatalogDef): AbilityCard {
  return {
    id: abilityCatalogKebabId(def.id),
    name: def.name,
    aspect: aspectLabel(def.aspectId),
    aspectId: def.aspectId,
    status: def.status,
    icon: def.icon,
    description: def.description,
    cooldown: formatCooldown(def),
    mana: formatMana(def),
    application: def.application,
    zoneLabel: def.zoneLabel,
    effect: def.effect,
    numbers: [...def.numbers],
    extra: def.extra ?? "",
    zone: def.zone ?? null,
  };
}

let cached: AbilityCard[] | null = null;

export function loadAbilityCards(): AbilityCard[] {
  if (cached) return cached;
  cached = ALL_ABILITY_DEFS.map(catalogDefToCard);
  return cached;
}

export function cardsInAspect(aspectId: string): AbilityCard[] {
  return defsInAspect(aspectId).map(catalogDefToCard);
}

/** Карточка гримуара по id из бестиария / дизайна (`dark-arrow`, `dark_arrow`, либо имя). */
export function findAbilityCard(ref: string): AbilityCard | undefined {
  const trimmed = ref.trim();
  if (!trimmed || trimmed === "-" || trimmed === "нет") return undefined;
  const def = getAbilityCatalogDef(trimmed);
  if (def) return catalogDefToCard(def);
  const lower = trimmed.toLowerCase();
  const byName = ALL_ABILITY_DEFS.find((d) => d.name.toLowerCase() === lower);
  return byName ? catalogDefToCard(byName) : undefined;
}

/** URL иконки по ссылке из карточки врага; без арта - `no_image`. */
export function abilityIconUrlForRef(ref: string): string {
  const card = findAbilityCard(ref);
  if (card) return abilityIconUrl(card);
  const trimmed = ref.trim();
  const kebab = trimmed.replace(/_/g, "-");
  const snake = trimmed.replace(/-/g, "_");
  return ICONS[snake] ?? ICONS[kebab] ?? ICONS[`${snake}.png`] ?? FALLBACK_ICON;
}

/** Боевой AbilityId, если способность уже в коде боя. */
export function combatAbilityIdForRef(ref: string): AbilityId | undefined {
  const trimmed = ref.trim();
  if (!trimmed || trimmed === "-" || trimmed === "нет") return undefined;
  const kebab = trimmed.replace(/_/g, "-");
  const snake = trimmed.replace(/-/g, "_");
  return abilityDefForGrimoireId(kebab)?.id ?? (ABILITIES[snake as AbilityId] ? (snake as AbilityId) : undefined);
}

/** Пассив: `targetMode: "passive"` в бою или тип применения "пассив" в карточке. */
export function isPassiveAbilityRef(ref: string): boolean {
  const combatId = combatAbilityIdForRef(ref);
  if (combatId && ABILITIES[combatId]?.targetMode === "passive") return true;
  const card = findAbilityCard(ref);
  if (!card) return false;
  return /пассив/i.test(card.application);
}

/** Русское имя по id из каталога или боевого кода (`order` → "Приказ"). */
export function abilityDisplayName(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed || trimmed === "-" || trimmed === "нет") return trimmed;
  const fromCatalog = findAbilityCard(trimmed);
  if (fromCatalog?.name) return fromCatalog.name;
  const fromCombat = combatAbilityIdForRef(trimmed);
  if (fromCombat) return ABILITIES[fromCombat].name;
  return trimmed;
}

/** Список id через запятую → русские имена для бестиария. */
export function resolveAbilityList(raw: string): string {
  if (!raw || raw === "-" || raw === "нет") return raw || "-";
  return raw
    .split(",")
    .map((part) => abilityDisplayName(part.trim()))
    .filter(Boolean)
    .join(", ");
}

/**
 * Способности аспекта для создания персонажа:
 * только `одобрено` и уже есть боевой блок.
 */
export function approvedAbilitiesForAspect(aspect: Aspect): AbilityId[] {
  return approvedCombatAbilityIdsForAspect(aspect);
}

export function abilityIconUrl(card: AbilityCard): string {
  return (
    ICONS[card.icon] ??
    ICONS[card.icon.replace(/\.png$/i, "")] ??
    ICONS[card.id] ??
    ICONS[card.id.replace(/-/g, "_")] ??
    FALLBACK_ICON
  );
}
